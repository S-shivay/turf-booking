import type { NextRequest } from 'next/server';
import { currentUser } from '@/lib/auth';
import { errorResponse, fail, ok, parseBody, unauthenticated } from '@/lib/api';
import { createBooking, ensureOrder, getTurf } from '@/lib/bookings';
import { prisma } from '@/lib/db';
import { createBookingSchema } from '@/lib/validation';
import type { CreateBookingResponse } from '@/lib/types';

/**
 * POST /api/bookings — signed-in customer.
 * Creates a PENDING hold (slot rows inserted now, unique index enforces
 * exclusivity) and a Razorpay order. The amount is computed here; the
 * client never sends one.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return unauthenticated();

    const body = await parseBody(req, createBookingSchema);
    const turf = await getTurf();
    if (!turf) return fail({ error: 'NOT_FOUND' }, 404);

    // Phone is collected at checkout so the owner can reach the customer.
    if (body.phone) {
      await prisma.user.update({ where: { id: user.id }, data: { phone: body.phone } });
    }

    const { booking } = await createBooking({
      turf,
      userId: user.id,
      dateKey: body.date,
      slotIndexes: body.slotIndexes,
      numPeople: body.numPeople,
      idempotencyKey: body.idempotencyKey,
      mode: 'customer',
    });

    if (booking.status === 'CONFIRMED') {
      // Idempotent replay after the webhook already landed — nothing to pay.
      return fail({ error: 'VALIDATION', message: `already confirmed:${booking.id}` }, 400);
    }
    if (booking.status !== 'PENDING' || !booking.expiresAt || booking.expiresAt.getTime() <= Date.now()) {
      return fail({ error: 'VALIDATION', message: 'that booking attempt expired — please try again' }, 400);
    }

    const { orderId, keyId } = await ensureOrder(booking);
    const customer = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { name: true, email: true, phone: true },
    });

    const res: CreateBookingResponse = {
      bookingId: booking.id,
      orderId,
      amount: booking.totalAmount,
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
