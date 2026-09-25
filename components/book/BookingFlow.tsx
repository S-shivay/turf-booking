'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { signInWithGoogle } from '@/app/actions/auth';
import { Button } from '@/components/ui';
import * as account from '@/content/account';
import { hints, picker } from '@/content/book';
import * as owner from '@/content/owner';
import { fill } from '@/content/home';
import { openCheckout, loadCheckout } from '@/lib/checkout';
import { ApiError, apiJson, withLoader } from '@/lib/loading';
import { HOLD_MINUTES, MAX_SLOTS_PER_BOOKING, SLOT_POLL_MS, describeSlots, formatTime, slotsPerDay } from '@/lib/slots';
import type { CreateBookingResponse, RescheduleResponse, SlotDTO, SlotsResponse, TurfPublic } from '@/lib/types';
import { cn, formatRupees } from '@/lib/utils';

export interface DayOption {
  key: string;
  /** "Today" / "Tomorrow" / "Thu" */
  weekday: string;
  /** "16" */
  day: string;
  /** "Sep" */
  month: string;
}

/**
 * Set when the picker is moving an existing booking rather than making a new
 * one. The floors come from the booking itself: the stepper will not go below
 * its players and the button stays off below its number of times, so a move
 * can only ever keep or raise what was paid. That rule is expressed entirely
 * as controls — no copy anywhere explains it.
 */
export interface RescheduleMode {
  bookingId: string;
  minPeople: number;
  minSlots: number;
  /** Paise already paid, carried over. */
  creditApplied: number;
  /** ISO starts of the booking's current times — still selectable while moving. */
  ownSlotStarts: string[];
}

export interface BookingFlowProps {
  turf: TurfPublic & { phone: string };
  days: DayOption[];
  initialDate: string;
  initialSlots: SlotDTO[];
  initialSelected: number[];
  initialPeople: number;
  signedIn: boolean;
  phone: string | null;
  reschedule?: RescheduleMode | null;
  /**
   * The turf is using the picker itself: 30 days instead of 7, no cap on
   * times, no phone, and no money — an owner booking is free and confirmed
   * the moment it is made, so no payment screen ever opens.
   */
  asOwner?: boolean;
}

const STATE_STYLE: Record<string, string> = {
  free: 'bg-soft-green text-ink inset-ring-1 inset-ring-green/25 hover:inset-ring-green hover:-translate-y-0.5 active:translate-y-0',
  selected: 'btn-gradient text-white ring-0 shadow-[0_10px_24px_-12px_rgba(34,197,94,.8)]',
  mine: 'bg-soft-blue text-ink inset-ring-1 inset-ring-blue/40 hover:inset-ring-blue hover:-translate-y-0.5 active:translate-y-0',
  held: 'bg-amber-50 text-amber-700 inset-ring-1 inset-ring-amber-200',
  booked: 'bg-rose-50 text-rose-600 inset-ring-1 inset-ring-rose-200',
  past: 'bg-ink/[0.04] text-muted inset-ring-1 inset-ring-ink/5',
};

const STATE_GLYPH: Record<string, string> = {
  free: '✓',
  selected: '●',
  mine: '★',
  held: '◷',
  booked: '✕',
  past: '–',
};

/** "6:00 PM, 6:30 PM" — used in every hint that names times. */
const timesOf = (list: SlotDTO[]) => list.map((s) => formatTime(new Date(s.start))).join(', ');

const STATE_WORD: Record<string, string> = {
  free: 'Free',
  selected: 'Selected',
  mine: 'Yours',
  held: 'Being booked',
  booked: 'Booked',
  past: 'Gone',
};

/**
 * The whole booking journey on one screen: day → times → players → pay.
 *
 * Everything shown here is display-only; the server recomputes the price and
 * re-checks every slot when the hold is created, and only the Razorpay
 * webhook can confirm the booking.
 */
