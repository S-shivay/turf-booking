// Slot + business-date logic. Pure functions, safe on client and server.
//
// A "business day" runs 6:00 AM → 1:00 AM the next calendar day (IST).
// The 12:00 AM and 12:30 AM slots belong to the *previous* business date.
// Vercel runs in UTC — never use Date#getHours() here; everything goes
// through date-fns-tz with an explicit zone.

import { addDays, addMinutes } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

export const IST = 'Asia/Kolkata';

export const SLOT_MINUTES = 30;
export const DEFAULT_OPEN_HOUR = 6; // 6 AM
export const DEFAULT_CLOSE_HOUR = 25; // 1 AM next day
export const SLOTS_PER_DAY = (DEFAULT_CLOSE_HOUR - DEFAULT_OPEN_HOUR) * 2; // 38

export const VISIBLE_DAYS = 7; // customers
export const OWNER_VISIBLE_DAYS = 30; // owners can block further ahead
export const HOLD_MINUTES = 15;
export const MAX_SLOTS_PER_BOOKING = 12; // 6 hours; owners are uncapped
export const MAX_ACTIVE_HOLDS_PER_USER = 2;
export const BOOKINGS_PER_MINUTE_PER_USER = 10;
export const SLOT_POLL_MS = 10_000;
/**
 * How far ahead a customer may cancel or reschedule their own booking.
 * Matches the published policy on /cancellation — change both together.
 */
export const CHANGE_WINDOW_HOURS = 24;

/**
 * True while the customer can still change a booking themselves. Inside the
 * window the turf can still help by phone; the website stops offering it,
 * because by then the slot can no longer be sold to anyone else.
 */
export function withinChangeWindow(startsAt: Date, now: Date = new Date()): boolean {
  return startsAt.getTime() - now.getTime() > CHANGE_WINDOW_HOURS * 3600_000;
}

/** A business date as an IST calendar day, e.g. "2026-09-14". */
export type DateKey = string;

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateKey(value: unknown): value is DateKey {
  if (typeof value !== 'string' || !DATE_KEY_RE.test(value)) return false;
  const d = dateKeyToDbDate(value);
  return !Number.isNaN(d.getTime()) && dbDateToKey(d) === value;
}

/** Prisma `@db.Date` columns are read/written as UTC-midnight Dates. */
export function dateKeyToDbDate(key: DateKey): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

export function dbDateToKey(d: Date): DateKey {
  return d.toISOString().slice(0, 10);
}

/** Which business date does an instant belong to? */
export function businessDateKeyOf(ts: Date, openHour = DEFAULT_OPEN_HOUR): DateKey {
  const istHour = Number(formatInTimeZone(ts, IST, 'H'));
  // Before opening → still the previous business day. Subtracting 24h of
  // absolute time is safe here because IST has no DST.
  const base = istHour < openHour ? addDays(ts, -1) : ts;
  return formatInTimeZone(base, IST, 'yyyy-MM-dd');
}

export function businessDateOf(ts: Date, openHour = DEFAULT_OPEN_HOUR): Date {
  return dateKeyToDbDate(businessDateKeyOf(ts, openHour));
}

export function slotsPerDay(openHour = DEFAULT_OPEN_HOUR, closeHour = DEFAULT_CLOSE_HOUR): number {
  return (closeHour - openHour) * (60 / SLOT_MINUTES);
}

/** The UTC instant at which slot `index` of `key` starts. */
export function slotStartAt(key: DateKey, index: number, openHour = DEFAULT_OPEN_HOUR): Date {
  const open = fromZonedTime(`${key}T${String(openHour).padStart(2, '0')}:00:00`, IST);
  return addMinutes(open, index * SLOT_MINUTES);
}

/** All slot start instants for a business date. */
export function generateSlots(key: DateKey, openHour = DEFAULT_OPEN_HOUR, closeHour = DEFAULT_CLOSE_HOUR): Date[] {
  const count = slotsPerDay(openHour, closeHour);
  const open = slotStartAt(key, 0, openHour);
  return Array.from({ length: count }, (_, i) => addMinutes(open, i * SLOT_MINUTES));
}

export function slotEnd(start: Date): Date {
  return addMinutes(start, SLOT_MINUTES);
}

/** The rolling window of business dates shown to a viewer. */
export function visibleDateKeys(now: Date, days = VISIBLE_DAYS): DateKey[] {
  const today = dateKeyToDbDate(businessDateKeyOf(now));
  return Array.from({ length: days }, (_, i) => dbDateToKey(addDays(today, i)));
}

export function isContiguous(indexes: number[]): boolean {
  const sorted = [...indexes].sort((a, b) => a - b);
  return sorted.every((v, i) => i === 0 || v === sorted[i - 1] + 1);
}

// ---------- formatting (IST, human) ----------

export function formatTime(d: Date): string {
  return formatInTimeZone(d, IST, 'h:mm a');
}

export function formatRange(start: Date, end: Date): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/** "6:00 AM – 1:00 AM". `closeHour` may run past midnight (25 = 1 AM). */
export function formatOpeningHours(openHour = DEFAULT_OPEN_HOUR, closeHour = DEFAULT_CLOSE_HOUR): string {
  const label = (h: number) => {
    const hour = ((h % 24) + 24) % 24;
    const suffix = hour < 12 ? 'AM' : 'PM';
    return `${hour % 12 === 0 ? 12 : hour % 12}:00 ${suffix}`;
  };
  return `${label(openHour)} – ${label(closeHour)}`;
}

/** "Sun 14 Sep" */
export function formatDateKey(key: DateKey): string {
  return formatInTimeZone(dateKeyToDbDate(key), 'UTC', 'EEE d MMM');
}

/** "Sun 14 Sep, 7:00 AM – 8:00 AM" */
export function formatBookingWindow(start: Date, end: Date): string {
  return `${formatDateKey(businessDateKeyOf(start))}, ${formatRange(start, end)}`;
}

export function formatDateTime(d: Date): string {
  return formatInTimeZone(d, IST, 'EEE d MMM, h:mm a');
}

/** Slots may be non-contiguous: describe them as merged ranges. */
export function describeSlots(starts: Date[]): string {
  const sorted = [...starts].sort((a, b) => a.getTime() - b.getTime());
  const ranges: Array<[Date, Date]> = [];
  for (const s of sorted) {
    const last = ranges[ranges.length - 1];
    if (last && last[1].getTime() === s.getTime()) last[1] = slotEnd(s);
    else ranges.push([s, slotEnd(s)]);
  }
  return ranges.map(([a, b]) => formatRange(a, b)).join(', ');
}
