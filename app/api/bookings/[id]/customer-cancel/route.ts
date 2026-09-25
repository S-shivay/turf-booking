import { after, type NextRequest } from 'next/server';
import { currentUser } from '@/lib/auth';
import { errorResponse, notFound, ok, unauthenticated } from '@/lib/api';
import { cancelByCustomer } from '@/lib/bookings';
import { sendBookingCancelled } from '@/lib/email';

/**
 * POST /api/bookings/[id]/customer-cancel — the customer cancelling their own.
 *
 * Deliberately separate from the owner's cancel route rather than a branch
 * inside it: this one takes no body at all, so there is no refund method,
 * amount or note a customer could name. The server decides all three from
 * what was actually paid. Ownership, status and the notice window are
 * re-checked in `cancelByCustomer` — the id in the URL is the only input.
 */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await currentUser();
    if (!user) return unauthenticated();

    const { id } = await ctx.params;
    if (!/^[a-z0-9]{20,32}$/i.test(id)) return notFound();

    const result = await cancelByCustomer(id, user.id);
    after(() => sendBookingCancelled(result));

    return ok({
      id: result.id,
      status: 'CANCELLED' as const,
      refundMethod: result.refundMethod,
      refundAmount: result.refundAmount,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
