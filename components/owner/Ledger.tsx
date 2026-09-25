'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fragment, useState } from 'react';
import { CancelPanel } from '@/components/owner/CancelPanel';
import * as c from '@/content/owner';
import { fill } from '@/content/home';
import { businessDateKeyOf, describeSlots, formatDateKey, formatDateTime, formatRange } from '@/lib/slots';
import type { OwnerBookingDTO } from '@/lib/types';
import { cn, formatRupees } from '@/lib/utils';

/**
 * The turf's history, one page of it.
 *
 * Two renderings of the same rows rather than one that bends: a real table
 * from `lg` up, where scanning down a column is the whole point, and stacked
 * cards below it, because a six-column table on a 360 px phone is a sideways
 * scroll and a lie. Every figure appears in both.
 *
 * `serverNow` is passed in rather than read from the browser so the first
 * paint and the hydrated one agree about what counts as already played.
 */
export function Ledger({ rows, serverNow }: { rows: OwnerBookingDTO[]; serverNow: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const router = useRouter();
  const nowMs = new Date(serverNow).getTime();

  function done(message: string) {
    setCancelling(null);
    setNotice(message);
    // Re-read from the server: the row flips to Cancelled, the totals above
    // it move, and those times go back on the board for everyone else.
    router.refresh();
  }

  return (
    <div className="min-w-0">
      <p
        role="status"
        aria-live="polite"
        className={cn(
          'mb-4 rounded-2xl px-4 py-3 text-sm font-semibold',
          notice ? 'bg-soft-green text-ink inset-ring-1 inset-ring-green/25' : 'sr-only',
        )}
      >
        {notice}
      </p>

      {/* ══════════════════════════════════════════════ table (lg and up) */}
      <div className="hidden overflow-x-auto rounded-3xl bg-white inset-ring-1 inset-ring-ink/[0.07] lg:block">
        <table className="w-full min-w-[940px] border-collapse text-left">
          <thead>
            <tr className="border-b border-ink/10 bg-white/60">
              <Th className="pl-5">{c.table.when}</Th>
              <Th>{c.table.customer}</Th>
              <Th className="text-center">{c.table.players}</Th>
              <Th className="text-right">{c.table.amount}</Th>
              <Th>{c.table.paid}</Th>
              <Th>{c.table.status}</Th>
              <Th className="pr-5 text-right">{c.table.actions}</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/[0.07]">
            {rows.map((b) => {
              const state = stateOf(b, nowMs);
              const expanded = open === b.id;
              const showCancel = cancelling === b.id;
              return (
                <Fragment key={b.id}>
                  <tr className={cn('align-top transition-colors', expanded ? 'bg-soft-green/50' : 'hover:bg-soft-green/30')}>
                    <td className="py-4 pl-5 pr-3">
                      <p className="font-black tracking-tight">{dayOf(b)}</p>
                      <p className="mt-0.5 text-[13px] font-semibold text-ink-soft">{timesOf(b)}</p>
                    </td>
                    <td className="px-3 py-4">
                      <p className="font-bold">{nameOf(b)}</p>
                      <p className="mt-0.5 text-[13px] tabular-nums text-ink-soft">{b.customer.phone ?? '—'}</p>
                      <p className="truncate text-[12px] text-muted">{b.customer.email}</p>
                    </td>
                    <td className="px-3 py-4 text-center text-base font-black tabular-nums">{b.numPeople}</td>
                    <td className="px-3 py-4 text-right">
                      <Money b={b} />
                    </td>
                    <td className="px-3 py-4">
                      <p className="text-[13px] font-bold">{methodOf(b)}</p>
                      {b.transactionId && (
                        <p className="mt-0.5 font-mono text-[11px] text-muted">{b.transactionId}</p>
                      )}
                    </td>
                    <td className="px-3 py-4">
                      <Pill state={state} />
                      <Alarm b={b} />
                    </td>
                    <td className="py-4 pl-3 pr-5">
                      <div className="flex items-center justify-end gap-1.5">
                        {!showCancel && (
                          <>
                            {/* Nothing to move until it is paid for. */}
                            {b.movable && (
                              <Link
                                href={`/owner/book?reschedule=${b.id}`}
                                className="inline-flex h-11 items-center rounded-full bg-soft-blue px-4 text-[13px] font-bold text-ink inset-ring-1 inset-ring-blue/30 transition-colors hover:bg-sky"
                              >
                                {c.actions.move}
                              </Link>
                            )}
                            {b.cancellable && (
                            <button
                              type="button"
                              onClick={() => {
                                setNotice(null);
                                setOpen(b.id);
                                setCancelling(b.id);
                              }}
                              className="inline-flex h-11 items-center rounded-full px-4 text-[13px] font-bold text-rose-600 inset-ring-1 inset-ring-rose-200 transition-colors hover:bg-rose-50"
                            >
                              {c.actions.cancel}
                            </button>
                            )}
                          </>
                        )}
                        <Chevron expanded={expanded} onClick={() => setOpen(expanded ? null : b.id)} id={b.id} />
                      </div>
                    </td>
                  </tr>

                  {(expanded || showCancel) && (
                    <tr className="bg-soft-green/30">
                      <td colSpan={7} className="px-5 pb-5">
                        {expanded && <Details b={b} />}
                        {showCancel && (
                          <div className="mt-4">
                            <CancelPanel b={b} onClose={() => setCancelling(null)} onDone={done} />
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ═══════════════════════════════════════════ cards (below lg) */}
      <ul className="space-y-3 lg:hidden">
        {rows.map((b) => {
          const state = stateOf(b, nowMs);
          const expanded = open === b.id;
          const showCancel = cancelling === b.id;
          return (
            <li key={b.id}>
              <article className="min-w-0 rounded-3xl bg-white p-4 inset-ring-1 inset-ring-ink/[0.07] shadow-[0_18px_44px_-38px_rgba(16,24,23,.6)]">
                <header className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-lg font-black uppercase leading-tight tracking-tight">{dayOf(b)}</h3>
                    <p className="mt-0.5 text-[13px] font-semibold text-ink-soft">{timesOf(b)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Pill state={state} />
                    <Alarm b={b} />
                  </div>
                </header>

                <div className="mt-3 flex items-end justify-between gap-3 border-t border-ink/[0.07] pt-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{nameOf(b)}</p>
                    <a
                      href={b.customer.phone ? `tel:${b.customer.phone}` : undefined}
                      className="mt-0.5 inline-flex min-h-11 items-center text-[13px] font-semibold tabular-nums text-green-deep underline underline-offset-4"
                    >
                      {b.customer.phone ?? '—'}
                    </a>
                    <p className="truncate text-[12px] text-muted">{b.numPeople} players</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Money b={b} />
                    <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-muted">{methodOf(b)}</p>
                  </div>
                </div>

                {expanded && (
                  <div className="mt-4 border-t border-ink/[0.07] pt-4">
                    <Details b={b} />
                  </div>
                )}

                {showCancel ? (
                  <div className="mt-4">
                    <CancelPanel b={b} onClose={() => setCancelling(null)} onDone={done} />
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {/* Nothing to move until it is paid for — a booking still
                        waiting on payment gets Cancel and nothing else. */}
                    {b.movable && (
                      <Link
                        href={`/owner/book?reschedule=${b.id}`}
                        className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-soft-blue px-5 text-[13px] font-bold uppercase tracking-wide text-ink inset-ring-1 inset-ring-blue/30"
                      >
                        {c.actions.move}
                      </Link>
                    )}
                    {b.cancellable && (
                      <button
                        type="button"
                        onClick={() => {
                          setNotice(null);
                          setCancelling(b.id);
                        }}
                        className="inline-flex h-11 flex-1 items-center justify-center rounded-full px-5 text-[13px] font-bold uppercase tracking-wide text-rose-600 inset-ring-1 inset-ring-rose-200"
                      >
                        {c.actions.cancel}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setOpen(expanded ? null : b.id)}
                      aria-expanded={expanded}
                      className={cn(
                        'inline-flex h-11 items-center justify-center gap-1.5 rounded-full px-4 text-[13px] font-bold uppercase tracking-wide text-ink-soft inset-ring-1 inset-ring-ink/10',
                        !b.cancellable && 'flex-1',
                      )}
                    >
                      {expanded ? c.actions.hide : c.actions.details}
                      <ChevronIcon expanded={expanded} />
                    </button>
                  </div>
                )}
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ------------------------------------------------------------------ bits

type State = 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'PLAYED';

function stateOf(b: OwnerBookingDTO, nowMs: number): State {
  if (b.status === 'CANCELLED') return 'CANCELLED';
  if (b.status === 'PENDING') return 'PENDING';
  return new Date(b.startsAt).getTime() < nowMs ? 'PLAYED' : 'CONFIRMED';
}

const dayOf = (b: OwnerBookingDTO) => formatDateKey(businessDateKeyOf(new Date(b.startsAt)));
const timesOf = (b: OwnerBookingDTO) =>
  b.slotStarts.length
    ? describeSlots(b.slotStarts.map((s) => new Date(s)))
    : formatRange(new Date(b.startsAt), new Date(b.endsAt));
const nameOf = (b: OwnerBookingDTO) => b.customer.name?.trim() || b.customer.email.split('@')[0];
// A block the turf made says so under its amount already; repeating "no
// charge" in the payment column just takes up room.
const methodOf = (b: OwnerBookingDTO) =>
  b.bookedByOwner && b.totalAmount === 0
    ? '—'
    : b.paymentMethod
      ? (c.methods[b.paymentMethod] ?? b.paymentMethod)
      : '—';

const TONE: Record<State, string> = {
  CONFIRMED: 'bg-soft-green text-green-deep inset-ring-green/25',
  PENDING: 'bg-amber-50 text-amber-700 inset-ring-amber-200',
  CANCELLED: 'bg-rose-50 text-rose-600 inset-ring-rose-200',
  PLAYED: 'bg-ink/[0.05] text-muted inset-ring-ink/10',
};

function Pill({ state }: { state: State }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] inset-ring-1',
        TONE[state],
      )}
    >
      {c.status[state].label}
    </span>
  );
}

/**
 * A refund the gateway refused is money still sitting with the turf that
 * somebody is owed — the one thing on this page nobody should have to open a
 * row to discover. It rides next to the status rather than inside Details.
 */
function Alarm({ b }: { b: OwnerBookingDTO }) {
  if (b.refundStatus !== 'FAILED') return null;
  return (
    <span className="mt-1.5 flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-[0.08em] text-rose-600">
      <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
        <path d="M12 8v5M12 17h.01" />
        <path d="M10.3 3.9 2.4 17.4A2 2 0 0 0 4.1 20.4h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      </svg>
      {c.table.refundFailed}
    </span>
  );
}

/**
 * The amount, and — only when they differ — the cash actually taken. After
 * an owner move the booking can be worth more than was ever charged, and a
 * card that quietly showed the larger figure as "paid" would not survive
 * meeting the customer's bank statement.
 */
function Money({ b }: { b: OwnerBookingDTO }) {
  const block = b.bookedByOwner && b.totalAmount === 0;
  const covered = b.totalAmount - b.collected;
  return (
    <>
      {/* A block the turf made is priced at nothing, but it is still holding
          times that could have been sold — so the figure is what it holds,
          with a word beneath it so nobody reads it as money taken. */}
      <p className={cn('text-base font-black tabular-nums', block && 'text-ink-soft')}>{formatRupees(b.value)}</p>
      {block ? (
        <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-blue-deep">{c.table.ownerBlock}</p>
      ) : (
        covered > 0 && (
          <p className="mt-0.5 text-[11px] font-semibold text-muted">
            {fill(c.table.covered, { paid: formatRupees(b.collected), covered: formatRupees(covered) })}
          </p>
        )
      )}
    </>
  );
}

function Details({ b }: { b: OwnerBookingDTO }) {
  const refunded = (b.refundAmount ?? 0) > 0;
  return (
    <dl className="grid gap-x-6 gap-y-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
      <Item term={c.table.reference} value={b.id.slice(-6).toUpperCase()} mono />
      <Item term={c.table.booked} value={formatDateTime(new Date(b.createdAt))} />
      <Item term={c.table.transaction} value={b.transactionId ?? '—'} mono />
      <Item term={c.table.order} value={b.orderId ?? '—'} mono />
      <Item term={c.table.customer} value={b.customer.email} />
      {b.status === 'CANCELLED' && (
        <Item
          term={c.table.cancelled}
          value={`${b.cancelledAt ? formatDateTime(new Date(b.cancelledAt)) : '—'}${
            b.cancelReason ? ` · ${c.cancelReasons[b.cancelReason] ?? b.cancelReason}` : ''
          }`}
          wide
        />
      )}
      {refunded && (
        <Item
          term={c.table.refund}
          value={`${formatRupees(b.refundAmount ?? 0)} · ${
            b.refundMethod === 'GATEWAY' ? 'back the way they paid' : 'sent by the turf'
          }${b.refundStatus === 'FAILED' ? ' · FAILED, send it manually' : b.refundStatus === 'PENDING' ? ' · on its way' : ''}${
            b.refundReference ? ` · ${b.refundReference}` : ''
          }`}
          wide
        />
      )}
      {b.rescheduledFromId && <Item term={c.table.movedFrom} value={b.rescheduledFromId.slice(-6).toUpperCase()} mono />}
      {b.rescheduledToId && <Item term={c.table.movedTo} value={b.rescheduledToId.slice(-6).toUpperCase()} mono />}
    </dl>
  );
}

function Item({ term, value, mono = false, wide = false }: { term: string; value: string; mono?: boolean; wide?: boolean }) {
  return (
    <div className={cn('min-w-0', wide && 'min-[420px]:col-span-2')}>
      <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{term}</dt>
      <dd className={cn('mt-0.5 break-words text-[13px] font-semibold text-ink', mono && 'font-mono text-[12px]')}>
        {value}
      </dd>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn('px-3 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted', className)}
    >
      {children}
    </th>
  );
}

function Chevron({ expanded, onClick, id }: { expanded: boolean; onClick: () => void; id: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      aria-label={expanded ? c.actions.hide : c.actions.details}
      aria-controls={`row-${id}`}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-white hover:text-ink"
    >
      <ChevronIcon expanded={expanded} />
    </button>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      aria-hidden
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('transition-transform duration-200', expanded && 'rotate-180')}
    >
      <path d="M5 9l7 7 7-7" />
    </svg>
  );
}
