import 'server-only';
import { cache } from 'react';
import { Prisma, type RefundMethod, type Turf } from '@/generated/prisma/client';
import { prisma } from '@/lib/db';
import { calculateTotal } from '@/lib/pricing';
import { allAttemptsFailed, findUsablePayment, type GatewayAttempt } from '@/lib/payments';
import { capturePayment, createOrder, fetchOrderPayments, publicKeyId, refundPayment } from '@/lib/razorpay';
import {
  BOOKINGS_PER_MINUTE_PER_USER,
  HOLD_MINUTES,
  MAX_ACTIVE_HOLDS_PER_USER,
  OWNER_VISIBLE_DAYS,
  VISIBLE_DAYS,
  businessDateOf,
  dateKeyToDbDate,
  generateSlots,
  slotStartAt,
  slotEnd,
  slotsPerDay,
  visibleDateKeys,
  withinChangeWindow,
  CHANGE_WINDOW_HOURS,
  type DateKey,
} from '@/lib/slots';
import type {
  BookingStatusDTO,
  MyBookingDTO,
  OwnerBookingDTO,
  OwnerLedger,
  OwnerQuery,
  OwnerTotals,
  RescheduleBasis,
  SlotDTO,
} from '@/lib/types';
import type { BookingEmailData, CancellationEmailData, RescheduleEmailData } from '@/lib/email';

// ---------------------------------------------------------------------------
// Errors

export type BookingErrorCode =
  'VALIDATION' | 'SLOTS_TAKEN' | 'RATE_LIMITED' | 'TOO_MANY_HOLDS' | 'PAYMENT_UNAVAILABLE' | 'NOT_FOUND' | 'FORBIDDEN';

export class BookingError extends Error {
  constructor(
    public readonly code: BookingErrorCode,
    message: string,
    public readonly taken: Date[] = [],
  ) {
    super(message);
    this.name = 'BookingError';
  }
}

// ---------------------------------------------------------------------------
// Turf

/** The single active turf. `cache` dedupes within one request. */
export const getTurf = cache(async (): Promise<Turf | null> => {
  return prisma.turf.findFirst({ where: { isActive: true } });
});

// ---------------------------------------------------------------------------
// Slot states — public payload, state only, no PII

export async function getSlotStates(turf: Turf, dateKey: DateKey, now = new Date()): Promise<SlotDTO[]> {
  const starts = generateSlots(dateKey, turf.openHour, turf.closeHour);
  const rows = await prisma.slot.findMany({
    where: { turfId: turf.id, businessDate: dateKeyToDbDate(dateKey) },
    select: { slotStart: true, booking: { select: { status: true, expiresAt: true } } },
  });
  const byStart = new Map(rows.map((r) => [r.slotStart.getTime(), r.booking]));
  const nowMs = now.getTime();

  return starts.map((start, index) => {
    let state: SlotDTO['state'] = 'free';
    if (start.getTime() <= nowMs) state = 'past';
    else {
      const b = byStart.get(start.getTime());
      if (b?.status === 'CONFIRMED') state = 'booked';
      else if (b?.status === 'PENDING' && b.expiresAt && b.expiresAt.getTime() > nowMs) state = 'held';
      // PENDING + expired, or CANCELLED (rows are deleted on cancel anyway) → free
    }
    return { index, start: start.toISOString(), state };
  });
}

// ---------------------------------------------------------------------------
// Create (customer hold or owner free booking)

export interface CreateBookingInput {
  turf: Turf;
  userId: string;
  dateKey: DateKey;
  slotIndexes: number[];
  numPeople: number;
  idempotencyKey: string;
  mode: 'customer' | 'owner';
}

const bookingWithSlots = {
  include: { slots: { select: { slotStart: true }, orderBy: { slotStart: 'asc' as const } } },
} satisfies Prisma.BookingDefaultArgs;
export type BookingWithSlots = Prisma.BookingGetPayload<typeof bookingWithSlots>;

/**
 * Inserts the Booking + Slot rows in one transaction. The unique index on
 * (turfId, slotStart) is what actually prevents double booking — a losing
 * concurrent request gets P2002, which we turn into 409 SLOTS_TAKEN.
 */
export async function createBooking(
  input: CreateBookingInput,
): Promise<{ booking: BookingWithSlots; created: boolean }> {
  const { turf, userId, dateKey, slotIndexes, numPeople, idempotencyKey, mode } = input;
  const now = new Date();

  // Idempotency: a double-tapped Proceed returns the first attempt.
  const existing = await prisma.booking.findUnique({ where: { idempotencyKey }, ...bookingWithSlots });
  if (existing) {
    if (existing.userId !== userId) throw new BookingError('FORBIDDEN', 'idempotency key belongs to another user');
    return { booking: existing, created: false };
  }

  // Window + slot validation. The server derives every timestamp itself.
  const window = visibleDateKeys(now, mode === 'owner' ? OWNER_VISIBLE_DAYS : VISIBLE_DAYS);
  if (!window.includes(dateKey)) throw new BookingError('VALIDATION', 'that date is not open for booking');
  const perDay = slotsPerDay(turf.openHour, turf.closeHour);
  if (slotIndexes.some((i) => i >= perDay)) throw new BookingError('VALIDATION', 'invalid slot');
  const slotStarts = [...slotIndexes].sort((a, b) => a - b).map((i) => slotStartAt(dateKey, i, turf.openHour));
  if (slotStarts[0].getTime() <= now.getTime()) throw new BookingError('VALIDATION', 'that slot has already started');
  if (numPeople < turf.minPeople || numPeople > turf.maxPeople) {
    throw new BookingError('VALIDATION', `people must be between ${turf.minPeople} and ${turf.maxPeople}`);
  }

  // Abuse limits — DB-backed so they hold across instances.
  if (mode === 'customer') {
    const [recent, activeHolds] = await Promise.all([
      prisma.booking.count({ where: { userId, createdAt: { gt: new Date(now.getTime() - 60_000) } } }),
      prisma.booking.count({ where: { userId, status: 'PENDING', expiresAt: { gt: now } } }),
    ]);
    if (recent >= BOOKINGS_PER_MINUTE_PER_USER) {
      throw new BookingError('RATE_LIMITED', 'too many booking attempts — wait a minute and try again');
    }
    if (activeHolds >= MAX_ACTIVE_HOLDS_PER_USER) {
      throw new BookingError(
        'TOO_MANY_HOLDS',
        `you already have ${MAX_ACTIVE_HOLDS_PER_USER} bookings waiting for payment — complete or let them expire first`,
      );
    }
  }

  const totalAmount =
    mode === 'customer' ? calculateTotal(numPeople, slotStarts.length, turf.pricePerPersonPerSlot) : 0;
  const businessDate = dateKeyToDbDate(dateKey);

  try {
    const booking = await prisma.$transaction(async (tx) => {
      await releaseExpiredHoldsOn(tx, turf.id, slotStarts, now);

      return tx.booking.create({
        data: {
          idempotencyKey,
          turfId: turf.id,
          userId,
          numPeople,
          slotCount: slotStarts.length,
          totalAmount,
          status: mode === 'owner' ? 'CONFIRMED' : 'PENDING',
          bookedByOwner: mode === 'owner',
          startsAt: slotStarts[0],
          endsAt: slotEnd(slotStarts[slotStarts.length - 1]),
          expiresAt: mode === 'owner' ? null : new Date(now.getTime() + HOLD_MINUTES * 60_000),
          slots: {
            createMany: { data: slotStarts.map((slotStart) => ({ turfId: turf.id, slotStart, businessDate })) },
          },
        },
        ...bookingWithSlots,
      });
    });
    return { booking, created: true };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      // Someone else won. Tell the client exactly which slots, keep the rest.
      const taken = await prisma.slot.findMany({
        where: {
          turfId: turf.id,
          slotStart: { in: slotStarts },
          booking: { OR: [{ status: 'CONFIRMED' }, { status: 'PENDING', expiresAt: { gt: new Date() } }] },
        },
        select: { slotStart: true },
      });
      throw new BookingError(
        'SLOTS_TAKEN',
        'some of those slots were just booked by someone else',
        taken.map((t) => t.slotStart),
      );
    }
    throw err;
  }
}

