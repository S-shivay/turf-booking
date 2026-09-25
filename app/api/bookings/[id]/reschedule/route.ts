import { after, type NextRequest } from 'next/server';
import { currentUser } from '@/lib/auth';
import { errorResponse, fail, notFound, ok, parseBody, unauthenticated } from '@/lib/api';
import { createReschedule, ensureOrder, getTurf, payableAmount } from '@/lib/bookings';
import { prisma } from '@/lib/db';
import { sendBookingRescheduled } from '@/lib/email';
import { rescheduleSchema } from '@/lib/validation';
import type { RescheduleResponse } from '@/lib/types';

/**
 * POST /api/bookings/[id]/reschedule — move a confirmed booking.
 *
 * Two endings. When the new times cost the same, the swap is already done by
 * the time this returns and there is nothing to pay. When they cost more, a
 * hold on the new times comes back with a Razorpay order for the difference
 * — and the move only takes effect once that payment is confirmed, so a
 * customer who walks away still has the booking they started with.
 *
 * The amount is computed here from the turf's own price; the client never
 * sends one, and never learns the floors it is being held to beyond what the
 * picker already shows it.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await currentUser();
    if (!user) return unauthenticated();

    const { id } = await ctx.params;
    if (!/^[a-z0-9]{20,32}$/i.test(id)) return notFound();

    const body = await parseBody(req, rescheduleSchema);
    const turf = await getTurf();
    if (!turf) return fail({ error: 'NOT_FOUND' }, 404);

    const { booking, amountDue, moved } = await createReschedule({
      turf,
      // Customer rules, even for an owner arriving here: the owner's own move
      // has its own route, and this one must never learn an owner flag from
      // the client.
      actor: { id: user.id, isOwner: false },
      originalId: id,
      dateKey: body.date,
      slotIndexes: body.slotIndexes,
      numPeople: body.numPeople,
      idempotencyKey: body.idempotencyKey,
    });

    if (amountDue === 0 || booking.status === 'CONFIRMED') {
      // The swap is done. Tell the owners which times freed up and which
      // filled — off the critical path, like every other notification.
      if (moved) after(() => sendBookingRescheduled(moved));
      const res: RescheduleResponse = { outcome: 'moved', bookingId: booking.id };
      return ok(res, { status: 201 });
    }

    if (!booking.expiresAt || booking.expiresAt.getTime() <= Date.now()) {
      return fail({ error: 'VALIDATION', message: 'that attempt expired — please try again' }, 400);
    }

    const { orderId, keyId } = await ensureOrder(booking);
    const customer = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { name: true, email: true, phone: true },
    });

    const res: RescheduleResponse = {
      outcome: 'payment_required',
      bookingId: booking.id,
      orderId,
      amount: payableAmount(booking),
      currency: 'INR',
      keyId,
      expiresAt: booking.expiresAt.toISOString(),
      customer,
    };
    return ok(res, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
