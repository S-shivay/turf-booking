import { after, type NextRequest } from 'next/server';
import { currentUser } from '@/lib/auth';
import { errorResponse, notFound, ok, unauthenticated } from '@/lib/api';
import { getBookingStatus, reconcileFromGateway } from '@/lib/bookings';
import { sendBookingConfirmed, sendBookingRescheduled, sendLateWebhookRefund } from '@/lib/email';

/**
 * POST /api/bookings/[id]/reconcile — the booking's own customer (or an owner).
 *
 * Safety net for a webhook that is late, was never delivered, or (in local
 * development) can never arrive at all. It asks Razorpay's API directly
 * whether the order was paid and, if it was, confirms through exactly the
 * same code path as the webhook — amount check, row-lock claim, and the
 * late-payment refund when the hold is already gone.
 *
 * The browser's claim that "it paid" is never trusted: the only thing it
 * sends is the booking id.
 */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await currentUser();
    if (!user) return unauthenticated();
    const { id } = await ctx.params;
    if (!/^[a-z0-9]{20,32}$/i.test(id)) return notFound();

    const viewer = { id: user.id, isOwner: user.role === 'OWNER' };
    const result = await reconcileFromGateway(id, viewer);
    if (!result) return notFound();

    if (result.outcome === 'confirmed') {
      // A move that needed paying for lands here. Say which times freed up,
      // not just which filled — the owner's board needs both halves.
      const moved = result.moved;
      after(() => (moved ? sendBookingRescheduled(moved) : sendBookingConfirmed(result.email)));
    } else if (result.outcome === 'refunded') after(() => sendLateWebhookRefund(result.email));
    else if (result.outcome === 'amount_mismatch') {
      console.error(`[reconcile] AMOUNT MISMATCH booking=${id}`);
    }

    // Always answer with the current state so the page can just render it.
    const dto = await getBookingStatus(id, viewer);
    if (!dto) return notFound();
    return ok(dto);
  } catch (err) {
    return errorResponse(err);
  }
}