/**
 * Inline expiry: free dead holds that overlap the requested slots so a
 * fresh booking can go through without waiting for the cron sweep.
 * `updateMany ... WHERE status = PENDING` takes the booking row lock and
 * re-evaluates its predicate after any concurrent webhook commits, so a
 * hold that was just confirmed is never touched.
 */
async function releaseExpiredHoldsOn(tx: Prisma.TransactionClient, turfId: string, slotStarts: Date[], now: Date) {
  const stale = await tx.booking.findMany({
    where: {
      status: 'PENDING',
      expiresAt: { lt: now },
      slots: { some: { turfId, slotStart: { in: slotStarts } } },
    },
    select: { id: true },
  });
  if (stale.length === 0) return;
  const ids = stale.map((s) => s.id);
  await tx.booking.updateMany({
    where: { id: { in: ids }, status: 'PENDING', expiresAt: { lt: now } },
    data: { status: 'CANCELLED', cancelReason: 'HOLD_EXPIRED', cancelledAt: now },
  });
  await tx.slot.deleteMany({ where: { bookingId: { in: ids }, booking: { status: 'CANCELLED' } } });
}

/** Cron sweep: same semantics as the inline release, across the whole table. */
export async function expireHolds(now = new Date()): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const stale = await tx.booking.findMany({
      where: { status: 'PENDING', expiresAt: { lt: now } },
      select: { id: true },
      take: 500,
    });
    if (stale.length === 0) return 0;
    const ids = stale.map((s) => s.id);
    const { count } = await tx.booking.updateMany({
      where: { id: { in: ids }, status: 'PENDING', expiresAt: { lt: now } },
      data: { status: 'CANCELLED', cancelReason: 'HOLD_EXPIRED', cancelledAt: now },
    });
    await tx.slot.deleteMany({ where: { bookingId: { in: ids }, booking: { status: 'CANCELLED' } } });
    return count;
  });
}

/** Give the slots back immediately (e.g. Razorpay order creation failed). */
export async function releaseHold(bookingId: string, reason: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.booking.updateMany({
      where: { id: bookingId, status: 'PENDING' },
      data: { status: 'CANCELLED', cancelReason: reason, cancelledAt: new Date() },
    });
    if (count > 0) await tx.slot.deleteMany({ where: { bookingId } });
  });
}

// ---------------------------------------------------------------------------
// Razorpay order

/**
 * What is actually charged for a booking. A normal booking pays its full
 * price; a reschedule pays only the difference, because the money already
 * taken for the booking it replaces is carried across as credit. A move can
 * never lower the price, so this is never negative.
 */
export function payableAmount(b: { totalAmount: number; creditApplied: number }): number {
  return Math.max(0, b.totalAmount - b.creditApplied);
}

/** How far back a reschedule chain is followed before we call it a loop. */
const MAX_CHAIN_HOPS = 25;

/**
 * The cash a booking has actually taken from the customer, and the payment a
 * refund has to be pulled from.
 *
 * `totalAmount` is a price, not a receipt. After an owner move it can be
 * higher than anything that was charged — the turf covers the difference —
 * and a moved booking has no payment id of its own, because the money came
 * in on the booking it replaced. So every refund decision reads this instead:
 * walk the chain back through `rescheduleOfId`, add up what was payable on
 * each link (zero for a link that was waived or given free), and keep the
 * first real payment found.
 *
 * Chains are one or two links in practice; the hop cap is there so a cycle
 * introduced by a future bug can never spin here.
 */
export async function collectedOn(bookingId: string): Promise<{ paise: number; paymentId: string | null }> {
  let id: string | null = bookingId;
  let paise = 0;
  let paymentId: string | null = null;

  for (let hop = 0; id && hop < MAX_CHAIN_HOPS; hop++) {
    const link: {
      totalAmount: number;
      creditApplied: number;
      status: string;
      cancelReason: string | null;
      bookedByOwner: boolean;
      razorpayPaymentId: string | null;
      rescheduleOfId: string | null;
    } | null = await prisma.booking.findUnique({
      where: { id },
      select: {
        totalAmount: true,
        creditApplied: true,
        status: true,
        cancelReason: true,
        bookedByOwner: true,
        razorpayPaymentId: true,
        rescheduleOfId: true,
      },
    });
    if (!link) break;

    // A hold that never became a booking took nothing, whatever it is worth.
    const abandoned = link.status === 'PENDING' || (link.cancelReason !== null && ABANDONED_REASONS.includes(link.cancelReason));
    if (!abandoned && !link.bookedByOwner) paise += payableAmount(link);
    if (!paymentId && link.razorpayPaymentId) paymentId = link.razorpayPaymentId;

    id = link.rescheduleOfId;
  }

  return { paise, paymentId };
}

export async function ensureOrder(booking: BookingWithSlots): Promise<{ orderId: string; keyId: string }> {
  if (booking.status !== 'PENDING') throw new BookingError('VALIDATION', 'this booking attempt is no longer pending');
  if (booking.razorpayOrderId) return { orderId: booking.razorpayOrderId, keyId: publicKeyId() };

  try {
    const order = await createOrder({
      amountPaise: payableAmount(booking),
      receipt: booking.id,
      notes: { bookingId: booking.id },
    });
    await prisma.booking.update({ where: { id: booking.id }, data: { razorpayOrderId: order.id } });
    return { orderId: order.id, keyId: publicKeyId() };
  } catch (err) {
    console.error('[razorpay] order creation failed', err);
    await releaseHold(booking.id, 'PAYMENT_UNAVAILABLE');
    throw new BookingError('PAYMENT_UNAVAILABLE', 'payment could not be started — please try again');
  }
}

// ---------------------------------------------------------------------------
// Webhook: payment captured

export type ConfirmOutcome =
  /**
   * `moved` is set when this confirmation completed a reschedule, so the
   * caller sends "booking moved" (which names both windows) rather than
   * "new booking" (which would leave the owner thinking the old slot is
   * still taken).
   */
  | { outcome: 'confirmed'; email: BookingEmailData; moved?: RescheduleEmailData }
  | { outcome: 'already_processed' }
  | { outcome: 'unknown_order' }
  | { outcome: 'amount_mismatch' }
  | { outcome: 'refunded'; email: BookingEmailData & { refundReference: string | null; refundOk: boolean } };

const emailInclude = {
  include: {
    slots: { select: { slotStart: true }, orderBy: { slotStart: 'asc' as const } },
    user: { select: { name: true, email: true, phone: true } },
    // openHour is here for the reschedule swap, which has to work out the
    // business date of a slot the new booking does not hold rows for yet.
    turf: { select: { name: true, openHour: true } },
  },
};

function toEmailData(b: Prisma.BookingGetPayload<typeof emailInclude>, slotStarts?: Date[]): BookingEmailData {
  return {
    id: b.id,
    turfName: b.turf.name,
    slotStarts: slotStarts ?? b.slots.map((s) => s.slotStart),
    startsAt: b.startsAt,
    numPeople: b.numPeople,
    totalAmount: b.totalAmount,
    customer: b.user,
  };
}

/** Reconstruct the requested slots for a booking whose Slot rows are gone. */
function slotsFromEnvelope(startsAt: Date, slotCount: number, endsAt: Date): Date[] {
  // Non-contiguous bookings lose their exact shape once rows are deleted;
  // the envelope is enough for a refund email.
  const out: Date[] = [];
  for (let t = startsAt.getTime(); t < endsAt.getTime() && out.length < slotCount; t += 30 * 60_000)
    out.push(new Date(t));
  return out;
}

