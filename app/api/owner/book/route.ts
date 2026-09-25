import type { NextRequest } from 'next/server';
import { currentUser, requireOwner } from '@/lib/auth';
import { errorResponse, fail, forbidden, ok, parseBody, unauthenticated } from '@/lib/api';
import { createBooking, getTurf } from '@/lib/bookings';
import { ownerBookSchema } from '@/lib/validation';

/**
 * POST /api/owner/book — OWNER only.
 * Same transaction as a customer booking, but CONFIRMED immediately,
 * ₹0, no Razorpay, no email. Still subject to the unique index.
 */
export async function POST(req: NextRequest) {
  try {
    const owner = await requireOwner();
    if (!owner) return (await currentUser()) ? forbidden() : unauthenticated();

    const body = await parseBody(req, ownerBookSchema);
    const turf = await getTurf();
    if (!turf) return fail({ error: 'NOT_FOUND' }, 404);

    const { booking } = await createBooking({
      turf,
      userId: owner.id,
      dateKey: body.date,
      slotIndexes: body.slotIndexes,
      numPeople: body.numPeople,
      idempotencyKey: body.idempotencyKey,
      mode: 'owner',
    });

    return ok({ bookingId: booking.id, status: booking.status }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
