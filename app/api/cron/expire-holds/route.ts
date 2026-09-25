import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { expireHolds } from '@/lib/bookings';

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
  const header = req.headers.get('authorization') ?? '';
  const given = Buffer.from(header.replace(/^Bearer\s+/i, ''), 'utf8');
  const want = Buffer.from(secret, 'utf8');
  return given.length === want.length && timingSafeEqual(given, want);
}

/**
 * GET /api/cron/expire-holds — every 10 minutes (vercel.json).
 * Marks expired PENDING holds CANCELLED and frees their slots. The grid
 * already treats expired holds as free; this keeps the ledger tidy.
 */
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  try {
    const expired = await expireHolds();
    return NextResponse.json({ ok: true, expired }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[cron] expire-holds failed', err);
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }
}
