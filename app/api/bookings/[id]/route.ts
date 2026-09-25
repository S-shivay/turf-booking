import type { NextRequest } from 'next/server';
import { currentUser } from '@/lib/auth';
import { errorResponse, notFound, ok, unauthenticated } from '@/lib/api';
import { getBookingStatus } from '@/lib/bookings';

/**
 * GET /api/bookings/[id] — the booking's own customer (or an owner).
 * Polled by the status page after checkout until the webhook confirms.
 * Unknown ids and other people's bookings both return 404.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await currentUser();
    if (!user) return unauthenticated();
    const { id } = await ctx.params;
    if (!/^[a-z0-9]{20,32}$/i.test(id)) return notFound();

    const dto = await getBookingStatus(id, { id: user.id, isOwner: user.role === 'OWNER' });
    if (!dto) return notFound();
    return ok(dto);
  } catch (err) {
    return errorResponse(err);
  }
}
