import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import type { Turf } from '@/generated/prisma/client';
import { Ledger } from '@/components/owner/Ledger';
import { LedgerSkeleton } from '@/components/owner/LedgerSkeleton';
import { LedgerNavProvider, NavLink, PendingVeil } from '@/components/owner/LedgerNav';
import { LedgerFilters } from '@/components/owner/LedgerFilters';
import { StatStrip } from '@/components/owner/StatStrip';
import { ButtonLink, Eyebrow, Lead, Section } from '@/components/ui';
import { fill } from '@/content/home';
import * as c from '@/content/owner';
import { getTurf, listOwnerBookings } from '@/lib/bookings';
import { activePreset, ownerHref, ownerParams } from '@/lib/owner-url';
import { VISIBLE_DAYS, visibleDateKeys } from '@/lib/slots';
import type { OwnerQuery } from '@/lib/types';
import { OWNER_PAGE_SIZES, parseOwnerQuery } from '@/lib/validation';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Every booking',
  robots: { index: false, follow: false },
};

/**
 * The owner desk: every booking the turf has ever taken, filtered from the
 * URL. A server component — the table, the counts and the money all come from
 * one round trip, and there is no client-side store to fall out of step with
 * what is on screen.
 */
export default async function OwnerDeskPage({ searchParams }: PageProps<'/owner'>) {
  const sp = await searchParams;
  const turf = await getTurf();
  if (!turf) notFound();

  const query: OwnerQuery = parseOwnerQuery(sp);
  const now = new Date();
  const week = visibleDateKeys(now, VISIBLE_DAYS);

  return (
    <>
      {/* ═══════════════════════════════════════════════════ header */}
      <Section tone="arena" className="pb-8 pt-28 sm:pb-10 sm:pt-36">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
          <div className="min-w-0">
            <Eyebrow>
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-green" />
              {c.desk.eyebrow}
            </Eyebrow>
            <h1 className="mt-3 text-[2.4rem] font-black uppercase leading-[0.95] tracking-tight sm:text-6xl">
              {c.desk.h1}
            </h1>
            <Lead>{fill(c.desk.lead, { turf: turf.name })}</Lead>
          </div>
          <ButtonLink href="/owner/book" size="lg" className="w-full sm:w-auto">
            + {c.desk.freeBooking}
          </ButtonLink>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════ the desk */}
      <Section tone="white" className="py-8 sm:py-10">
        <LedgerNavProvider>
          <LedgerFilters
            query={query}
            today={week[0]}
            weekEnd={week[week.length - 1]}
            active={activePreset(query, week[0], week[week.length - 1])}
          />

          {/*
            Two layers of "this is loading", because they cover different
            moments. The keyed boundary below shows the skeleton on the first
            arrival at a view. The veil around it covers every change after
            that — React suppresses a Suspense fallback for content already on
            screen when the update is a transition, which is exactly what a
            filter change is.
          */}
          <PendingVeil>
            <Suspense key={ownerParams(query).toString()} fallback={<LedgerSkeleton rows={Math.min(query.pageSize, 8)} />}>
              <Results turf={turf} query={query} now={now} />
            </Suspense>
          </PendingVeil>
        </LedgerNavProvider>
      </Section>
    </>
  );
}

/** The part that actually waits on the database. */
async function Results({ turf, query, now }: { turf: Turf; query: OwnerQuery; now: Date }) {
  const { rows, totals, page, pages } = await listOwnerBookings(turf, query, now);
  const filtered = Boolean(query.q || query.from || query.to || query.status !== 'all');
  const empty = filtered ? c.empty : c.empty.none;

  return (
    <>
      <div className="mt-6">
        <StatStrip totals={totals} />
      </div>

      <div className="mt-6">
        {rows.length === 0 ? (
          <div className="rounded-3xl bg-soft-green p-8 text-center inset-ring-1 inset-ring-green/20 sm:p-12">
            <h2 className="text-xl font-black uppercase tracking-tight">{empty.title}</h2>
            <p className="mx-auto mt-3 max-w-md text-[15px] leading-7 text-ink-soft">{empty.body}</p>
            <ButtonLink href={filtered ? '/owner' : '/owner/book'} size="lg" className="mt-6 w-full sm:w-auto">
              {empty.cta}
            </ButtonLink>
          </div>
        ) : (
          <>
            <Ledger rows={rows} serverNow={now.toISOString()} />
            <Pager query={query} page={page} pages={pages} entries={totals.entries} />
          </>
        )}
      </div>
    </>
  );
}

/**
 * Prev / Next with the page named between them, and the page size beside it.
 * Deliberately not numbered pages: on a phone that is a row of 30 px targets,
 * and nobody navigates a ledger by page number anyway.
 */
function Pager({ query, page, pages, entries }: { query: OwnerQuery; page: number; pages: number; entries: number }) {
  const first = (page - 1) * query.pageSize + 1;
  const last = Math.min(entries, page * query.pageSize);

  return (
    <nav
      aria-label="Pages"
      className="mt-5 flex flex-col gap-4 border-t border-ink/10 pt-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-xs font-semibold text-muted">
        {c.filters.showing} <span className="font-black tabular-nums text-ink">{first}–{last}</span> of{' '}
        <span className="font-black tabular-nums text-ink">{entries.toLocaleString('en-IN')}</span>
      </p>

      <div className="flex items-center gap-1.5">
        <span className="mr-1 hidden text-[10px] font-bold uppercase tracking-[0.14em] text-muted sm:inline">
          {c.filters.perPage}
        </span>
        {OWNER_PAGE_SIZES.map((size) => (
          <NavLink
            key={size}
            href={ownerHref(query, { pageSize: size, page: 1 })}
            aria-current={query.pageSize === size ? 'true' : undefined}
            className={cn(
              'grid h-11 min-w-11 place-items-center rounded-full px-2.5 text-[13px] font-bold tabular-nums transition-colors',
              query.pageSize === size ? 'bg-ink text-white' : 'text-ink-soft hover:bg-soft-green',
            )}
          >
            {size}
          </NavLink>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <Step href={page > 1 ? ownerHref(query, { page: page - 1 }) : null} label={c.actions.prev} dir="prev" />
        <span className="px-1 text-[13px] font-bold tabular-nums">
          {fill(c.actions.pageOf, { page, pages })}
        </span>
        <Step href={page < pages ? ownerHref(query, { page: page + 1 }) : null} label={c.actions.next} dir="next" />
      </div>
    </nav>
  );
}

function Step({ href, label, dir }: { href: string | null; label: string; dir: 'prev' | 'next' }) {
  const body = (
    <>
      {dir === 'prev' && <Arrow dir="prev" />}
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{label}</span>
      {dir === 'next' && <Arrow dir="next" />}
    </>
  );
  const cls =
    'inline-flex h-12 items-center gap-2 rounded-full px-5 text-[13px] font-bold uppercase tracking-wide transition-colors';
  if (!href) {
    return (
      <span aria-disabled className={cn(cls, 'cursor-not-allowed text-muted/50 inset-ring-1 inset-ring-ink/[0.06]')}>
        {body}
      </span>
    );
  }
  return (
    <NavLink href={href} className={cn(cls, 'bg-white text-ink inset-ring-1 inset-ring-ink/10 hover:bg-soft-green')}>
      {body}
    </NavLink>
  );
}

function Arrow({ dir }: { dir: 'prev' | 'next' }) {
  return (
    <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      {dir === 'prev' ? <path d="M15 5l-7 7 7 7" /> : <path d="M9 5l7 7-7 7" />}
    </svg>
  );
}
