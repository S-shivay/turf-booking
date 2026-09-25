import { after, type NextRequest } from 'next/server';
import { currentUser, requireOwner } from '@/lib/auth';
import { errorResponse, forbidden, notFound, ok, parseBody, unauthenticated } from '@/lib/api';
import { cancelBooking } from '@/lib/bookings';
import { sendBookingCancelled } from '@/lib/email';
import { cancelBookingSchema } from '@/lib/validation';

/**
 * POST /api/bookings/[id]/cancel — OWNER only.
 * Frees the slots, records the refund decision, issues a gateway refund
 * when asked, and emails owners + customer after the response is sent.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const owner = await requireOwner();
    if (!owner) return (await currentUser()) ? forbidden() : unauthenticated();

    const { id } = await ctx.params;
    if (!/^[a-z0-9]{20,32}$/i.test(id)) return notFound();
    const body = await parseBody(req, cancelBookingSchema);

    const result = await cancelBooking({
      bookingId: id,
      actorId: owner.id,
      reason: body.reason,
      refundMethod: body.refundMethod,
      refundAmount: body.refundAmount,
      refundReference: body.refundReference,
      refundNote: body.refundNote,
    });

    after(() => sendBookingCancelled(result));

    return ok({
      id: result.id,
      status: 'CANCELLED',
      refundMethod: result.refundMethod,
      refundAmount: result.refundAmount,
      refundReference: result.refundReference,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
