import 'server-only';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { BookingError } from '@/lib/bookings';
import { formatZodError } from '@/lib/validation';
import type { ApiError } from '@/lib/types';

const NO_STORE = { 'Cache-Control': 'no-store' };

export function ok<T>(data: T, init?: { status?: number; headers?: Record<string, string> }) {
  return NextResponse.json(data, { status: init?.status ?? 200, headers: { ...NO_STORE, ...init?.headers } });
}

export function fail(body: ApiError, status: number) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export const unauthenticated = () => fail({ error: 'UNAUTHENTICATED' }, 401);
export const forbidden = () => fail({ error: 'FORBIDDEN' }, 403);
export const notFound = () => fail({ error: 'NOT_FOUND' }, 404);

/** Parse a JSON body against a schema; malformed JSON is a 400, not a 500. */
export async function parseBody<T>(req: Request, schema: { parse: (v: unknown) => T }): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ZodError([{ code: 'custom', path: [], message: 'body must be JSON' }]);
  }
  return schema.parse(raw);
}

/** Map thrown errors to generic responses. Details go to the server log only. */
export function errorResponse(err: unknown) {
  if (err instanceof ZodError) return fail({ error: 'VALIDATION', message: formatZodError(err) }, 400);
  if (err instanceof BookingError) {
    switch (err.code) {
      case 'VALIDATION':
        return fail({ error: 'VALIDATION', message: err.message }, 400);
      case 'SLOTS_TAKEN':
        return fail({ error: 'SLOTS_TAKEN', taken: err.taken.map((d) => d.toISOString()) }, 409);
      case 'RATE_LIMITED':
        return fail({ error: 'RATE_LIMITED', message: err.message }, 429);
      case 'TOO_MANY_HOLDS':
        return fail({ error: 'TOO_MANY_HOLDS', message: err.message }, 429);
      case 'PAYMENT_UNAVAILABLE':
        return fail({ error: 'PAYMENT_UNAVAILABLE', message: err.message }, 502);
      case 'NOT_FOUND':
        return notFound();
      case 'FORBIDDEN':
        return forbidden();
    }
  }
  console.error('[api] unhandled', err);
  return fail({ error: 'INTERNAL' }, 500);
}