export function BookingFlow({
  turf,
  days,
  initialDate,
  initialSlots,
  initialSelected,
  initialPeople,
  signedIn,
  phone: initialPhone,
  reschedule = null,
  asOwner = false,
}: BookingFlowProps) {
  const [date, setDate] = useState(initialDate);
  const [slots, setSlots] = useState<SlotDTO[]>(initialSlots);
  const [selected, setSelected] = useState<number[]>(initialSelected);
  const [people, setPeople] = useState(initialPeople);
  const [phone, setPhone] = useState(initialPhone ?? '');
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const phoneRef = useRef<HTMLInputElement>(null);
  const idem = useRef<{ sig: string; key: string } | null>(null);
  const request = useRef(0);

  // A move starts from the booking's own size and may only grow from there.
  const floorPeople = Math.max(turf.minPeople, reschedule?.minPeople ?? turf.minPeople);
  const floorSlots = reschedule?.minSlots ?? 1;
  // The booking's current times stay pickable — they are already its own.
  // Memoised so the poller's `load` callback has a stable dependency.
  const ownStarts = useMemo(() => new Set(reschedule?.ownSlotStarts ?? []), [reschedule]);

  // Customers are capped at 12 times a booking; the turf blocks what it likes.
  const maxSlots = asOwner ? slotsPerDay(turf.openHour, turf.closeHour) : MAX_SLOTS_PER_BOOKING;

  const vars = { min: turf.minPeople, max: turf.maxPeople, hold: HOLD_MINUTES, phone: turf.phone };
  const byIndex = new Map(slots.map((s) => [s.index, s]));
  const chosen = selected.map((i) => byIndex.get(i)).filter(Boolean) as SlotDTO[];
  const total = selected.length * people * turf.pricePerPersonPerSlot * 100;
  const credit = reschedule?.creditApplied ?? 0;
  const due = Math.max(0, total - credit);
  const shortBy = Math.max(0, floorSlots - selected.length);
  const enough = selected.length > 0 && shortBy === 0;
  const timesLabel = chosen.length ? describeSlots(chosen.map((s) => new Date(s.start))) : '';
  const day = days.find((d) => d.key === date);
  const dayLabel = day ? `${day.weekday} ${day.day} ${day.month}` : date;

  /** Fetch a day's board. `silent` keeps the global loader out of the way. */
  const load = useCallback(
    async (key: string, silent = false) => {
      const id = ++request.current;
      try {
        const res = await apiJson<SlotsResponse>(`/api/slots?date=${key}`, { silent, cache: 'no-store' });
        if (id !== request.current) return; // a newer day was picked meanwhile
        setSlots(res.slots);

        // Drop anything we had picked that someone else has since taken. The
        // booking being moved reads as `booked` on the board — it is ours, so
        // it is never "gone".
        const gone = res.slots.filter(
          (s) => selected.includes(s.index) && s.state !== 'free' && !ownStarts.has(s.start),
        );
        if (gone.length) {
          setSelected(selected.filter((i) => !gone.some((g) => g.index === i)));
          setHint(fill(hints.removed, { times: timesOf(gone) }));
        }
      } catch {
        // A failed poll is not worth a message; the next one in 10 s usually works.
      }
    },
    [selected, ownStarts],
  );

  // The poller reads the latest `load` without re-subscribing on every pick.
  const latestLoad = useRef(load);
  useEffect(() => {
    latestLoad.current = load;
  });

  // Poll the board, but never while the tab is in the background.
  useEffect(() => {
    const tick = () => {
      if (!document.hidden) void latestLoad.current(date, true);
    };
    const id = window.setInterval(tick, SLOT_POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [date]);

  function pickDay(key: string) {
    if (key === date) return;
    setDate(key);
    setSelected([]);
    setHint(null);
    setSlots([]); // shows the skeleton until the board arrives
    void load(key);
  }

  function toggle(slot: SlotDTO) {
    const mine = ownStarts.has(slot.start);
    if (slot.state !== 'free' && !mine) {
      setHint(
        slot.state === 'past'
          ? hints.past
          : fill(slot.state === 'held' ? hints.held : hints.booked, { times: formatTime(new Date(slot.start)) }),
      );
      return;
    }
    const isSelected = selected.includes(slot.index);
    if (!isSelected && selected.length >= maxSlots) {
      setHint(fill(hints.maxSlots, { max: maxSlots }));
      return;
    }
    setSelected(
      isSelected ? selected.filter((i) => i !== slot.index) : [...selected, slot.index].sort((a, b) => a - b),
    );
    setHint(null);
  }

  function idempotencyKey(): string {
    const sig = `${date}|${selected.join(',')}|${people}`;
    if (idem.current?.sig !== sig) idem.current = { sig, key: crypto.randomUUID() };
    return idem.current.key;
  }

  function onApiError(err: unknown) {
    if (err instanceof ApiError) {
      if (err.code === 'SLOTS_TAKEN') {
        const taken = new Set((err.body as { taken?: string[] })?.taken ?? []);
        const gone = slots.filter((s) => taken.has(s.start));
        const keep = selected.filter((i) => !gone.some((g) => g.index === i));
        setSelected(keep);
        setHint(fill(keep.length ? hints.taken : hints.allTaken, { times: timesOf(gone) }));
        void load(date, true);
        return;
      }
      const map: Record<string, string> = {
        TOO_MANY_HOLDS: hints.tooManyHolds,
        RATE_LIMITED: hints.rateLimited,
        PAYMENT_UNAVAILABLE: fill(hints.paymentDown, vars),
        UNAUTHENTICATED: hints.signedOut,
        VALIDATION: err.message,
      };
      setHint(map[err.code] ?? hints.generic);
      return;
    }
    if (err instanceof Error && err.message === 'checkout-unavailable') {
      setHint(fill(hints.paymentDown, vars));
      return;
    }
    setHint(hints.generic);
  }

  /**
   * Move an existing booking. Nothing extra to pay means the swap is already
   * done by the time this returns; otherwise we collect the difference the
   * same way a new booking is paid for, and the move only lands when the
   * webhook confirms it. Either way the original stays intact until then.
   */
  async function move() {
    if (!reschedule) return;
    if (shortBy > 0) {
      setHint(shortBy === 1 ? account.reschedule.needMoreOne : fill(account.reschedule.needMore, { count: floorSlots }));
      return;
    }
    setBusy(true);
    setHint(null);
    try {
      const endpoint = asOwner
        ? `/api/owner/bookings/${reschedule.bookingId}/reschedule`
        : `/api/bookings/${reschedule.bookingId}/reschedule`;
      const res = await apiJson<RescheduleResponse>(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          date,
          slotIndexes: selected,
          numPeople: people,
          idempotencyKey: idempotencyKey(),
        }),
      });

      if (res.outcome === 'moved') {
        // A full document load, never router.push: see the note on `pay()`.
        window.location.assign(asOwner ? '/owner' : '/my-bookings');
        return;
      }

      await withLoader(loadCheckout());
      await openCheckout({
        order: res,
        turfName: turf.name,
        description: `${describeSlots(chosen.map((s) => new Date(s.start)))} · ${people} players`,
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        onClose: () => window.location.assign(`/booking/${res.bookingId}`),
      });
    } catch (err) {
      onApiError(err);
    } finally {
      setBusy(false);
    }
  }

  /**
   * The turf blocking a slot for itself. No price, no hold, no gateway: the
   * booking is CONFIRMED by the time this returns, so the only thing left is
   * to go and look at it.
   */
  async function blockIt() {
    if (!selected.length) {
      setHint(hints.none);
      return;
    }
    setBusy(true);
    setHint(null);
    try {
      await apiJson<{ bookingId: string }>('/api/owner/book', {
        method: 'POST',
        body: JSON.stringify({
          date,
          slotIndexes: selected,
          numPeople: people,
          idempotencyKey: idempotencyKey(),
        }),
      });
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign('/owner');
    } catch (err) {
      onApiError(err);
      setBusy(false);
    }
  }

  async function pay() {
    if (!selected.length) {
      setHint(hints.none);
      return;
    }
    const digits = phone.replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(digits)) {
      setHint(hints.phone);
      phoneRef.current?.focus();
      return;
    }
    setBusy(true);
    setHint(null);
    try {
      const order = await apiJson<CreateBookingResponse>('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          date,
          slotIndexes: selected,
          numPeople: people,
          idempotencyKey: idempotencyKey(),
          phone: digits,
        }),
      });
      await withLoader(loadCheckout());
      await openCheckout({
        order,
        turfName: turf.name,
        description: `${describeSlots(chosen.map((s) => new Date(s.start)))} · ${people} players`,
        // Paid, failed or dismissed — the status page is the single source of
        // truth. Deliberately a full document load, not router.push: Checkout
        // tears itself down over several frames and a soft navigation can
        // inherit its scroll lock. A reload after paying costs nothing.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        onClose: () => window.location.assign(`/booking/${order.bookingId}`),
      });
    } catch (err) {
      onApiError(err);
    } finally {
      setBusy(false);
    }
  }

  const returnTo = `/book?date=${date}&slots=${selected.join(',')}&people=${people}`;

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_370px] lg:items-start lg:gap-10">
      {/* ------------------------------------------------------- day + grid */}
      <div className="min-w-0">
        {reschedule && (
          <div className="mb-8 rounded-3xl bg-soft-blue p-5 inset-ring-1 inset-ring-blue/30 sm:p-6">
            {/* The owner's page already carries this as its H1 — saying it
                twice on one screen is noise, not emphasis. */}
            {!asOwner && (
              <>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
                  {account.reschedule.eyebrow}
                </p>
                <h2 className="mt-2 text-xl font-black uppercase tracking-tight sm:text-2xl">
                  {account.reschedule.title}
                </h2>
              </>
            )}
            <p className={cn('text-[15px] leading-7 text-ink-soft', !asOwner && 'mt-2')}>
              {fill(asOwner ? owner.move.body : account.reschedule.body, {
                players: reschedule.minPeople,
                times: describeSlots(reschedule.ownSlotStarts.map((s) => new Date(s))),
              })}
            </p>
            <p className="mt-2 text-sm text-muted">
              {asOwner ? owner.move.keepNote : account.reschedule.keepNote}
            </p>
            <Link
              href={asOwner ? '/owner' : '/my-bookings'}
              className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-green-deep underline underline-offset-4"
            >
              {asOwner ? owner.move.cancel : account.reschedule.cancel}
            </Link>
          </div>
        )}

        <Field label={picker.dayLabel} help={asOwner ? owner.book.dayHelp : picker.dayHelp}>
          <div className="snap-strip -mx-5 flex gap-2 px-5 sm:mx-0 sm:px-0">
            {days.map((d) => {
              const on = d.key === date;
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => pickDay(d.key)}
                  aria-pressed={on}
                  className={cn(
                    'flex h-[72px] w-[74px] shrink-0 snap-start flex-col items-center justify-center rounded-2xl text-center transition-[transform,box-shadow,background-color] duration-200',
                    on
                      ? 'btn-gradient text-white shadow-[0_10px_24px_-12px_rgba(34,197,94,.8)]'
                      : 'bg-white text-ink inset-ring-1 inset-ring-ink/10 hover:inset-ring-ink/30',
                  )}
                >
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] opacity-80">{d.weekday}</span>
                  <span className="text-xl font-black leading-tight">{d.day}</span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] opacity-80">{d.month}</span>
                </button>
              );
            })}
          </div>
        </Field>

        <Field label={picker.timeLabel} help={picker.timeHelp} className="mt-8">
          <ul className="flex flex-wrap gap-x-4 gap-y-2" aria-hidden>
            {(reschedule
              ? [picker.legend[0], picker.legend[1], { key: 'mine', label: STATE_WORD.mine }, ...picker.legend.slice(2)]
              : picker.legend
            ).map((l) => (
              <li key={l.key} className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider">
                <span
                  className={cn(
                    'grid h-5 w-5 place-items-center rounded-md text-[10px]',
                    STATE_STYLE[l.key],
                    l.key === 'free' && 'inset-ring-ink/15',
                  )}
                >
                  {STATE_GLYPH[l.key]}
                </span>
                <span className="text-muted">{l.label}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 space-y-6">
            {slots.length === 0 ? (
              <div className="grid grid-cols-2 gap-2 min-[360px]:grid-cols-3 min-[420px]:grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5">
                {Array.from({ length: 12 }, (_, i) => (
                  <div key={i} className="h-[58px] animate-pulse rounded-2xl bg-ink/[0.05]" />
                ))}
              </div>
            ) : (
              picker.periods.map((p) => {
                const inPeriod = slots.filter((s) => {
                  const h = turf.openHour + Math.floor(s.index / 2);
                  return h >= p.from && h < p.to;
                });
                if (!inPeriod.length) return null;
                const anyOpen = inPeriod.some((s) => s.state === 'free');
                return (
                  <div key={p.label}>
                    <div className="mb-2 flex items-baseline justify-between gap-3">
                      <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">{p.label}</h3>
                      {!anyOpen && <span className="text-[11px] font-semibold text-muted">Nothing free left</span>}
                    </div>
                    <div
                      role="group"
                      aria-label={`${p.label} times`}
                      className="grid grid-cols-3 gap-2 min-[420px]:grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5"
                    >
                      {inPeriod.map((s) => {
                        const mine = ownStarts.has(s.start);
                        const state = selected.includes(s.index) ? 'selected' : mine ? 'mine' : s.state;
                        const time = formatTime(new Date(s.start));
                        return (
                          <button
                            key={s.index}
                            type="button"
                            onClick={() => toggle(s)}
                            aria-pressed={state === 'selected'}
                            aria-disabled={s.state !== 'free' && !mine}
                            aria-label={`${time} — ${STATE_WORD[state]}`}
                            className={cn(
                              'flex h-[58px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 transition-[transform,box-shadow,background-color,color] duration-200',
                              STATE_STYLE[state],
                            )}
                          >
                            <span className="text-[13px] font-extrabold leading-none tabular-nums">{time}</span>
                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.06em] opacity-90">
                              <span aria-hidden>{STATE_GLYPH[state]}</span>
                              {STATE_WORD[state]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Field>

        {/* Live region: every rejection, removal and 409 lands here. */}
        <p
          role="status"
          aria-live="polite"
          className={cn(
            'mt-5 rounded-2xl px-4 py-3 text-sm font-medium transition-opacity',
            hint ? 'bg-amber-50 text-amber-800 inset-ring-1 inset-ring-amber-200' : 'sr-only',
          )}
        >
          {hint}
        </p>
      </div>

      {/* ---------------------------------------------------------- summary */}
      <aside className="mt-10 lg:mt-0 lg:sticky lg:top-28">
        <div className="rounded-3xl bg-white p-5 inset-ring-1 inset-ring-ink/[0.08] shadow-[0_20px_50px_-30px_rgba(16,24,23,.3)] sm:p-6">
          <h2 className="text-lg font-black uppercase tracking-tight">{asOwner ? owner.book.summaryLabel : picker.summaryLabel}</h2>

          <div className="mt-5">
            <label htmlFor="people" className="text-sm font-bold">
              {picker.peopleLabel}
            </label>
            <p className="mt-1 text-xs text-muted">{fill(picker.peopleHelp, vars)}</p>
            <div className="mt-3 flex items-center gap-3">
              <Step
                sign="−"
                label="One player fewer"
                disabled={people <= floorPeople}
                onClick={() => setPeople(Math.max(floorPeople, people - 1))}
              />
              <input
                id="people"
                type="number"
                inputMode="numeric"
                min={floorPeople}
                max={turf.maxPeople}
                value={people}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n)) setPeople(Math.min(turf.maxPeople, Math.max(floorPeople, Math.round(n))));
                }}
                className="h-12 w-full min-w-0 rounded-2xl bg-soft-green text-center text-lg font-black tabular-nums inset-ring-1 inset-ring-ink/10 focus:outline-none focus:inset-ring-2 focus:inset-ring-green [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <Step
                sign="+"
                label="One player more"
                disabled={people >= turf.maxPeople}
                onClick={() => setPeople(Math.min(turf.maxPeople, people + 1))}
              />
            </div>
          </div>

          {/* Moving a booking needs no phone number — we already have theirs. */}
          <div className={cn('mt-6', reschedule && 'hidden')}>
            <label htmlFor="phone" className="text-sm font-bold">
              {picker.phoneLabel}
            </label>
            <p className="mt-1 text-xs text-muted">{picker.phoneHelp}</p>
            <div className="mt-3 flex items-center gap-2 rounded-2xl bg-soft-blue px-3 inset-ring-1 inset-ring-ink/10 focus-within:inset-ring-2 focus-within:inset-ring-blue">
              <span className="text-base font-bold text-muted">+91</span>
              <input
                id="phone"
                ref={phoneRef}
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={10}
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="h-12 w-full min-w-0 bg-transparent text-base font-semibold tabular-nums tracking-wide placeholder:font-normal placeholder:text-muted/60 focus:outline-none"
              />
            </div>
          </div>

          <dl className="mt-6 space-y-2 border-t border-ink/10 pt-5 text-sm">
            {selected.length === 0 ? (
              <p className="text-sm text-muted">{picker.nothingPicked}</p>
            ) : (
              <>
                <Row term="Day" value={dayLabel} />
                <Row term="Times" value={timesLabel} />
                <Row term="Players" value={String(people)} />
                {!asOwner && (
                  <Row term="Price" value={`${selected.length} × ${people} × ₹${turf.pricePerPersonPerSlot}`} muted />
                )}
                {asOwner ? (
                  /* The turf books free. No price, no total, no payment screen. */
                  <div className="rounded-2xl bg-soft-green px-4 py-3 inset-ring-1 inset-ring-green/25">
                    <p className="text-sm font-black uppercase tracking-wide text-green-deep">{owner.book.noCharge}</p>
                    <p className="mt-1 text-xs leading-5 text-ink-soft">{owner.book.noChargeNote}</p>
                  </div>
                ) : reschedule ? (
                  <>
                    <Row term="Total" value={formatRupees(total)} muted />
                    <Row term="Already paid" value={`− ${formatRupees(credit)}`} muted />
                    <div className="flex items-baseline justify-between gap-3 pt-2">
                      <dt className="text-sm font-bold uppercase tracking-wider">To pay</dt>
                      <dd className="text-2xl font-black tabular-nums">{formatRupees(due)}</dd>
                    </div>
                  </>
                ) : (
                  <div className="flex items-baseline justify-between gap-3 pt-2">
                    <dt className="text-sm font-bold uppercase tracking-wider">Total</dt>
                    <dd className="text-2xl font-black tabular-nums">{formatRupees(total)}</dd>
                  </div>
                )}
              </>
            )}
          </dl>

          {signedIn ? (
            asOwner ? (
              <Button
                type="button"
                size="lg"
                onClick={reschedule ? move : blockIt}
                disabled={busy || selected.length === 0}
                className="mt-5 w-full"
              >
                {busy
                  ? reschedule
                    ? owner.move.working
                    : owner.book.working
                  : reschedule
                    ? owner.move.cta
                    : owner.book.cta}
              </Button>
            ) : reschedule ? (
              <Button type="button" size="lg" onClick={move} disabled={busy || !enough} className="mt-5 w-full">
                {busy ? account.reschedule.working : due > 0 ? account.reschedule.ctaPay : account.reschedule.cta}
              </Button>
            ) : (
              <Button
                type="button"
                size="lg"
                onClick={pay}
                disabled={busy || selected.length === 0}
                className="mt-5 w-full"
              >
                {busy ? picker.working : picker.payCta}
              </Button>
            )
          ) : (
            <form action={signInWithGoogle.bind(null, returnTo)} className="mt-5">
              <Button type="submit" size="lg" className="w-full">
                {picker.signInCta}
              </Button>
              <p className="mt-2 text-center text-xs text-muted">{picker.signInNote}</p>
            </form>
          )}
          <p className="mt-3 text-center text-xs text-muted">
            {asOwner ? (reschedule ? owner.book.moveFootNote : owner.book.footNote) : fill(picker.holdNote, vars)}
          </p>
        </div>
      </aside>

      {/* -------------------------------------------- sticky pay bar (phone) */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-white/95 px-4 pt-3 backdrop-blur transition-transform duration-300 lg:hidden',
          selected.length ? 'translate-y-0' : 'pointer-events-none translate-y-full',
        )}
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-bold uppercase tracking-wider text-muted">
              {dayLabel} · {selected.length} times · {people} players
            </p>
            <p className="text-xl font-black leading-tight tabular-nums">
              {asOwner ? owner.book.noCharge : formatRupees(reschedule ? due : total)}
            </p>
          </div>
          {signedIn ? (
            asOwner ? (
              <Button
                type="button"
                onClick={reschedule ? move : blockIt}
                disabled={busy}
                size="lg"
                className="shrink-0 whitespace-nowrap px-6 text-sm"
                tabIndex={selected.length ? 0 : -1}
              >
                {busy ? '…' : reschedule ? owner.move.cta : owner.book.cta}
              </Button>
            ) : reschedule ? (
              <Button
                type="button"
                onClick={move}
                disabled={busy || !enough}
                size="lg"
                className="shrink-0 whitespace-nowrap px-6 text-sm"
                tabIndex={selected.length ? 0 : -1}
              >
                {busy ? account.reschedule.working : due > 0 ? 'Pay & move' : 'Move'}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={pay}
                disabled={busy}
                size="lg"
                className="shrink-0 whitespace-nowrap px-6 text-sm"
                tabIndex={selected.length ? 0 : -1}
              >
                {busy ? 'Opening…' : 'Pay now'}
              </Button>
            )
          ) : (
            <form action={signInWithGoogle.bind(null, returnTo)} className="shrink-0">
              <Button
                type="submit"
                size="lg"
                className="whitespace-nowrap px-6 text-sm"
                tabIndex={selected.length ? 0 : -1}
              >
                Sign in
              </Button>
            </form>
          )}
        </div>
      </div>
      <div aria-hidden className={cn('lg:hidden', selected.length ? 'h-24' : 'h-0')} />
    </div>
  );
}

// ------------------------------------------------------------------ bits

function Field({
  label,
  help,
  className,
  children,
}: {
  label: string;
  help?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn('min-w-0', className)}>
      <h2 className="text-lg font-black uppercase tracking-tight">{label}</h2>
      {help && <p className="mb-4 mt-1 text-sm text-muted">{help}</p>}
      {children}
    </section>
  );
}

function Step({
  sign,
  label,
  disabled,
  onClick,
}: {
  sign: string;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-xl font-black inset-ring-1 inset-ring-ink/15 transition-colors hover:bg-soft-green disabled:opacity-35 disabled:hover:bg-white"
    >
      <span aria-hidden>{sign}</span>
    </button>
  );
}

function Row({ term, value, muted = false }: { term: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={cn('shrink-0', muted ? 'text-muted' : 'font-semibold')}>{term}</dt>
      <dd className={cn('text-right', muted ? 'text-muted' : 'font-semibold')}>{value}</dd>
    </div>
  );
}
