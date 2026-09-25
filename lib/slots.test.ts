import { describe, expect, it } from 'vitest';
import { fromZonedTime } from 'date-fns-tz';
import {
  CHANGE_WINDOW_HOURS,
  IST,
  SLOTS_PER_DAY,
  businessDateKeyOf,
  describeSlots,
  formatOpeningHours,
  formatTime,
  generateSlots,
  isContiguous,
  isDateKey,
  slotStartAt,
  visibleDateKeys,
  withinChangeWindow,
} from './slots';

const ist = (s: string) => fromZonedTime(s, IST);

describe('businessDateKeyOf — midnight rollover', () => {
  it.each([
    ['11:59 PM stays on the same day', '2026-09-14T23:59:00', '2026-09-14'],
    ['12:00 AM belongs to the previous day', '2026-09-15T00:00:00', '2026-09-14'],
    ['12:30 AM belongs to the previous day', '2026-09-15T00:30:00', '2026-09-14'],
    ['1:00 AM (closing) belongs to the previous day', '2026-09-15T01:00:00', '2026-09-14'],
    ['5:59 AM belongs to the previous day', '2026-09-15T05:59:00', '2026-09-14'],
    ['6:00 AM opens the new day', '2026-09-15T06:00:00', '2026-09-15'],
    ['month boundary', '2026-10-01T02:00:00', '2026-09-30'],
    ['year boundary', '2027-01-01T00:30:00', '2026-12-31'],
  ])('%s', (_, at, expected) => {
    expect(businessDateKeyOf(ist(at))).toBe(expected);
  });

  it('is independent of the server timezone (UTC instant)', () => {
    // 2026-09-14T19:00Z == 2026-09-15 00:30 IST → business date 14th
    expect(businessDateKeyOf(new Date('2026-09-14T19:00:00Z'))).toBe('2026-09-14');
  });
});

describe('generateSlots', () => {
  it('yields 38 half-hour slots from 6:00 AM to 12:30 AM', () => {
    const slots = generateSlots('2026-09-14');
    expect(slots).toHaveLength(SLOTS_PER_DAY);
    expect(slots[0].toISOString()).toBe(ist('2026-09-14T06:00:00').toISOString());
    expect(formatTime(slots[0])).toBe('6:00 AM');
    expect(formatTime(slots[37])).toBe('12:30 AM');
    expect(slots[37].toISOString()).toBe(ist('2026-09-15T00:30:00').toISOString());
  });

  it('every generated slot maps back to its own business date', () => {
    for (const s of generateSlots('2026-09-14')) {
      expect(businessDateKeyOf(s)).toBe('2026-09-14');
    }
  });

  it('slotStartAt agrees with generateSlots', () => {
    const slots = generateSlots('2026-09-14');
    slots.forEach((s, i) => expect(slotStartAt('2026-09-14', i).getTime()).toBe(s.getTime()));
  });
});

describe('visibleDateKeys', () => {
  it('starts on the current business date, 7 days long', () => {
    const keys = visibleDateKeys(ist('2026-09-15T00:30:00'));
    expect(keys).toEqual([
      '2026-09-14',
      '2026-09-15',
      '2026-09-16',
      '2026-09-17',
      '2026-09-18',
      '2026-09-19',
      '2026-09-20',
    ]);
  });
});

describe('helpers', () => {
  it('isDateKey rejects malformed and impossible dates', () => {
    expect(isDateKey('2026-09-14')).toBe(true);
    expect(isDateKey('2026-02-30')).toBe(false);
    expect(isDateKey('2026-9-4')).toBe(false);
    expect(isDateKey(20260914)).toBe(false);
  });

  it('isContiguous', () => {
    expect(isContiguous([3, 4, 5])).toBe(true);
    expect(isContiguous([5, 3, 4])).toBe(true);
    expect(isContiguous([3, 5])).toBe(false);
  });

  it('describeSlots merges adjacent slots into ranges', () => {
    const d = '2026-09-14';
    const text = describeSlots([slotStartAt(d, 2), slotStartAt(d, 3), slotStartAt(d, 10)]);
    expect(text).toBe('7:00 AM – 8:00 AM, 11:00 AM – 11:30 AM');
  });

  it('formatOpeningHours reads a past-midnight closing hour as the next morning', () => {
    // 25 is 1 AM the next day — the About/Contact pages must not print "25:00".
    expect(formatOpeningHours(6, 25)).toBe('6:00 AM – 1:00 AM');
    expect(formatOpeningHours(0, 12)).toBe('12:00 AM – 12:00 PM');
    expect(formatOpeningHours()).toBe('6:00 AM – 1:00 AM');
  });

  describe('withinChangeWindow', () => {
    // This decides whether a customer sees Cancel and Reschedule at all, and
    // whether the server honours them — so the boundary is worth pinning down.
    const now = new Date('2026-09-21T10:00:00.000Z');
    const hours = (n: number) => new Date(now.getTime() + n * 3600_000);

    it('is open well outside the window', () => {
      expect(withinChangeWindow(hours(CHANGE_WINDOW_HOURS + 1), now)).toBe(true);
      expect(withinChangeWindow(hours(24 * 7), now)).toBe(true);
    });

    it('is closed inside the window', () => {
      expect(withinChangeWindow(hours(CHANGE_WINDOW_HOURS - 1), now)).toBe(false);
      expect(withinChangeWindow(hours(1), now)).toBe(false);
    });

    it('is closed exactly on the boundary', () => {
      // Exactly 24 h is not "more than 24 h": the customer loses a tie, which
      // is the safe direction when the slot can no longer be resold.
      expect(withinChangeWindow(hours(CHANGE_WINDOW_HOURS), now)).toBe(false);
      expect(withinChangeWindow(new Date(hours(CHANGE_WINDOW_HOURS).getTime() + 1), now)).toBe(true);
    });

    it('is closed for a game that has already started', () => {
      expect(withinChangeWindow(hours(-1), now)).toBe(false);
    });
  });
});
