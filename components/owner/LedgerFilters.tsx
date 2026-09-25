'use client';

import { useEffect, useRef, useState } from 'react';
import { DateRangePicker } from '@/components/owner/DateRangePicker';
import { NavLink, useLedgerNav } from '@/components/owner/LedgerNav';
import * as c from '@/content/owner';
import { fill } from '@/content/home';
import { ownerExportHref, ownerHref, presetQuery, type PresetKey } from '@/lib/owner-url';
import { formatDateKey } from '@/lib/slots';
import type { OwnerQuery } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * The filter bar. A real `<form method="get">` pointed at this same page, so
 * it works before hydration and with JS off; the JavaScript adds tidier URLs
 * (empty fields dropped), a `/` shortcut to the search box, the date picker,
 * and a visible pending state while the new page is on its way.
 *
 * Nothing here holds filter state. The URL is the state — which is why the
 * back button walks your filters, a view can be bookmarked, and the download
 * link carries the exact query the table was built from.
 */
export function LedgerFilters({
  query,
  today,
  weekEnd,
  active,
}: {
  query: OwnerQuery;
  today: string;
  weekEnd: string;
  active: PresetKey | null;
}) {
  const { pending, go: navigate } = useLedgerNav();
  const [text, setText] = useState(query.q ?? '');
  const [lastApplied, setLastApplied] = useState(query.q);
  const searchRef = useRef<HTMLInputElement>(null);

  // The URL is the truth: when it changes underneath (the back button, a
  // preset, a cleared chip) the box follows it rather than keeping a stale
  // word. Adjusted during render rather than in an effect, so the input never
  // paints the old text for a frame first.
  if (lastApplied !== query.q) {
    setLastApplied(query.q);
    setText(query.q ?? '');
  }

  // `/` jumps to search, the way every list tool people already use behaves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return;
      e.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  /** Every navigation from this bar goes through the shared transition. */
  function go(patch: Partial<OwnerQuery>) {
    navigate(ownerHref(query, { ...patch, page: 1 }));
  }

  const chips = activeChips(query);

  return (
    <div className="min-w-0">
      <form
        method="get"
        action="/owner"
        onSubmit={(e) => {
          e.preventDefault();
          go({ q: text.trim() || null });
        }}
        className={cn(
          'rounded-3xl bg-white p-3 inset-ring-1 inset-ring-ink/[0.07] shadow-[0_24px_60px_-48px_rgba(16,24,23,.7)] transition-opacity sm:p-4',
          pending && 'opacity-80',
        )}
      >
        {query.status !== 'all' && <input type="hidden" name="status" value={query.status} />}

        <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_260px_auto]">
          {/* --------------------------------------------------- search */}
          <div className="min-w-0">
            <label htmlFor="ledger-q" className="sr-only">
              {c.filters.searchLabel}
            </label>
            <div
              className={cn(
                'flex h-12 items-center gap-2 rounded-2xl bg-soft-blue/70 px-3.5 transition-[box-shadow,background-color] duration-200',
                'inset-ring-1 inset-ring-ink/[0.08] focus-within:bg-soft-blue focus-within:inset-ring-2 focus-within:inset-ring-blue',
                'focus-within:shadow-[0_0_0_4px_rgba(56,189,248,.14)]',
              )}
            >
              {pending ? <Spinner /> : <SearchIcon />}
              <input
                id="ledger-q"
                ref={searchRef}
                // Deliberately not type="search": the browser adds its own
                // clear button, and two × in one field is one too many.
                type="text"
                name="q"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={c.filters.searchPlaceholder}
                autoComplete="off"
                className="h-full w-full min-w-0 bg-transparent text-base font-medium outline-hidden placeholder:font-normal placeholder:text-muted/70"
              />
              {text && (
                <button
                  type="button"
                  onClick={() => {
                    setText('');
                    if (query.q) go({ q: null });
                    searchRef.current?.focus();
                  }}
                  aria-label={c.filters.clearSearch}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-white hover:text-ink"
                >
                  <CrossIcon />
                </button>
              )}
            </div>
          </div>

          {/* ---------------------------------------------------- dates */}
          <DateRangePicker
            from={query.from}
            to={query.to}
            today={today}
            onApply={(from, to) => go({ from, to })}
          />

          {/* -------------------------------------------------- actions */}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={pending}
              className="btn-gradient inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl px-6 text-sm font-bold uppercase tracking-wide text-white transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 lg:flex-none"
            >
              {pending && <Spinner light />}
              {c.filters.apply}
            </button>
            <a
              href={ownerExportHref(query)}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-ink px-5 text-sm font-bold uppercase tracking-wide text-white transition-transform hover:-translate-y-0.5 active:translate-y-0 lg:flex-none"
              title={c.desk.downloadHint}
            >
              <DownloadIcon />
              {c.desk.download}
            </a>
          </div>
        </div>

        <p className="mt-2 px-1 text-[11px] text-muted">{c.filters.dateHint}</p>
      </form>

      {/* ------------------------------------------------------- presets */}
      <div className="snap-strip -mx-5 mt-4 flex gap-2 px-5 sm:mx-0 sm:px-0">
        {c.filters.presets.map((p) => {
          const on = active === (p.key as PresetKey);
          return (
            <NavLink
              key={p.key}
              href={ownerHref(presetQuery(p.key as PresetKey, today, weekEnd))}
              aria-current={on ? 'true' : undefined}
              className={cn(
                'inline-flex h-11 shrink-0 snap-start items-center rounded-full px-4 text-[13px] font-bold uppercase tracking-wide transition-all duration-200',
                on
                  ? 'bg-ink text-white shadow-[0_10px_24px_-14px_rgba(16,24,23,.9)]'
                  : 'bg-white text-ink-soft inset-ring-1 inset-ring-ink/10 hover:-translate-y-0.5 hover:bg-soft-green hover:text-ink',
              )}
            >
              {p.label}
            </NavLink>
          );
        })}
      </div>

      {/* --------------------------------------------------- active chips */}
      {chips.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <NavLink
              key={chip.label}
              href={ownerHref(query, chip.clears)}
              className="group inline-flex min-h-11 items-center gap-2 rounded-full bg-soft-green px-3.5 py-1.5 text-xs font-bold text-ink inset-ring-1 inset-ring-green/25 transition-colors hover:bg-mint"
            >
              {chip.label}
              <span aria-hidden className="text-green-deep group-hover:text-ink">
                <CrossIcon size={12} />
              </span>
              <span className="sr-only">— {c.filters.chip.remove}</span>
            </NavLink>
          ))}
          <NavLink
            href="/owner"
            className="inline-flex min-h-11 items-center px-2 text-xs font-bold uppercase tracking-wide text-muted underline underline-offset-4 hover:text-ink"
          >
            {c.filters.clear}
          </NavLink>
        </div>
      )}
    </div>
  );
}