export async function confirmPayment(p: {
  orderId: string;
  paymentId: string;
  method: string | undefined;
  amount: number;
  currency: string;
}): Promise<ConfirmOutcome> {
  const result = await prisma.$transaction(async (tx) => {
    const b = await tx.booking.findUnique({ where: { razorpayOrderId: p.orderId }, ...emailInclude });
    if (!b) return { kind: 'unknown_order' } as const;
    if (b.razorpayPaymentId === p.paymentId) return { kind: 'already_processed' } as const;
    // A reschedule is charged the difference only, so compare against what we
    // actually asked the gateway for — not the booking's headline price.
    const expected = payableAmount(b);
    if (expected !== p.amount || p.currency !== 'INR') {
      console.error(`[webhook] amount mismatch booking=${b.id} expected=${expected} got=${p.amount} ${p.currency}`);
      return { kind: 'amount_mismatch' } as const;
    }

    // Claim the booking. The WHERE re-checks after acquiring the row lock,
    // so an expiry/cancel that committed first makes count === 0.
    const { count } = await tx.booking.updateMany({
      where: { id: b.id, status: 'PENDING', razorpayPaymentId: null },
      data: { status: 'CONFIRMED', razorpayPaymentId: p.paymentId, paymentMethod: p.method ?? null, expiresAt: null },
    });

    if (count === 1) {
      // A reschedule only takes effect once its difference is paid for. Now
      // that it is, swap the times over and retire the booking it replaces.
      const previous = b.rescheduleOfId ? await applyRescheduleSwap(tx, b, b.turf.openHour, new Date()) : null;

      const slotCount = await tx.slot.count({ where: { bookingId: b.id } });
      if (slotCount === b.slotCount) return { kind: 'confirmed', booking: b, previous } as const;
      // Defensive: should be unreachable given the locking above.
      console.error(`[webhook] slot rows missing for confirmed booking ${b.id}`);
    }

    // Money arrived for slots we can no longer deliver (hold expired,
    // owner cancelled, or a duplicate payment). Record it and refund.
    const { count: marked } = await tx.booking.updateMany({
      // If we claimed it above (count === 1) the payment id is already ours.
      where: count === 1 ? { id: b.id } : { id: b.id, razorpayPaymentId: null },
      data: {
        status: 'CANCELLED',
        cancelReason: b.cancelReason ?? 'PAID_AFTER_EXPIRY',
        cancelledAt: b.cancelledAt ?? new Date(),
        razorpayPaymentId: p.paymentId,
        paymentMethod: p.method ?? null,
        refundMethod: 'GATEWAY',
        refundAmount: p.amount,
        refundStatus: 'PENDING',
        refundMarkedAt: new Date(),
      },
    });
    if (marked === 0) return { kind: 'already_processed' } as const;
    await tx.slot.deleteMany({ where: { bookingId: b.id } });
    return { kind: 'needs_refund', booking: b } as const;
  });

  switch (result.kind) {
    case 'unknown_order':
    case 'already_processed':
    case 'amount_mismatch':
      return { outcome: result.kind };
    case 'confirmed': {
      const b = result.booking;
      // After a swap the Slot rows loaded at the top of the transaction are
      // stale — `requestedSlots` is what the booking actually holds now.
      const email = toEmailData(b, result.previous ? b.requestedSlots : undefined);
      if (!result.previous) return { outcome: 'confirmed', email };
      return {
        outcome: 'confirmed',
        email,
        moved: { ...email, previous: result.previous, amountPaid: p.amount },
      };
    }
    case 'needs_refund': {
      const b = result.booking;
      let refundReference: string | null = null;
      let refundOk = false;
      try {
        const r = await refundPayment(p.paymentId, p.amount, `rf_${b.id}`);
        refundReference = r.id;
        refundOk = true;
        await prisma.booking.update({ where: { id: b.id }, data: { refundReference } });
      } catch (err) {
        console.error(`[webhook] auto-refund failed booking=${b.id}`, err);
        await prisma.booking.update({ where: { id: b.id }, data: { refundStatus: 'FAILED' } });
      }
      const slotStarts = b.slots.length
        ? b.slots.map((s) => s.slotStart)
        : slotsFromEnvelope(b.startsAt, b.slotCount, b.endsAt);
      return { outcome: 'refunded', email: { ...toEmailData(b, slotStarts), refundReference, refundOk } };
    }
  }
}

// ---------------------------------------------------------------------------
// Reconcile — for when the webhook hasn't arrived

export type ReconcileOutcome = ConfirmOutcome | { outcome: 'nothing_to_do' } | { outcome: 'payment_failed' };

/**
 * Give the slots back the moment the gateway says the payment failed.
 *
 * A failed payment is a finished story: nothing was charged and there is
 * nothing to wait for, so sitting on the slots for the rest of the 15-minute
 * hold only keeps them from the next customer. The hold survives exactly the
 * two cases where money may still arrive: nobody has tried to pay yet, or an
 * attempt is still in flight (`created` / `authorized` / `pending`).
 *
 * Race-safe: the claim is `WHERE status = 'PENDING' AND razorpayPaymentId IS
 * NULL`, re-checked under the row lock, so it can never undo a confirmation.
 * If money somehow lands afterwards, `confirmPayment` refunds it.
 */
export async function releaseFailedHold(orderId: string, attempts: readonly GatewayAttempt[]): Promise<boolean> {
  if (!allAttemptsFailed(attempts)) return false;

  return prisma.$transaction(async (tx) => {
    const b = await tx.booking.findUnique({ where: { razorpayOrderId: orderId }, select: { id: true } });
    if (!b) return false;
    const { count } = await tx.booking.updateMany({
      where: { id: b.id, status: 'PENDING', razorpayPaymentId: null },
      data: { status: 'CANCELLED', cancelReason: 'PAYMENT_FAILED', cancelledAt: new Date(), expiresAt: null },
    });
    if (count === 0) return false;
    await tx.slot.deleteMany({ where: { bookingId: b.id } });
    return true;
  });
}

/**
 * Asks Razorpay whether this booking's order has actually been paid, and if
 * so confirms it through the *same* `confirmPayment` path the webhook uses
 * (same amount check, same row-lock claim, same late-payment refund).
 *
 * This does not weaken the "only the webhook confirms" rule: the answer comes
 * from an authenticated server-to-server call to Razorpay, never from the
 * browser, which supplies nothing but the booking id. It exists because a
 * webhook can be late, can fail delivery, and can never reach localhost.
 *
 * Bounded by design: it only calls out for a booking created in the last 24 h
 * that has an order but no payment recorded against it yet. Once a payment is
 * tied to the booking there is nothing left to ask.
 *
 * Returns null when the booking doesn't exist or isn't the viewer's.
 */
export async function reconcileFromGateway(
  bookingId: string,
  viewer: { id: string; isOwner: boolean },
): Promise<ReconcileOutcome | null> {
  const b = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, userId: true, status: true, createdAt: true, razorpayOrderId: true, razorpayPaymentId: true },
  });
  if (!b) return null;
  if (b.userId !== viewer.id && !viewer.isOwner) return null; // 404, not 403

  // Worth asking whenever an order exists and we have not yet tied a payment
  // to it — including a hold that already expired into CANCELLED. Someone can
  // pay in the last seconds of a hold; if we never look, we keep money for a
  // slot we did not deliver. `confirmPayment` refunds that case for us.
  const unresolved = Boolean(b.razorpayOrderId) && b.razorpayPaymentId === null;
  const recent = Date.now() - b.createdAt.getTime() < 24 * 60 * 60_000;
  if (!unresolved || !recent || !b.razorpayOrderId) return { outcome: 'nothing_to_do' };

  const payments = await fetchOrderPayments(b.razorpayOrderId);
  let paid = findUsablePayment(payments);

  // The customer has paid but the account did not auto-capture: take the
  // money now, otherwise it is released back to them and no webhook fires.
  if (paid && paid.status === 'authorized') {
    try {
      await capturePayment(String(paid.id), Number(paid.amount), String(paid.currency));
    } catch (err) {
      console.error(`[reconcile] capture failed booking=${b.id} payment=${paid.id}`, err);
      paid = undefined;
    }
  }

  if (!paid) {
    // Every attempt failed → stop holding the slots and tell the page to say so.
    if (await releaseFailedHold(b.razorpayOrderId, payments)) {
      console.info(`[reconcile] payment failed, hold released booking=${b.id}`);
      return { outcome: 'payment_failed' };
    }
    console.warn(
      `[reconcile] no usable payment for booking=${b.id} order=${b.razorpayOrderId} ` +
        `statuses=[${payments.map((p) => p.status).join(',') || 'none'}]`,
    );
    return { outcome: 'nothing_to_do' };
  }

  return confirmPayment({
    orderId: b.razorpayOrderId,
    paymentId: String(paid.id),
    method: typeof paid.method === 'string' ? paid.method : undefined,
    amount: Number(paid.amount),
    currency: String(paid.currency),
  });
}

