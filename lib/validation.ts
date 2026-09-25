import { z } from 'zod';
import { MAX_SLOTS_PER_BOOKING, SLOTS_PER_DAY, isDateKey } from '@/lib/slots';

export const dateKeySchema = z.string().refine(isDateKey, { message: 'date must be YYYY-MM-DD' });

const slotIndexesSchema = (max: number) =>
  z
    .array(
      z
        .number()
        .int()
        .min(0)
        .max(SLOTS_PER_DAY - 1),
    )
    .min(1, 'select at least one slot')
    .max(max, `at most ${max} slots per booking`)
    .refine((a) => new Set(a).size === a.length, { message: 'duplicate slots' });

// Indian mobile: 10 digits starting 6-9, optional +91 / 0 prefix.
export const phoneSchema = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s-]/g, ''))
  .refine((s) => /^(\+91|0)?[6-9]\d{9}$/.test(s), { message: 'enter a valid 10-digit mobile number' })
  .transform((s) => s.slice(-10));

export const createBookingSchema = z
  .object({
    date: dateKeySchema,
    slotIndexes: slotIndexesSchema(MAX_SLOTS_PER_BOOKING),
    numPeople: z.number().int().min(1).max(100),
    idempotencyKey: z.string().uuid(),
    phone: phoneSchema.optional(),
  })
  .strict();

export const ownerBookSchema = z
  .object({
    date: dateKeySchema,
    slotIndexes: slotIndexesSchema(SLOTS_PER_DAY),
    numPeople: z.number().int().min(1).max(100),
    idempotencyKey: z.string().uuid(),
  })
  .strict();

export const cancelBookingSchema = z
  .object({
    reason: z.string().trim().min(3).max(500),
    refundMethod: z.enum(['GATEWAY', 'MANUAL', 'NONE']),
    refundAmount: z.number().int().min(0).optional(),
    refundReference: z.string().trim().max(120).optional(),
    refundNote: z.string().trim().max(500).optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.refundMethod === 'MANUAL' && !v.refundReference) {
      ctx.addIssue({
        code: 'custom',
        path: ['refundReference'],
        message: 'UTR / reference is required for a manual refund',
      });
    }
    if (v.refundMethod === 'NONE' && !v.refundNote) {
      ctx.addIssue({
        code: 'custom',
        path: ['refundNote'],
        message: 'explain why no refund is being made',
      });
    }
    if (v.refundMethod !== 'NONE' && v.refundAmount !== undefined && v.refundAmount <= 0) {
      ctx.addIssue({ code: 'custom', path: ['refundAmount'], message: 'refund amount must be positive' });
    }
  });

/** Moving a booking. The floors it may not go below are the server's business. */
export const rescheduleSchema = z
  .object({
    date: dateKeySchema,
    slotIndexes: slotIndexesSchema(MAX_SLOTS_PER_BOOKING),
    numPeople: z.number().int().min(1).max(100),
    idempotencyKey: z.string().uuid(),
  })
  .strict();

export const slotsQuerySchema = z.object({ date: dateKeySchema }).strict();

/** An owner move: any free time, any size, so only the day bounds it. */
export const ownerRescheduleSchema = z
  .object({
    date: dateKeySchema,
    slotIndexes: slotIndexesSchema(SLOTS_PER_DAY),
    numPeople: z.number().int().min(1).max(100),
    idempotencyKey: z.string().uuid(),
  })
  .strict();

export const OWNER_PAGE_SIZES = [10, 25, 50, 100] as const;
const OWNER_STATUSES = ['all', 'upcoming', 'confirmed', 'pending', 'played', 'cancelled'] as const;

/**
 * The ledger filter, read straight off the URL by both the page and the
 * export — one schema, so a download can never mean something different from
 * the screen that produced it.
 *
 * Nothing here throws on rubbish. A filter is a view, not a mutation: a
 * hand-edited `?page=abc` shows page 1 rather than an error page, and every
 * bound is clamped before it can reach Prisma as a `take: 10000`.
 */
export function parseOwnerQuery(sp: URLSearchParams | Record<string, string | string[] | undefined>) {
  const get = (k: string): string | null => {
    if (sp instanceof URLSearchParams) return sp.get(k);
    const v = sp[k];
    return typeof v === 'string' ? v : Array.isArray(v) ? (v[0] ?? null) : null;
  };

  const int = (raw: string | null, fallback: number) => {
    const n = Number(raw);
    return Number.isSafeInteger(n) ? n : fallback;
  };
  const date = (raw: string | null) => (raw && isDateKey(raw) ? raw : null);

  const sizeRaw = int(get('page_size'), 25);
  const pageSize = (OWNER_PAGE_SIZES as readonly number[]).includes(sizeRaw) ? sizeRaw : 25;

  // `on` is the one-date shorthand: it simply collapses the range.
  const on = date(get('on'));
  let from = on ?? date(get('from'));
  let to = on ?? date(get('to'));
  // A range entered backwards is a typo, not an empty result.
  if (from && to && from > to) [from, to] = [to, from];

  const statusRaw = get('status');
  const status = (OWNER_STATUSES as readonly string[]).includes(statusRaw ?? '')
    ? (statusRaw as (typeof OWNER_STATUSES)[number])
    : 'all';

  // `%` is a LIKE wildcard once it reaches the database, so a search for "%"
  // would quietly return the entire history. It never appears in a name, an
  // email or a phone number, so it is simply dropped. (`_` is left alone: it
  // does occur in real email addresses, and as a wildcard it over-matches by
  // a single character rather than by everything.)
  const q = (get('q') ?? '').replace(/%/g, '').trim().slice(0, 60);

  return {
    page: Math.max(1, int(get('page'), 1)),
    pageSize,
    q: q.length ? q : null,
    from,
    to,
    status,
  };
}

/** Razorpay webhook envelope — only the fields we act on. */
export const razorpayWebhookSchema = z.object({
  event: z.string(),
  payload: z.object({
    payment: z
      .object({
        entity: z.object({
          id: z.string(),
          order_id: z.string().nullable().optional(),
          amount: z.number().int(),
          currency: z.string(),
          method: z.string().optional(),
          status: z.string().optional(),
        }),
      })
      .optional(),
    refund: z
      .object({
        entity: z.object({
          id: z.string(),
          payment_id: z.string(),
          amount: z.number().int(),
          status: z.string().optional(),
        }),
      })
      .optional(),
  }),
});

export function formatZodError(err: z.ZodError): string {
  return err.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ');
}
