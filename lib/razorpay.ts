import 'server-only';
import Razorpay from 'razorpay';
import { createHmac, timingSafeEqual } from 'node:crypto';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

let client: Razorpay | undefined;
export function razorpay(): Razorpay {
  client ??= new Razorpay({
    key_id: required('RAZORPAY_KEY_ID'),
    key_secret: required('RAZORPAY_KEY_SECRET'),
  });
  return client;
}

export function publicKeyId(): string {
  return required('NEXT_PUBLIC_RAZORPAY_KEY_ID');
}

function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Webhook: HMAC-SHA256 of the *raw* body with the webhook secret. */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = createHmac('sha256', required('RAZORPAY_WEBHOOK_SECRET')).update(rawBody).digest('hex');
  return safeEqualHex(expected, signature);
}

/**
 * Checkout callback: HMAC-SHA256("order_id|payment_id") with the key secret.
 * Used only to decide what the browser shows next — never to confirm a
 * booking. Confirmation comes from the webhook alone.
 */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean {
  const expected = createHmac('sha256', required('RAZORPAY_KEY_SECRET'))
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return safeEqualHex(expected, signature);
}

export async function createOrder(opts: { amountPaise: number; receipt: string; notes?: Record<string, string> }) {
  return razorpay().orders.create({
    amount: opts.amountPaise,
    currency: 'INR',
    receipt: opts.receipt.slice(0, 40),
    notes: opts.notes,
  });
}

/**
 * Every payment Razorpay has recorded against one of our orders.
 *
 * Used to reconcile a hold whose webhook has not arrived (or cannot arrive —
 * a webhook never reaches localhost). The answer comes from Razorpay over an
 * authenticated server-to-server call, so it carries the same weight as a
 * signed webhook and none of the browser's word.
 */
export async function fetchOrderPayments(orderId: string) {
  const res = await razorpay().orders.fetchPayments(orderId);
  return res.items ?? [];
}

/**
 * Take the money on a payment Razorpay has only *authorised*.
 *
 * Accounts without auto-capture leave successful payments sitting at
 * `authorized`: the customer has paid, we have not taken it, and the
 * `payment.captured` webhook never fires. Capturing is what turns that into
 * real money and makes the booking confirmable.
 */
export async function capturePayment(paymentId: string, amountPaise: number, currency = 'INR') {
  return razorpay().payments.capture(paymentId, amountPaise, currency);
}

export async function refundPayment(paymentId: string, amountPaise: number, receipt: string) {
  return razorpay().payments.refund(paymentId, {
    amount: amountPaise,
    speed: 'normal',
    receipt: receipt.slice(0, 40),
  });
}