/** Webhook: refund.processed / refund.failed → keep the ledger honest. */
export async function markRefundStatus(paymentId: string, refundId: string, ok: boolean): Promise<void> {
  await prisma.booking.updateMany({
    where: { razorpayPaymentId: paymentId, refundMethod: 'GATEWAY' },
    data: { refundStatus: ok ? 'COMPLETED' : 'FAILED', refundReference: refundId },
  });
}

// ---------------------------------------------------------------------------
// Reschedule
//
// A reschedule is a second Booking that replaces the first once it is paid
// for. Doing it that way means the customer's original times stay theirs
// until the new ones genuinely are — a payment that never arrives costs them
// nothing. The times the two have in common are left with the original for
// the same reason, so a half-finished move can never strand a slot.
//
// A move may keep or raise the number of players and times, never lower it,
// so the difference is always something to collect and never something to
// refund. `requestedSlots` records what was actually asked for, because the
// new booking's own Slot rows deliberately cover only the non-overlapping part.

/** Cancel reasons the system writes. Customer-visible wording lives in content/. */
export const CANCEL_REASON = {
  customer: 'CUSTOMER_CANCELLED',
  rescheduled: 'RESCHEDULED',
  supersededHold: 'RESCHEDULE_REPLACED',
} as const;

/** Reasons that mean "an attempt that never became a booking" — hidden from the customer's list. */
const ABANDONED_REASONS = [
  'HOLD_EXPIRED',
  'PAYMENT_FAILED',
  'PAYMENT_UNAVAILABLE',
  CANCEL_REASON.supersededHold,
];

type RescheduleShadow = { id: string; turfId: string; userId: string; requestedSlots: Date[]; rescheduleOfId: string | null };

/**
 * Hand the original's times back and take every requested time under the
 * replacement. Delete-then-insert inside one transaction, so the overlap is
 * never visible as free to anyone else and the unique index still guards the
 * times that are genuinely new.
 */
async function applyRescheduleSwap(
  tx: Prisma.TransactionClient,
  next: RescheduleShadow,
  openHour: number,
  now: Date,
  /** Who moved it. The customer themselves, unless the turf did it for them. */
  actorId: string = next.userId,
): Promise<RescheduleEmailData['previous'] | null> {
  const originalId = next.rescheduleOfId;
  if (!originalId) return null;

  // Snapshot the original before its rows go: the owner's email has to name
  // the times that are being freed, and in a moment they will not exist.
  const before = await tx.booking.findUnique({
    where: { id: originalId },
    select: {
      id: true,
      startsAt: true,
      numPeople: true,
      slots: { select: { slotStart: true }, orderBy: { slotStart: 'asc' } },
    },
  });

  await tx.slot.deleteMany({ where: { bookingId: originalId } });

  const held = await tx.slot.findMany({ where: { bookingId: next.id }, select: { slotStart: true } });
  const have = new Set(held.map((s) => s.slotStart.getTime()));
  const missing = next.requestedSlots.filter((d) => !have.has(d.getTime()));
  if (missing.length) {
    await tx.slot.createMany({
      data: missing.map((slotStart) => ({
        bookingId: next.id,
        turfId: next.turfId,
        slotStart,
        businessDate: businessDateOf(slotStart, openHour),
      })),
    });
  }

  await tx.booking.updateMany({
    where: { id: originalId, status: { not: 'CANCELLED' } },
    data: {
      status: 'CANCELLED',
      cancelReason: CANCEL_REASON.rescheduled,
      cancelledAt: now,
      cancelledById: actorId,
      expiresAt: null,
      // Nothing is refunded: the money moved to the replacement booking.
      refundMethod: 'NONE',
      refundAmount: 0,
      refundStatus: null,
    },
  });

  return before
    ? {
        id: before.id,
        startsAt: before.startsAt,
        numPeople: before.numPeople,
        slotStarts: before.slots.map((s) => s.slotStart),
      }
    : null;
}

export interface RescheduleInput {
  turf: Turf;
  /**
   * Who is moving it. A customer may only move their own booking and is held
   * to the notice window, the 7-day window and the no-shrink floors; an owner
   * may move anybody's, anywhere in the 30-day window, to any size, and never
   * collects or returns a rupee for it.
   */
  actor: { id: string; isOwner: boolean };
  originalId: string;
  dateKey: DateKey;
  slotIndexes: number[];
  numPeople: number;
  idempotencyKey: string;
}

export interface RescheduleResult {
  booking: BookingWithSlots;
  /** paise still to collect; 0 means the move is already done */
  amountDue: number;
  /**
   * Set only when the swap has already happened (nothing left to pay), so the
   * caller can tell the owners. A move that still needs paying for is
   * announced later, by whichever path confirms the payment.
   */
  moved: RescheduleEmailData | null;
}

/**
 * Start a move. Returns a CONFIRMED booking with `amountDue === 0` when the
 * new times cost the same, or a PENDING hold to pay the difference on.
 */
