'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import * as c from '@/content/owner';
import { cn } from '@/lib/utils';

/**
 * The date range for the ledger, as one control instead of two native inputs.
 *
 * Native `type="date"` was two separate fields, each showing `dd-mm-yyyy`
 * until you clicked it, with no idea that the two were a range and no way to
 * say "this month" without counting days. This is a single pill that reads
 * "22 Sep – 30 Sep", a month grid you can drag a range across, and the six
 * ranges anyone actually asks for.
 *
 * Dates here are plain `YYYY-MM-DD` business days and every calculation is
 * done in UTC on those strings, so nothing shifts under a timezone. The
 * chosen range is mirrored into hidden inputs, so the surrounding GET form
 * still submits it the ordinary way.
 */
export function DateRangePicker({
  from,
  to,
  today,
  onApply,
}: {
  from: string | null;
  to: string | null;
  /** The turf's today, from the server — never `new Date()` in a render. */
  today: string;
  /** Called once the owner has committed a range; submits the form. */
  onApply: (from: string | null, to: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState<string | null>(from);
  const [end, setEnd] = useState<string | null>(to);
  const [hover, setHover] = useState<string | null>(null);
  const [cursor, setCursor] = useState(() => monthStart(from ?? today));
  const wrapRef = useRef<HTMLDivElement>(null);
  const id = useId();

  /**
   * Reopening shows what is actually applied, not last time's half-made
   * choice. Done on the way in rather than in an effect: an effect would
   * render the stale range first and correct it a frame later.
   */
  function toggle() {
    if (!open) {
      setStart(from);
      setEnd(to);
      setHover(null);
      setCursor(monthStart(from ?? today));
    }
    setOpen(!open);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  const grid = useMemo(() => monthGrid(cursor), [cursor]);
  // While only one end is picked, the row under the pointer previews the rest.
  const previewEnd = end ?? (start && hover && hover > start ? hover : null);

  function pick(day: string) {
    if (!start || end) {
      setStart(day);
      setEnd(null);
      return;
    }
    if (day < start) {
      setEnd(start);
      setStart(day);
    } else {
      setEnd(day);
    }
  }

  function commit(a: string | null, b: string | null) {
    setOpen(false);
    onApply(a, b ?? a);
  }

  const label =
    from && to && from === to
      ? pretty(from)
      : from && to
        ? `${pretty(from)} – ${pretty(to)}`
        : from
          ? `${pretty(from)} →`
          : to
            ? `→ ${pretty(to)}`
            : c.filters.anyDate;

  return (
    <div ref={wrapRef} className="relative min-w-0">
      <input type="hidden" name="from" value={from ?? ''} />
      <input type="hidden" name="to" value={to ?? ''} />

      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={id}
        className={cn(
          'flex h-12 w-full min-w-0 items-center gap-2.5 rounded-2xl px-3.5 text-left transition-[box-shadow,background-color] duration-200',
          from || to
            ? 'bg-linear-to-r from-soft-green to-soft-blue inset-ring-1 inset-ring-green/35'
            : 'bg-soft-green/60 inset-ring-1 inset-ring-ink/[0.08] hover:bg-soft-green',
          open && 'inset-ring-2 inset-ring-green shadow-[0_0_0_4px_rgba(34,197,94,.12)]',
        )}
      >
        <CalendarIcon />
        <span className="min-w-0 flex-1 truncate text-[13px] font-bold tabular-nums text-ink">{label}</span>
        {(from || to) && (
          <span
            role="button"
            tabIndex={0}
            aria-label={c.filters.clearDates}
            onClick={(e) => {
              e.stopPropagation();
              commit(null, null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                commit(null, null);
              }
            }}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-white hover:text-ink"
          >
            <CrossIcon />
          </span>
        )}
        <Chevron open={open} />
      </button>

      {/* On a phone the sheet covers most of the screen, so the page behind
          it is dimmed and tapping it closes — the same gesture as the drawer.
          On a desktop the popover sits on the page and needs no veil. */}
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={cn(
          'fixed inset-0 z-40 bg-ink/35 backdrop-blur-[2px] transition-opacity duration-200 sm:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <div
        id={id}
        className={cn(
          'fixed inset-x-3 bottom-3 z-50 origin-bottom rounded-3xl bg-white p-4 shadow-[0_40px_90px_-30px_rgba(16,24,23,.5)] inset-ring-1 inset-ring-ink/10 transition-[opacity,transform] duration-200 ease-out',
          'sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-[calc(100%+8px)] sm:w-[340px] sm:origin-top-left',
          open ? 'visible scale-100 opacity-100' : 'invisible scale-95 opacity-0',
        )}
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        {/* ------------------------------------------------ quick ranges */}
        <div className="grid grid-cols-3 gap-1.5">
          {quickRanges(today).map((r) => {
            const on = from === r.from && to === r.to;
            return (
              <button
                key={r.label}
                type="button"
                onClick={() => commit(r.from, r.to)}
                className={cn(
                  'h-11 rounded-xl px-1 text-[11px] font-bold uppercase tracking-wide transition-colors',
                  on ? 'bg-ink text-white' : 'bg-soft-green/70 text-ink-soft hover:bg-mint hover:text-ink',
                )}
              >
                {r.label}
              </button>
            );
          })}
        </div>

        {/* ------------------------------------------------------ month */}
        <div className="mt-4 flex items-center justify-between">
          <Arrow dir="prev" onClick={() => setCursor(addMonths(cursor, -1))} />
          <p className="text-[13px] font-black uppercase tracking-wide">{monthLabel(cursor)}</p>
          <Arrow dir="next" onClick={() => setCursor(addMonths(cursor, 1))} />
        </div>

        <div className="mt-2 grid grid-cols-7 gap-y-1 text-center">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <span key={i} className="pb-1 text-[10px] font-bold uppercase tracking-wider text-muted">
              {d}
            </span>
          ))}

          {grid.map((day, i) => {
            // Leading blanks before the 1st: keyed by position, since they
            // have no date of their own.
            if (!day) return <span key={`blank-${i}`} />;
            const isStart = day === start;
            const isEnd = day === (end ?? previewEnd);
            const inRange = Boolean(start && previewEnd && day > start && day < previewEnd);
            const isToday = day === today;
            return (
              <button
                key={day}
                type="button"
                onClick={() => pick(day)}
                onMouseEnter={() => setHover(day)}
                aria-pressed={isStart || isEnd}
                className={cn(
                  'relative grid h-11 w-full place-items-center text-[13px] font-bold tabular-nums transition-colors',
                  inRange && 'bg-soft-green text-ink',
                  isStart && 'rounded-l-xl',
                  isEnd && 'rounded-r-xl',
                  isStart || isEnd
                    ? 'btn-gradient z-10 rounded-xl text-white'
                    : inRange
                      ? ''
                      : 'rounded-xl text-ink hover:bg-soft-blue',
                  isToday && !isStart && !isEnd && 'inset-ring-1 inset-ring-green/50',
                )}
              >
                {Number(day.slice(8))}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-ink/10 pt-3">
          <button
            type="button"
            onClick={() => commit(null, null)}
            className="inline-flex h-11 items-center rounded-full px-4 text-[12px] font-bold uppercase tracking-wide text-muted hover:text-ink"
          >
            {c.filters.clearDates}
          </button>
          <button
            type="button"
            onClick={() => commit(start, end)}
            disabled={!start}
            className="btn-gradient inline-flex h-11 items-center rounded-full px-6 text-[12px] font-bold uppercase tracking-wide text-white disabled:opacity-40"
          >
            {c.filters.apply}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------- pure date helpers
// Business days are plain YYYY-MM-DD strings. Everything below works on them
// in UTC, so no local timezone can shift a day.

const asDate = (key: string) => new Date(`${key}T00:00:00.000Z`);
const asKey = (d: Date) => d.toISOString().slice(0, 10);

function addDays(key: string, n: number): string {
  const d = asDate(key);
  d.setUTCDate(d.getUTCDate() + n);
  return asKey(d);
}

function monthStart(key: string): string {
  return `${key.slice(0, 7)}-01`;
}

function addMonths(key: string, n: number): string {
  const d = asDate(monthStart(key));
  d.setUTCMonth(d.getUTCMonth() + n);
  return asKey(d);
}

function monthEnd(key: string): string {
  return addDays(addMonths(monthStart(key), 1), -1);
}

/** The visible grid: leading blanks, then every day of the month. */
function monthGrid(cursor: string): Array<string | null> {
  const first = monthStart(cursor);
  const blanks = asDate(first).getUTCDay();
  const days = Number(monthEnd(cursor).slice(8));
  return [
    ...Array.from({ length: blanks }, () => null),
    ...Array.from({ length: days }, (_, i) => addDays(first, i)),
  ];
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT = MONTHS.map((m) => m.slice(0, 3));

const monthLabel = (key: string) => `${MONTHS[asDate(key).getUTCMonth()]} ${key.slice(0, 4)}`;
const pretty = (key: string) => `${Number(key.slice(8))} ${SHORT[asDate(key).getUTCMonth()]}`;

function quickRanges(today: string) {
  return [
    { label: c.filters.quick.today, from: today, to: today },
    { label: c.filters.quick.week, from: today, to: addDays(today, 6) },
    { label: c.filters.quick.last7, from: addDays(today, -6), to: today },
    { label: c.filters.quick.month, from: monthStart(today), to: monthEnd(today) },
    { label: c.filters.quick.lastMonth, from: monthStart(addMonths(today, -1)), to: monthEnd(addMonths(today, -1)) },
    { label: c.filters.quick.last30, from: addDays(today, -29), to: today },
  ];
}

// ---------------------------------------------------------------- icons

function CalendarIcon() {
  return (
    <svg aria-hidden width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="shrink-0 text-green-deep">
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg aria-hidden width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('shrink-0 text-muted transition-transform duration-200', open && 'rotate-180')}
    >
      <path d="M5 9l7 7 7-7" />
    </svg>
  );
}

function Arrow({ dir, onClick }: { dir: 'prev' | 'next'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === 'prev' ? 'Previous month' : 'Next month'}
      className="grid h-11 w-11 place-items-center rounded-full text-ink-soft transition-colors hover:bg-soft-green hover:text-ink"
    >
      <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {dir === 'prev' ? <path d="M15 5l-7 7 7 7" /> : <path d="M9 5l7 7-7 7" />}
      </svg>
    </button>
  );
}
