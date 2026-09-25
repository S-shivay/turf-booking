import type { NextRequest } from 'next/server';
import { errorResponse, fail, ok } from '@/lib/api';
import { getSlotStates, getTurf } from '@/lib/bookings';
import { OWNER_VISIBLE_DAYS, visibleDateKeys } from '@/lib/slots';
import { slotsQuerySchema } from '@/lib/validation';
import type { SlotsResponse } from '@/lib/types';

/**
 * GET /api/slots?date=YYYY-MM-DD — public.
 * Returns slot *states* only. No names, phones or booking ids: this payload
 * is visible in DevTools. Polled every 10 s by the grid, so it's one indexed
 * query and never cached.
 */
export async function GET(req: NextRequest) {
  try {
    const { date } = slotsQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    const now = new Date();
    // Owners may look 30 days out; everyone else 7. The wider window leaks
    // nothing (states only), so no auth check is needed here.
    if (!visibleDateKeys(now, OWNER_VISIBLE_DAYS).includes(date)) {
      return fail({ error: 'VALIDATION', message: 'date is outside the booking window' }, 400);
    }
    const turf = await getTurf();
    if (!turf) return fail({ error: 'NOT_FOUND' }, 404);

    const slots = await getSlotStates(turf, date, now);
    const body: SlotsResponse = { date, serverNow: now.toISOString(), slots };
    return ok(body);
  } catch (err) {
    return errorResponse(err);
  }
}