/** Each chip says what is being filtered and links to the view without it. */
function activeChips(q: OwnerQuery): Array<{ label: string; clears: Partial<OwnerQuery> }> {
  const chips: Array<{ label: string; clears: Partial<OwnerQuery> }> = [];
  if (q.q) chips.push({ label: fill(c.filters.chip.search, { value: q.q }), clears: { q: null } });

  if (q.from && q.to && q.from === q.to) {
    chips.push({ label: fill(c.filters.chip.on, { value: formatDateKey(q.from) }), clears: { from: null, to: null } });
  } else if (q.from && q.to) {
    chips.push({
      label: fill(c.filters.chip.range, { from: formatDateKey(q.from), to: formatDateKey(q.to) }),
      clears: { from: null, to: null },
    });
  } else if (q.from) {
    chips.push({ label: fill(c.filters.chip.from, { value: formatDateKey(q.from) }), clears: { from: null } });
  } else if (q.to) {
    chips.push({ label: fill(c.filters.chip.to, { value: formatDateKey(q.to) }), clears: { to: null } });
  }

  const status = c.filters.chip.status[q.status];
  if (status) chips.push({ label: status, clears: { status: 'all' } });
  return chips;
}

function Spinner({ light = false }: { light?: boolean }) {
  return (
    <svg
      aria-hidden
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      className={cn('shrink-0 animate-spin', light ? 'text-white/80' : 'text-green-deep')}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity=".25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="shrink-0 text-muted">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

function CrossIcon({ size = 14 }: { size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}