export async function createReschedule(input: RescheduleInput): Promise<RescheduleResult> {
  const { turf, actor, originalId, dateKey, slotIndexes, numPeople, idempotencyKey } = input;
  const now = new Date();

  const replay = await prisma.booking.findUnique({ where: { idempotencyKey }, ...bookingWithSlots });
  if (replay) {
    // The key must belong to the same piece of work: the customer's own
    // booking, or — for an owner, who is not the customer — this very move.
    const mine = actor.isOwner ? replay.rescheduleOfId === originalId : replay.userId === actor.id;
    if (!mine) throw new BookingError('FORBIDDEN', 'idempotency key belongs to another user');
    // A replay must not re-announce a move that has already been emailed.
    return { booking: replay, amountDue: payableAmount(replay), moved: null };
  }

  const original = await prisma.booking.findUnique({
    where: { id: originalId },
    select: {
      id: true, userId: true, status: true, startsAt: true, numPeople: true, slotCount: true,
      totalAmount: true, bookedByOwner: true, paymentMethod: true,
      slots: { select: { slotStart: true } },
    },
  });
  if (!original || (!actor.isOwner && original.userId !== actor.id)) {
    throw new BookingError('NOT_FOUND', 'booking not found');
  }
  if (original.status !== 'CONFIRMED') throw new BookingError('VALIDATION', 'only a confirmed booking can be moved');
  // The notice window is a promise made to customers about self-service, not
  // a rule about the turf: the owner can move tonight's game if it rains.
  if (!actor.isOwner && !withinChangeWindow(original.startsAt, now)) {
    throw new BookingError('VALIDATION', 'this booking is too close to its start time to move online');
  }

  // Same validation the booking path does — the server derives every time.
  const window = visibleDateKeys(now, actor.isOwner ? OWNER_VISIBLE_DAYS : VISIBLE_DAYS);
  if (!window.includes(dateKey)) throw new BookingError('VALIDATION', 'that date is not open for booking');
  const perDay = slotsPerDay(turf.openHour, turf.closeHour);
  if (slotIndexes.some((i) => i >= perDay)) throw new BookingError('VALIDATION', 'invalid slot');
  const wanted = [...new Set(slotIndexes)].sort((a, b) => a - b).map((i) => slotStartAt(dateKey, i, turf.openHour));
  if (!wanted.length) throw new BookingError('VALIDATION', 'pick at least one time');
  if (wanted[0].getTime() <= now.getTime()) throw new BookingError('VALIDATION', 'that slot has already started');
  if (numPeople < turf.minPeople || numPeople > turf.maxPeople) {
    throw new BookingError('VALIDATION', `people must be between ${turf.minPeople} and ${turf.maxPeople}`);
  }

  // A customer's move may not shrink: the difference is then always something
  // to collect and never something to refund. Enforced here as well as in the
  // picker, because the picker is only a convenience and this is the rule.
  // The turf is under no such limit — it can shorten a booking as a favour.
  if (!actor.isOwner && (numPeople < original.numPeople || wanted.length < original.slotCount)) {
    throw new BookingError(
      'VALIDATION',
      `a move needs at least ${original.numPeople} players and ${original.slotCount} times`,
    );
  }

  const ownTimes = new Set(original.slots.map((s) => s.slotStart.getTime()));
  const unchanged = wanted.length === original.slotCount && wanted.every((d) => ownTimes.has(d.getTime()));
  if (unchanged && numPeople === original.numPeople) {
    throw new BookingError('VALIDATION', 'those are already your times');
  }

  const price = calculateTotal(numPeople, wanted.length, turf.pricePerPersonPerSlot);
  let newTotal: number;
  let credit: number;

  if (actor.isOwner) {
    // An owner move never bills and never refunds, but the booking does take
    // the new price (owner, 22 Sep 2026) — so the customer's card reads what
    // the booking is now worth. Two guards on that: a booking the turf gave
    // away stays free however busy the window it lands in, and a move into
    // cheaper times never writes the figure below the cash actually paid,
    // which would understate the customer's own receipt.
    const cash = original.bookedByOwner ? 0 : (await collectedOn(original.id)).paise;
    newTotal = original.bookedByOwner ? original.totalAmount : Math.max(price, cash);
    credit = newTotal;
  } else {
    newTotal = price;
    credit = original.bookedByOwner ? price : original.totalAmount;
  }
  const amountDue = Math.max(0, newTotal - credit);

  // Only the genuinely new times need holding; the rest are already theirs.
  const toHold = wanted.filter((d) => !ownTimes.has(d.getTime()));
  const businessDate = dateKeyToDbDate(dateKey);

  try {
    const booking = await prisma.$transaction(async (tx) => {
      await releaseExpiredHoldsOn(tx, turf.id, toHold, now);

      // Re-read under the lock: the original may have been cancelled since.
      const still = await tx.booking.findUnique({ where: { id: originalId }, select: { status: true } });
      if (still?.status !== 'CONFIRMED') throw new BookingError('VALIDATION', 'that booking is no longer active');

      // One live attempt at a time. An earlier unpaid try gives its times back.
      const stale = await tx.booking.findMany({
        where: { rescheduleOfId: originalId, status: 'PENDING' },
        select: { id: true },
      });
      if (stale.length) {
        const ids = stale.map((s) => s.id);
        await tx.booking.updateMany({
          where: { id: { in: ids }, status: 'PENDING' },
          data: { status: 'CANCELLED', cancelReason: CANCEL_REASON.supersededHold, cancelledAt: now, expiresAt: null },
        });
        await tx.slot.deleteMany({ where: { bookingId: { in: ids } } });
      }

      const created = await tx.booking.create({
        data: {
          idempotencyKey,
          turfId: turf.id,
          // The replacement stays the *customer's* booking even when the turf
          // moved it, so it keeps showing in their My bookings and any later
          // refund still points at them.
          userId: original.userId,
          numPeople,
          slotCount: wanted.length,
          totalAmount: newTotal,
          creditApplied: credit,
          requestedSlots: wanted,
          rescheduleOfId: originalId,
          // Nothing left to pay means the move is done the moment it is made.
          status: amountDue === 0 ? 'CONFIRMED' : 'PENDING',
          bookedByOwner: original.bookedByOwner,
          paymentMethod: original.paymentMethod,
          startsAt: wanted[0],
          endsAt: slotEnd(wanted[wanted.length - 1]),
          expiresAt: amountDue === 0 ? null : new Date(now.getTime() + HOLD_MINUTES * 60_000),
          slots: {
            createMany: { data: toHold.map((slotStart) => ({ turfId: turf.id, slotStart, businessDate })) },
          },
        },
        ...bookingWithSlots,
      });

      const previous =
        amountDue === 0 ? await applyRescheduleSwap(tx, created, turf.openHour, now, actor.id) : null;
      return { created, previous };
    });

    let moved: RescheduleEmailData | null = null;
    if (booking.previous) {
      const customer = await prisma.user.findUniqueOrThrow({
        where: { id: original.userId },
        select: { name: true, email: true, phone: true },
      });
      const email: BookingEmailData = {
        id: booking.created.id,
        turfName: turf.name,
        slotStarts: wanted,
        startsAt: wanted[0],
        numPeople,
        totalAmount: newTotal,
        customer,
      };
      // A move the turf made is news to the customer — they must hear it from
      // us rather than at the gate. One they made themselves, they just did.
      moved = { ...email, previous: booking.previous, amountPaid: 0, byOwner: actor.isOwner };
    }

    return { booking: booking.created, amountDue, moved };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const taken = await prisma.slot.findMany({
        where: {
          turfId: turf.id,
          slotStart: { in: toHold },
          booking: { OR: [{ status: 'CONFIRMED' }, { status: 'PENDING', expiresAt: { gt: new Date() } }] },
        },
        select: { slotStart: true },
      });
      throw new BookingError(
        'SLOTS_TAKEN',
        'some of those slots were just booked by someone else',
        taken.map((t) => t.slotStart),
      );
    }
    throw err;
  }
}

/** What a move may not go below, for the picker. Null when it can't be moved. */
export async function getRescheduleBasis(
  bookingId: string,
  userId: string,
  now = new Date(),
): Promise<RescheduleBasis | null> {
  const b = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true, userId: true, status: true, startsAt: true, numPeople: true, slotCount: true,
      totalAmount: true, bookedByOwner: true,
      slots: { select: { slotStart: true }, orderBy: { slotStart: 'asc' } },
    },
  });
  if (!b || b.userId !== userId) return null;
  if (b.status !== 'CONFIRMED' || !withinChangeWindow(b.startsAt, now)) return null;
  return {
    bookingId: b.id,
    numPeople: b.numPeople,
    slotCount: b.slotCount,
    creditApplied: b.bookedByOwner ? 0 : b.totalAmount,
    startsAt: b.startsAt.toISOString(),
    slotStarts: b.slots.map((s) => s.slotStart.toISOString()),
  };
}

/**
 * The same starting point for the owner's picker — but with no floors and no
 * notice window, because none of those rules are about the turf. The booking
 * is still where the picker opens; it just is not a limit any more.
 */
export async function getOwnerRescheduleBasis(
  turf: Turf,
  bookingId: string,
  now = new Date(),
): Promise<(RescheduleBasis & { customerName: string | null }) | null> {
  const b = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true, turfId: true, status: true, startsAt: true, numPeople: true,
      user: { select: { name: true, email: true } },
      slots: { select: { slotStart: true }, orderBy: { slotStart: 'asc' } },
    },
  });
  if (!b || b.turfId !== turf.id) return null;
  // A game that has started can no longer be moved anywhere useful.
  if (b.status !== 'CONFIRMED' || b.startsAt.getTime() <= now.getTime()) return null;
  return {
    bookingId: b.id,
    numPeople: Math.max(turf.minPeople, Math.min(turf.maxPeople, b.numPeople)),
    slotCount: 1,
    creditApplied: 0,
    startsAt: b.startsAt.toISOString(),
    slotStarts: b.slots.map((s) => s.slotStart.toISOString()),
    customerName: b.user.name?.trim() || b.user.email.split('@')[0],
  };
}

