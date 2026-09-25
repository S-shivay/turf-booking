import { after, type NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { confirmPayment, markRefundStatus, releaseFailedHold } from '@/lib/bookings';
import { sendBookingConfirmed, sendBookingRescheduled, sendLateWebhookRefund } from '@/lib/email';
import { capturePayment, fetchOrderPayments, verifyWebhookSignature } from '@/lib/razorpay';
import { razorpayWebhookSchema } from '@/lib/validation';

/**
 * POST /api/webhooks/razorpay — the ONLY thing that confirms a booking.
 *
 * - Signature is verified against the raw body before anything is parsed.
 * - Idempotent: Razorpay retries on non-2xx/timeouts, so every event is
 *   safe to receive twice.
 * - Fast: DB work only; emails run in `after()`.
 * - Returns 200 for events we don't act on so Razorpay stops retrying.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get('x-razorpay-signature'))) {
    return NextResponse.json({ error: 'BAD_SIGNATURE' }, { status: 400 });
  }

  let event;
  try {
    event = razorpayWebhookSchema.parse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: 'BAD_PAYLOAD' }, { status: 400 });
  }

  try {
    switch (event.event) {
      case 'payment.captured': {
        const p = event.payload.payment?.entity;
        if (!p?.order_id) break;
        const result = await confirmPayment({
          orderId: p.order_id,
          paymentId: p.id,
          method: p.method,
          amount: p.amount,
          currency: p.currency,
        });
        if (result.outcome === 'confirmed') {
          // A move that needed paying for lands here. Say which times freed
          // up, not just which filled — the owner's board needs both halves.
          const moved = result.moved;
          after(() => (moved ? sendBookingRescheduled(moved) : sendBookingConfirmed(result.email)));
        } else if (result.outcome === 'refunded') after(() => sendLateWebhookRefund(result.email));
        else if (result.outcome === 'amount_mismatch') {
          // Money in, but not what we asked for. Never confirm; a human looks.
          console.error(`[webhook] AMOUNT MISMATCH order=${p.order_id} payment=${p.id}`);
        }
        break;
      }
      case 'payment.authorized': {
        // Account without auto-capture: the customer has paid but the money
        // is not ours yet, and `payment.captured` will never fire on its own.
        // Capturing it makes Razorpay send that event, which confirms.
        const p = event.payload.payment?.entity;
        if (!p?.order_id) break;
        try {
          await capturePayment(p.id, p.amount, p.currency);
        } catch (err) {
          console.error(`[webhook] capture failed order=${p.order_id} payment=${p.id}`, err);
        }
        break;
      }
      case 'payment.failed': {
        // Give the slots back — but only once nothing is still in flight. The
        // customer may be retrying inside checkout on the same order, so we
        // ask Razorpay for every attempt rather than trusting this one event.
        const p = event.payload.payment?.entity;
        if (!p?.order_id) break;
        const attempts = await fetchOrderPayments(p.order_id);
        if (await releaseFailedHold(p.order_id, attempts)) {
          console.info(`[webhook] payment failed, hold released order=${p.order_id}`);
        }
        break;
      }
      case 'refund.processed':
      case 'refund.failed': {
        const r = event.payload.refund?.entity;
        if (r) await markRefundStatus(r.payment_id, r.id, event.event === 'refund.processed');
        break;
      }
      default:
        break;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    // 500 → Razorpay retries, which is what we want for transient DB errors.
    console.error('[webhook] failed', err);
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }
}
