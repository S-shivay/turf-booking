'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui';
import * as c from '@/content/account';
import { fill } from '@/content/home';
import { ApiError, apiJson } from '@/lib/loading';
import { CHANGE_WINDOW_HOURS, describeSlots, formatDateTime, formatRange } from '@/lib/slots';
import type { MyBookingDTO } from '@/lib/types';
import { cn, formatRupees } from '@/lib/utils';

/**
 * The customer's bookings, newest game first.
 *
 * Cancel and reschedule appear only while the game is more than
 * CHANGE_WINDOW_HOURS away — and the server checks that again, because a card
 * rendered an hour ago is not evidence of anything. `serverNow` is passed in
 * rather than read from the browser so the first paint and the hydrated one
 * agree about what counts as past.
 */
export function BookingList({ bookings, serverNow, turfPhone }: {
  bookings: MyBookingDTO[];
  serverNow: string;
  turfPhone: string;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const router = useRouter();
  const nowMs = new Date(serverNow).getTime();

  // Render the server's list directly. Copying it into `useState` would snapshot
  // it on first mount and ignore every update after that — a booking made in
  // another tab, or the refresh below — leaving a correct server response
  // invisible in the browser.
  const items = bookings;

  async function cancel(b: MyBookingDTO) {
    setBusy(b.id);
    setNotice(null);
    try {
      const res = await apiJson<{ refundMethod: string | null; refundAmount: number | null }>(
        `/api/bookings/${b.id}/customer-cancel`,
        { method: 'POST' },
      );
      setConfirming(null);
      setNotice(
        fill(c.hints.cancelled, {
          refund: res.refundMethod === 'GATEWAY' ? c.hints.refundOnWay : c.hints.refundNone,
        }),
      );
      // Re-render from the server: the card flips to Cancelled and the board
      // on /book shows those times free again. Awaited so the button stays on
      // "Cancelling…" until the truth has actually landed.
      router.refresh();
    } catch (err) {
      setConfirming(null);
      if (err instanceof ApiError) {
        setNotice(
          err.code === 'VALIDATION'
            ? err.message
            : err.code === 'UNAUTHENTICATED'
              ? c.hints.signedOut
              : c.hints.generic,
        );
      } else {
        setNotice(c.hints.generic);
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-w-0">
      <p
        role="status"
        aria-live="polite"
        className={cn(
          'mb-6 rounded-2xl px-4 py-3 text-sm font-medium',
          notice ? 'bg-soft-green text-ink inset-ring-1 inset-ring-green/25' : 'sr-only',
        )}
      >
        {notice}
      </p>

      <ul className="space-y-5">
        {items.map((b) => (
          <li key={b.id}>
            <BookingCard
              b={b}
              nowMs={nowMs}
              turfPhone={turfPhone}
              busy={busy === b.id}
              confirming={confirming === b.id}
              onAskCancel={() => {
                setNotice(null);
                setConfirming(confirming === b.id ? null : b.id);
              }}
              onCancel={() => cancel(b)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

const TONE: Record<string, string> = {
  CONFIRMED: 'bg-soft-green text-green-deep inset-ring-green/25',
  PENDING: 'bg-amber-50 text-amber-700 inset-ring-amber-200',
  CANCELLED: 'bg-rose-50 text-rose-600 inset-ring-rose-200',
  PAST: 'bg-ink/[0.05] text-muted inset-ring-ink/10',
};

function BookingCard({
  b,
  nowMs,
  turfPhone,
  busy,
  confirming,
  onAskCancel,
  onCancel,
}: {
  b: MyBookingDTO;
  nowMs: number;
  turfPhone: string;
  busy: boolean;
  confirming: boolean;
  onAskCancel: () => void;
  onCancel: () => void;
}) {
  const start = new Date(b.startsAt);
  const end = new Date(b.endsAt);
  const played = b.status === 'CONFIRMED' && start.getTime() < nowMs;
  const key = played ? 'PAST' : b.status;
  const state = c.status[key];
  const refunded = b.refundMethod === 'GATEWAY' && (b.refundAmount ?? 0) > 0;

  return (
    <article className="min-w-0 rounded-3xl bg-white p-5 inset-ring-1 inset-ring-ink/[0.08] shadow-[0_20px_50px_-34px_rgba(16,24,23,.35)] sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-black uppercase tracking-tight sm:text-2xl">{formatDateTime(start)}</h2>
          <p className="mt-1 text-sm font-semibold text-ink-soft">{formatRange(start, end)}</p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] inset-ring-1',
            TONE[key],
          )}
        >
          {state.label}
        </span>
      </header>

      <p className="mt-2 text-sm text-muted">{state.note}</p>

      {b.rescheduledFromId && <Trail text={c.labels.movedFrom} />}
      {b.rescheduledToId && <Trail text={c.labels.movedTo} />}

      <dl className="mt-5 grid gap-x-6 gap-y-4 border-t border-ink/10 pt-5 min-[420px]:grid-cols-2">
        <Detail term={c.labels.times} value={describeSlots(b.slotStarts.map((s) => new Date(s)))} />
        <Detail term={c.labels.players} value={`${b.numPeople} players`} />
        <Detail
          term={b.status === 'PENDING' ? c.labels.due : c.labels.paid}
          value={b.bookedByOwner && b.totalAmount === 0 ? 'No charge' : formatRupees(b.totalAmount)}
          // The turf can move a booking into a dearer slot and cover the
          // difference. Saying only "₹800 paid" would then be a figure their
          // bank statement never shows, so the smaller truth goes underneath.
          note={
            b.collected < b.totalAmount && !b.bookedByOwner
              ? fill(c.labels.covered, {
                  paid: formatRupees(b.collected),
                  covered: formatRupees(b.totalAmount - b.collected),
                })
              : undefined
          }
        />
        <Detail term={c.labels.method} value={b.paymentMethod ? (c.methods[b.paymentMethod] ?? b.paymentMethod) : '—'} />
        <Detail term={c.labels.transaction} value={b.transactionId ?? '—'} mono />
        <Detail term={c.labels.order} value={b.orderId ?? '—'} mono />
        <Detail term={c.labels.reference} value={b.id.slice(-6).toUpperCase()} mono />
        <Detail term={c.labels.booked} value={formatDateTime(new Date(b.createdAt))} />

        {b.status === 'CANCELLED' && b.cancelReason && (
          <Detail
            term={c.labels.cancelledOn}
            value={`${b.cancelledAt ? formatDateTime(new Date(b.cancelledAt)) : '—'} · ${
              c.cancelReasons[b.cancelReason] ?? b.cancelReason
            }`}
            wide
          />
        )}
        {refunded && (
          <Detail
            term={c.labels.refund}
            value={`${formatRupees(b.refundAmount ?? 0)} — ${
              b.refundStatus === 'COMPLETED' ? 'sent back to your account' : 'on its way back to your account'
            }`}
            wide
          />
        )}
      </dl>

      {/* -------------------------------------------------------- actions */}
      {b.status === 'PENDING' && (
        <div className="mt-5 border-t border-ink/10 pt-5">
          <Link
            href={`/booking/${b.id}`}
            className="btn-gradient inline-flex h-12 w-full items-center justify-center rounded-full px-6 text-sm font-bold uppercase tracking-wide text-white sm:w-auto"
          >
            {c.actions.pay}
          </Link>
        </div>
      )}

      {b.changeable && (
        <div className="mt-5 border-t border-ink/10 pt-5">
          {confirming ? (
            <div className="rounded-2xl bg-soft-blue p-4 inset-ring-1 inset-ring-ink/[0.06]">
              <p className="text-sm font-black uppercase tracking-tight">{c.confirm.title}</p>
              <p className="mt-2 text-sm leading-6 text-ink-soft">
                {b.totalAmount > 0 && !b.bookedByOwner
                  ? fill(c.confirm.bodyRefund, { amount: formatRupees(b.totalAmount) })
                  : c.confirm.bodyNoRefund}
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button type="button" variant="dark" onClick={onCancel} disabled={busy} className="w-full sm:w-auto">
                  {busy ? c.actions.cancelling : c.confirm.go}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onAskCancel}
                  disabled={busy}
                  className="w-full sm:w-auto"
                >
                  {c.confirm.keep}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href={`/book?reschedule=${b.id}`}
                className="btn-gradient inline-flex h-12 w-full items-center justify-center rounded-full px-6 text-sm font-bold uppercase tracking-wide text-white sm:w-auto"
              >
                {c.actions.reschedule}
              </Link>
              <Button type="button" variant="outline" onClick={onAskCancel} className="w-full sm:w-auto">
                {c.actions.cancel}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Too close to play with — the turf can still help by phone. */}
      {b.status === 'CONFIRMED' && !b.changeable && !played && (
        <p className="mt-5 border-t border-ink/10 pt-5 text-sm text-muted">
          {fill(c.actions.locked, { notice: CHANGE_WINDOW_HOURS, phone: turfPhone })}
        </p>
      )}
    </article>
  );
}

function Detail({ term, value, note, mono = false, wide = false }: {
  term: string;
  value: string;
  /** A quieter second line under the value, when the value alone would mislead. */
  note?: string;
  mono?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={cn('min-w-0', wide && 'min-[420px]:col-span-2')}>
      <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{term}</dt>
      <dd className={cn('mt-1 break-words text-sm font-semibold text-ink', mono && 'font-mono text-[13px]')}>
        {value}
      </dd>
      {note && <p className="mt-0.5 text-[11px] font-semibold text-muted">{note}</p>}
    </div>
  );
}

function Trail({ text }: { text: string }) {
  return (
    <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-soft-blue px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
      <svg aria-hidden width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12h13M13 6l6 6-6 6" />
      </svg>
      {text}
    </p>
  );
}