// ---------------------------------------------------------------------------
// The customer's own bookings

/**
 * Every booking that became real, **most recently booked first** (owner,
 * 21 Sep 2026). Ordering by kick-off time buried the booking someone had
 * just made behind older ones that happened to be later in the week; what
 * you want to see on arrival is what you just did. Abandoned payment
 * attempts are left out — they are noise, not history.
 */
export async function listMyBookings(userId: string, now = new Date()): Promise<MyBookingDTO[]> {
  const rows = await prisma.booking.findMany({
    where: {
      userId,
      NOT: { status: 'CANCELLED', cancelReason: { in: ABANDONED_REASONS } },
      // A hold still being paid for is real; one that ran out is not.
      OR: [{ status: { not: 'PENDING' } }, { expiresAt: { gt: now } }],
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true, status: true, startsAt: true, endsAt: true, numPeople: true, slotCount: true,
      totalAmount: true, creditApplied: true, createdAt: true, expiresAt: true, bookedByOwner: true,
      paymentMethod: true, razorpayPaymentId: true, razorpayOrderId: true,
      cancelReason: true, cancelledAt: true,
      refundMethod: true, refundAmount: true, refundStatus: true, refundReference: true,
      rescheduleOfId: true,
      // A move carries the original payment forward, so show that reference —
      // and the cash that came in on it, which after a move by the turf can be
      // less than this booking is now worth.
      rescheduleOf: { select: { ...chainLink, rescheduleOf: { select: chainLink } } },
      replacedBy: { where: { status: 'CONFIRMED' }, select: { id: true }, take: 1 },
      slots: { select: { slotStart: true }, orderBy: { slotStart: 'asc' } },
    },
  });

  return rows.map((b) => ({
    id: b.id,
    status: b.status,
    startsAt: b.startsAt.toISOString(),
    endsAt: b.endsAt.toISOString(),
    slotStarts: b.slots.map((s) => s.slotStart.toISOString()),
    numPeople: b.numPeople,
    slotCount: b.slotCount,
    totalAmount: b.totalAmount,
    collected:
      cashOnLink(b) +
      (b.rescheduleOf ? cashOnLink(b.rescheduleOf) : 0) +
      (b.rescheduleOf?.rescheduleOf ? cashOnLink(b.rescheduleOf.rescheduleOf) : 0),
    createdAt: b.createdAt.toISOString(),
    expiresAt: b.expiresAt?.toISOString() ?? null,
    bookedByOwner: b.bookedByOwner,
    paymentMethod: b.paymentMethod,
    transactionId: b.razorpayPaymentId ?? b.rescheduleOf?.razorpayPaymentId ?? null,
    orderId: b.razorpayOrderId ?? b.rescheduleOf?.razorpayOrderId ?? null,
    cancelReason: b.status === 'CANCELLED' ? b.cancelReason : null,
    cancelledAt: b.cancelledAt?.toISOString() ?? null,
    refundMethod: b.refundMethod,
    refundAmount: b.refundAmount,
    refundStatus: b.refundStatus,
    refundReference: b.refundReference,
    changeable: b.status === 'CONFIRMED' && withinChangeWindow(b.startsAt, now),
    rescheduledFromId: b.rescheduleOfId,
    rescheduledToId: b.replacedBy[0]?.id ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Owner desk — the ledger

/** The end of a business day: the instant its last slot finishes. */
function endOfBusinessDay(key: DateKey, openHour: number, closeHour: number): Date {
  return slotEnd(slotStartAt(key, slotsPerDay(openHour, closeHour) - 1, openHour));
}

/**
 * The ledger filter as Prisma sees it. Built once and shared by the page, the
 * count, the totals and the download, so those four can never disagree about
 * what "22 Sep to 30 Sep" means.
 */
function ownerWhere(turf: Turf, q: OwnerQuery, now: Date): Prisma.BookingWhereInput {
  const and: Prisma.BookingWhereInput[] = [
    // Attempts that never became bookings are noise, not history.
    { NOT: { status: 'CANCELLED', cancelReason: { in: ABANDONED_REASONS } } },
    { OR: [{ status: { not: 'PENDING' } }, { expiresAt: { gt: now } }] },
  ];

  // Dates are business days, so a 12:30 AM slot counts towards the evening
  // it belongs to rather than the calendar day it technically starts on.
  if (q.from) and.push({ startsAt: { gte: slotStartAt(q.from, 0, turf.openHour) } });
  if (q.to) and.push({ startsAt: { lt: endOfBusinessDay(q.to, turf.openHour, turf.closeHour) } });

  switch (q.status) {
    case 'confirmed':
      and.push({ status: 'CONFIRMED' });
      break;
    case 'pending':
      and.push({ status: 'PENDING' });
      break;
    case 'cancelled':
      and.push({ status: 'CANCELLED' });
      break;
    case 'played':
      and.push({ status: 'CONFIRMED', startsAt: { lt: now } });
      break;
    case 'upcoming':
      and.push({ status: { not: 'CANCELLED' }, startsAt: { gte: now } });
      break;
    default:
      break;
  }

  const search = q.q;
  if (search) {
    const digits = search.replace(/\D/g, '');
    const or: Prisma.BookingWhereInput[] = [
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
      // The reference on every card and email is the id's last six characters.
      { id: { endsWith: search.toLowerCase() } },
      { razorpayPaymentId: { contains: search } },
    ];
    if (digits.length >= 4) or.push({ user: { phone: { contains: digits } } });
    and.push({ OR: or });
  }

  return { turfId: turf.id, AND: and };
}

/** One link of the reschedule chain, as the list reads it. */
const chainLink = {
  totalAmount: true,
  creditApplied: true,
  bookedByOwner: true,
  status: true,
  cancelReason: true,
  razorpayPaymentId: true,
  razorpayOrderId: true,
} as const;

const ownerRow = {
  select: {
    id: true, status: true, startsAt: true, endsAt: true, numPeople: true, slotCount: true,
    totalAmount: true, creditApplied: true, createdAt: true, expiresAt: true, bookedByOwner: true,
    paymentMethod: true, razorpayPaymentId: true, razorpayOrderId: true,
    cancelReason: true, cancelledAt: true,
    refundMethod: true, refundAmount: true, refundStatus: true, refundReference: true,
    rescheduleOfId: true,
    user: { select: { name: true, email: true, phone: true } },
    // Two links back, in the same round trip. A booking moved more than twice
    // would under-report its cash here; the ledger is a view, and every path
    // that actually moves money calls `collectedOn`, which follows the whole
    // chain however long it is.
    rescheduleOf: { select: { ...chainLink, rescheduleOf: { select: chainLink } } },
    replacedBy: { where: { status: 'CONFIRMED' as const }, select: { id: true }, take: 1 },
    slots: { select: { slotStart: true }, orderBy: { slotStart: 'asc' as const } },
  },
} satisfies Prisma.BookingDefaultArgs;

type OwnerRow = Prisma.BookingGetPayload<typeof ownerRow>;

/** What a block the turf made would have sold for at list price. */
function blockValue(b: { numPeople: number; slotCount: number }, turf: Turf): number {
  return calculateTotal(b.numPeople, b.slotCount, turf.pricePerPersonPerSlot);
}

/** What one link of a chain actually contributed in cash. */
function cashOnLink(link: {
  totalAmount: number;
  creditApplied: number;
  bookedByOwner: boolean;
  status: string;
  cancelReason: string | null;
}): number {
  const abandoned =
    link.status === 'PENDING' || (link.cancelReason !== null && ABANDONED_REASONS.includes(link.cancelReason));
  return abandoned || link.bookedByOwner ? 0 : payableAmount(link);
}

function toOwnerDTO(b: OwnerRow, turf: Turf, now: Date): OwnerBookingDTO {
  const parent = b.rescheduleOf;
  const grand = parent?.rescheduleOf ?? null;
  const collected =
    cashOnLink(b) + (parent ? cashOnLink(parent) : 0) + (grand ? cashOnLink(grand) : 0);
  const paymentId = b.razorpayPaymentId ?? parent?.razorpayPaymentId ?? grand?.razorpayPaymentId ?? null;
  const ahead = b.startsAt.getTime() > now.getTime();

  return {
    id: b.id,
    status: b.status,
    startsAt: b.startsAt.toISOString(),
    endsAt: b.endsAt.toISOString(),
    slotStarts: b.slots.map((s) => s.slotStart.toISOString()),
    numPeople: b.numPeople,
    slotCount: b.slotCount,
    totalAmount: b.totalAmount,
    // A block the turf made is priced at nothing, but it is still holding
    // times that could have been sold — so the desk shows what it is holding.
    value: b.bookedByOwner ? blockValue(b, turf) : b.totalAmount,
    collected,
    createdAt: b.createdAt.toISOString(),
    expiresAt: b.expiresAt?.toISOString() ?? null,
    bookedByOwner: b.bookedByOwner,
    customer: { name: b.user.name, email: b.user.email, phone: b.user.phone },
    paymentMethod: b.paymentMethod,
    transactionId: paymentId,
    orderId: b.razorpayOrderId ?? parent?.razorpayOrderId ?? grand?.razorpayOrderId ?? null,
    cancelReason: b.status === 'CANCELLED' ? b.cancelReason : null,
    cancelledAt: b.cancelledAt?.toISOString() ?? null,
    refundMethod: b.refundMethod,
    refundAmount: b.refundAmount,
    refundStatus: b.refundStatus,
    refundReference: b.refundReference,
    rescheduledFromId: b.rescheduleOfId,
    rescheduledToId: b.replacedBy[0]?.id ?? null,
    cancellable: b.status !== 'CANCELLED' && ahead,
    // A hold that has not been paid for has nothing to carry across, and
    // `createReschedule` refuses it — so the button never appears.
    movable: b.status === 'CONFIRMED' && ahead,
    refundableToSource: Boolean(paymentId) && collected > 0,
  };
}

/**
 * One page of the turf's whole history, with the money for the **entire**
 * filtered set beside it — totals that change as you page would be worse than
 * no totals at all.
 *
 * Four queries, run together: the rows, how many there are, the counts, and
 * the cash. All four filter and sort on `startsAt` within the turf, which is
 * exactly `@@index([turfId, startsAt])`, so paging never sorts in memory.
 */
export async function listOwnerBookings(turf: Turf, query: OwnerQuery, now = new Date()): Promise<OwnerLedger> {
  const where = ownerWhere(turf, query, now);
  const totals = await totalsFor(where, turf);
  const entries = totals.entries;

  const pages = Math.max(1, Math.ceil(entries / query.pageSize));
  // A page past the end shows the last page. A filter is a view: it should
  // never hand back an error because someone edited the URL or the data moved.
  const page = Math.min(Math.max(1, query.page), pages);

  const rows = entries
    ? await prisma.booking.findMany({
        where,
        orderBy: LEDGER_ORDER,
        skip: (page - 1) * query.pageSize,
        take: query.pageSize,
        ...ownerRow,
      })
    : [];

  return { rows: rows.map((b) => toOwnerDTO(b, turf, now)), totals, page, pages };
}

/**
 * Last booked, first shown (owner, 22 Sep 2026) — whatever day the game is
 * on. What an owner wants on arrival is what just came in, not what happens
 * to be next in the week. `id` breaks ties so paging can never repeat or skip
 * a row when two bookings land in the same millisecond.
 */
const LEDGER_ORDER: Prisma.BookingOrderByWithRelationInput[] = [{ createdAt: 'desc' }, { id: 'desc' }];

/**
 * Counts and money for a filter — three aggregates, no rows.
 *
 * Income is not a sum of prices. Money enters the system exactly once per
 * booking, as what was payable on it (`totalAmount − creditApplied`), which
 * is zero for a link the turf waived and zero for a free turf booking. So a
 * ₹200 booking moved by the owner into a ₹400 window contributes 200 + 0 —
 * the cash — and a customer move that collected a ₹200 difference
 * contributes 200 + 200. No chain walking, one indexed pass.
 */
async function totalsFor(where: Prisma.BookingWhereInput, turf: Turf): Promise<OwnerTotals> {
  const [counts, money, refunds, blocks] = await Promise.all([
    prisma.booking.aggregate({ where, _count: { _all: true }, _sum: { numPeople: true } }),
    prisma.booking.aggregate({
      // A hold has taken nothing yet; a free turf booking never will.
      where: { AND: [where, { status: { not: 'PENDING' } }, { bookedByOwner: false }] },
      _sum: { totalAmount: true, creditApplied: true },
    }),
    prisma.booking.aggregate({
      // A refund that failed never left the account, so it is not cash out.
      where: { AND: [where, { refundStatus: { in: ['PENDING', 'COMPLETED'] } }] },
      _sum: { refundAmount: true },
    }),
    // What the turf's own blocks are holding. Their price is a product of two
    // columns, which no aggregate can multiply, so they are summed in memory
    // — there are a handful of them in a filter, not thousands.
    prisma.booking.findMany({
      where: { AND: [where, { bookedByOwner: true }, { status: { not: 'CANCELLED' } }] },
      select: { numPeople: true, slotCount: true },
      take: 5_000,
    }),
  ]);

  const collected = (money._sum.totalAmount ?? 0) - (money._sum.creditApplied ?? 0);
  const refunded = refunds._sum.refundAmount ?? 0;
  return {
    entries: counts._count._all,
    players: counts._sum.numPeople ?? 0,
    collected,
    refunded,
    income: collected - refunded,
    blockedCount: blocks.length,
    blocked: blocks.reduce((sum, b) => sum + blockValue(b, turf), 0),
  };
}

/** Never let one download hold a connection open over the whole history. */
export const OWNER_EXPORT_LIMIT = 20_000;
const EXPORT_BATCH = 500;

/**
 * The same filter, unpaged, for the download — yielded in batches so a
 * lifetime of bookings is never all in memory at once. Keyset paging on
 * `(startsAt, id)` rather than a growing `skip`, which gets slower every page
 * and can skip or repeat a row if one is written mid-scan.
 */
export async function* streamOwnerBookings(
  turf: Turf,
  query: OwnerQuery,
  now = new Date(),
): AsyncGenerator<OwnerBookingDTO> {
  const where = ownerWhere(turf, query, now);
  let cursor: string | null = null;
  let sent = 0;

  for (;;) {
    const batch: OwnerRow[] = await prisma.booking.findMany({
      where,
      orderBy: LEDGER_ORDER,
      take: Math.min(EXPORT_BATCH, OWNER_EXPORT_LIMIT - sent),
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      ...ownerRow,
    });
    if (!batch.length) return;

    for (const row of batch) yield toOwnerDTO(row, turf, now);
    sent += batch.length;
    if (batch.length < EXPORT_BATCH || sent >= OWNER_EXPORT_LIMIT) return;
    cursor = batch[batch.length - 1].id;
  }
}

/** The totals for a filter on their own, for the download's last row. */
export async function ownerTotals(turf: Turf, query: OwnerQuery, now = new Date()): Promise<OwnerTotals> {
  return totalsFor(ownerWhere(turf, query, now), turf);
}

// ---------------------------------------------------------------------------
// Cancel + refund

export interface CancelInput {
  bookingId: string;
  /** Whoever pressed the button — an owner, or the customer themselves. */
  actorId: string;
  reason: string;
  refundMethod: RefundMethod;
  refundAmount?: number;
  refundReference?: string;
  refundNote?: string;
}

export async function cancelBooking(input: CancelInput): Promise<CancellationEmailData> {
  const now = new Date();
  // What was actually taken, and the payment to pull it back from. Read
  // before the transaction: `totalAmount` is a price and may be higher than
  // anything we ever charged, and a moved booking's money came in on the
  // booking it replaced, so neither figure can be read off this row alone.
  const cash = await collectedOn(input.bookingId);

  const { booking, slotStarts } = await prisma.$transaction(async (tx) => {
    const b = await tx.booking.findUnique({ where: { id: input.bookingId }, ...emailInclude });
    if (!b) throw new BookingError('NOT_FOUND', 'booking not found');
    if (b.status === 'CANCELLED') throw new BookingError('VALIDATION', 'this booking is already cancelled');
    if (b.startsAt.getTime() < now.getTime()) throw new BookingError('VALIDATION', 'this booking has already started');

    const paid = b.status === 'CONFIRMED' && cash.paise > 0;
    let refundMethod = input.refundMethod;
    let refundAmount = input.refundAmount ?? (paid ? cash.paise : 0);
    if (!paid) {
      refundMethod = 'NONE';
      refundAmount = 0;
    }
    if (refundMethod === 'GATEWAY' && !cash.paymentId) {
      throw new BookingError('VALIDATION', 'no gateway payment on record — use a manual refund');
    }
    if (refundAmount > cash.paise) throw new BookingError('VALIDATION', 'refund cannot exceed the amount paid');
    if (refundMethod === 'NONE') refundAmount = 0;

    const { count } = await tx.booking.updateMany({
      where: { id: b.id, status: { not: 'CANCELLED' } },
      data: {
        status: 'CANCELLED',
        cancelledById: input.actorId,
        cancelledAt: now,
        cancelReason: input.reason,
        expiresAt: null,
        refundMethod,
        refundAmount,
        refundReference: refundMethod === 'MANUAL' ? (input.refundReference ?? null) : null,
        refundNote: input.refundNote ?? null,
        refundStatus: refundMethod === 'NONE' ? null : refundMethod === 'GATEWAY' ? 'PENDING' : 'COMPLETED',
        refundMarkedBy: input.actorId,
        refundMarkedAt: now,
      },
    });
    if (count === 0) throw new BookingError('VALIDATION', 'booking changed underneath you — reload');
    await tx.slot.deleteMany({ where: { bookingId: b.id } });

    // Kill any move that is still being paid for. Left alone it could be paid
    // minutes from now, confirm, and hold slots for a booking that no longer
    // exists — and the customer would be charged for it.
    const attempts = await tx.booking.findMany({
      where: { rescheduleOfId: b.id, status: 'PENDING' },
      select: { id: true },
    });
    if (attempts.length) {
      const ids = attempts.map((a) => a.id);
      await tx.booking.updateMany({
        where: { id: { in: ids }, status: 'PENDING' },
        data: { status: 'CANCELLED', cancelReason: CANCEL_REASON.supersededHold, cancelledAt: now, expiresAt: null },
      });
      await tx.slot.deleteMany({ where: { bookingId: { in: ids } } });
    }

    return {
      booking: { ...b, refundMethod, refundAmount },
      slotStarts: b.slots.map((s) => s.slotStart),
    };
  });

  let refundReference: string | null = booking.refundMethod === 'MANUAL' ? (input.refundReference ?? null) : null;
  if (booking.refundMethod === 'GATEWAY' && booking.refundAmount > 0) {
    // Outside the transaction: never hold a row lock across an HTTP call.
    try {
      const r = await refundPayment(cash.paymentId!, booking.refundAmount, `rf_${booking.id}`);
      refundReference = r.id;
      await prisma.booking.update({ where: { id: booking.id }, data: { refundReference } });
    } catch (err) {
      console.error(`[cancel] gateway refund failed booking=${booking.id}`, err);
      await prisma.booking.update({ where: { id: booking.id }, data: { refundStatus: 'FAILED' } });
    }
  }

  return {
    ...toEmailData(booking, slotStarts),
    reason: input.reason,
    refundMethod: booking.refundMethod,
    refundAmount: booking.refundAmount,
    refundReference,
    refundNote: input.refundNote ?? null,
  };
}

/**
 * The customer cancelling their own booking from "My bookings".
 *
 * Deliberately thin: it decides *whether* they may (theirs, confirmed, and
 * far enough ahead) and how the money goes back, then hands off to the same
 * `cancelBooking` the owner uses — one place frees the slots, writes the
 * refund and keeps the ledger honest. A paid booking is refunded to the
 * account it was paid from; there is nothing to send back for one the turf
 * booked for free.
 */
export async function cancelByCustomer(bookingId: string, userId: string): Promise<CancellationEmailData> {
  const b = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, userId: true, status: true, startsAt: true },
  });
  // Unknown and not-yours look identical from outside — never leak existence.
  if (!b || b.userId !== userId) throw new BookingError('NOT_FOUND', 'booking not found');
  if (b.status === 'CANCELLED') throw new BookingError('VALIDATION', 'this booking is already cancelled');
  if (b.status !== 'CONFIRMED') throw new BookingError('VALIDATION', 'this booking is not confirmed yet');
  if (!withinChangeWindow(b.startsAt)) {
    throw new BookingError(
      'VALIDATION',
      `bookings can only be cancelled here more than ${CHANGE_WINDOW_HOURS} hours ahead — please call the turf`,
    );
  }

  // What came in, not what the booking is priced at — a booking the turf
  // moved may be worth more than was ever charged, and a booking they moved
  // for free carries its payment on the row it replaced.
  const cash = await collectedOn(b.id);
  const refundable = cash.paise > 0 && Boolean(cash.paymentId);
  return cancelBooking({
    bookingId: b.id,
    actorId: userId,
    reason: CANCEL_REASON.customer,
    refundMethod: refundable ? 'GATEWAY' : 'NONE',
    refundNote: refundable ? undefined : 'nothing was charged for this booking',
  });
}

// ---------------------------------------------------------------------------
// Status DTO for the customer's own booking (or an owner)

export async function getBookingStatus(
  bookingId: string,
  viewer: { id: string; isOwner: boolean },
): Promise<BookingStatusDTO | null> {
  const b = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      userId: true,
      status: true,
      startsAt: true,
      endsAt: true,
      numPeople: true,
      totalAmount: true,
      expiresAt: true,
      cancelReason: true,
      refundMethod: true,
      refundAmount: true,
      refundStatus: true,
      refundReference: true,
      razorpayOrderId: true,
      creditApplied: true,
      slots: { select: { slotStart: true }, orderBy: { slotStart: 'asc' } },
    },
  });
  if (!b) return null;
  if (b.userId !== viewer.id && !viewer.isOwner) return null; // 404, not 403 — don't leak existence

  const pending = b.status === 'PENDING' && b.expiresAt !== null && b.expiresAt.getTime() > Date.now();
  return {
    id: b.id,
    status: b.status,
    startsAt: b.startsAt.toISOString(),
    endsAt: b.endsAt.toISOString(),
    slotStarts: b.slots.map((s) => s.slotStart.toISOString()),
    numPeople: b.numPeople,
    totalAmount: b.totalAmount,
    expiresAt: b.expiresAt?.toISOString() ?? null,
    cancelReason: b.status === 'CANCELLED' ? b.cancelReason : null,
    refundMethod: b.refundMethod,
    refundAmount: b.refundAmount,
    refundStatus: b.refundStatus,
    refundReference: b.refundMethod === 'GATEWAY' ? null : b.refundReference,
    payment:
      pending && b.razorpayOrderId && b.userId === viewer.id
        ? { orderId: b.razorpayOrderId, keyId: publicKeyId(), amount: payableAmount(b) }
        : null,
  };
}
