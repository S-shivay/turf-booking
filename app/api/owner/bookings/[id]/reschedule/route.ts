import { after, type NextRequest } from 'next/server';
import { currentUser, requireOwner } from '@/lib/auth';
import { errorResponse, fail, forbidden, notFound, ok, parseBody, unauthenticated } from '@/lib/api';
import { createReschedule, getTurf } from '@/lib/bookings';
import { sendBookingRescheduled } from '@/lib/email';
import { ownerRescheduleSchema } from '@/lib/validation';
import type { RescheduleResponse } from '@/lib/types';

/**
 * POST /api/owner/bookings/[id]/reschedule — the turf moving a booking.
 * OWNER only.
 *
 * Its own route rather than a flag on the customer's, exactly as cancel is
 * split into `cancel` and `customer-cancel`: a client cannot hand an owner
 * rule to the customer endpoint, because that endpoint does not have one.
 *
 * There is only ever one outcome. An owner move takes no payment and returns
 * none, so the swap is finished by the time this responds — no hold, no
 * Razorpay order, nothing for the customer to complete.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const owner = await requireOwner();
    if (!owner) return (await currentUser()) ? forbidden() : unauthenticated();

    const { id } = await ctx.params;
    if (!/^[a-z0-9]{20,32}$/i.test(id)) return notFound();

    const body = await parseBody(req, ownerRescheduleSchema);
    const turf = await getTurf();
    if (!turf) return fail({ error: 'NOT_FOUND' }, 404);

    const { booking, moved } = await createReschedule({
      turf,
      actor: { id: owner.id, isOwner: true },
      originalId: id,
      dateKey: body.date,
      slotIndexes: body.slotIndexes,
      numPeople: body.numPeople,
      idempotencyKey: body.idempotencyKey,
    });

    // Both windows to the owners, and the news to the customer — their game
    // just changed time and they were not the one who changed it.
    if (moved) after(() => sendBookingRescheduled(moved));

    const res: RescheduleResponse = { outcome: 'moved', bookingId: booking.id };
    return ok(res, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
