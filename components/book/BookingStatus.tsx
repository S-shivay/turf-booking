'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { Button, ButtonLink } from '@/components/ui';
import { StatusBurst, isBurstTone, type BurstTone } from '@/components/book/StatusBurst';
import { openCheckout, loadCheckout } from '@/lib/checkout';
import { apiJson, withLoader } from '@/lib/loading';
import * as c from '@/content/book';
import { fill } from '@/content/home';
import { describeSlots, formatDateKey, businessDateKeyOf } from '@/lib/slots';
import type { BookingStatusDTO } from '@/lib/types';
import { cn, formatRupees } from '@/lib/utils';

const POLL_MS = 3000;
/**
 * How many times we may ask the gateway directly (every other tick, so ~2 min
 * of cover). The webhook is still what confirms in the normal case; this is
 * the safety net for a late, failed or — in local dev — impossible delivery.
 */
const MAX_GATEWAY_CHECKS = 20;

export interface BookingStatusProps {
  initial: BookingStatusDTO;
  turf: { name: string; address: string; phone: string };
}

/**
 * Post-checkout screen. The browser never decides whether a booking is paid:
 * it polls the server, which confirms only on the signed Razorpay webhook or
 * on its own authenticated check with Razorpay (see `reconcile` below).
 */
export function BookingStatus({ initial, turf }: BookingStatusProps) {
  const [booking, setBooking] = useState(initial);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [burst, setBurst] = useState<BurstTone | null>(null);

  const ticks = useRef(0);
  const gatewayChecks = useRef(0);
  const checkoutOpen = useRef(false);
  /** The news we have already broken, so a poll never replays the animation. */
  const announced = useRef<BurstTone | null>(null);

  const refresh = useCallback(
    async (silent = true) => {
      try {
        const dto = await apiJson<BookingStatusDTO>(`/api/bookings/${initial.id}`, { silent, cache: 'no-store' });
        setBooking(dto);
      } catch {
        // Keep showing the last known state; the next poll usually recovers.
      }
    },
    [initial.id],
  );

  /**
   * Ask the server to check with Razorpay itself. The browser never claims the
   * payment succeeded — it only names the booking; the server verifies with
   * the gateway and confirms through the same path the webhook uses.
   */
  const reconcile = useCallback(async () => {
    gatewayChecks.current += 1;
    try {
      const dto = await apiJson<BookingStatusDTO>(`/api/bookings/${initial.id}/reconcile`, {
        method: 'POST',
        silent: true,
      });
      setBooking(dto);
    } catch {
      // Falls back to the plain status poll on the next tick.
    }
  }, [initial.id]);

  // Anything derived from the clock must not render until we are on the
  // client: the server's "14:41 left" and the browser's "14:40" a moment
  // later are a hydration mismatch, and in dev that pops the error overlay
  // (which locks page scroll).
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const pending = booking.status === 'PENDING';
  const expiresAt = booking.expiresAt ? new Date(booking.expiresAt).getTime() : 0;
  const msLeft = Math.max(0, expiresAt - now);
  const expired = mounted && pending && expiresAt > 0 && msLeft === 0;

  /**
   * What actually happened, in the customer's terms. A hold is only shown as
   * "waiting" while money can still arrive — a failed payment is finished,
   * and its slots are already back on the board.
   */
  const view: 'confirmed' | 'waiting' | 'failed' | 'expired' | 'cancelled' =
    booking.status === 'CONFIRMED'
      ? 'confirmed'
      : booking.cancelReason === 'PAYMENT_FAILED'
        ? 'failed'
        : booking.status === 'CANCELLED'
          ? booking.cancelReason === 'HOLD_EXPIRED'
            ? 'expired'
            : 'cancelled'
          : expired
            ? 'expired'
            : 'waiting';

  useEffect(() => {
    // Always ask once on arrival, whatever the booking says right now: a
    // payment that landed in the last seconds of a hold leaves the booking
    // CANCELLED with money still taken, and this is what gets it refunded.
    const first = window.setTimeout(() => void reconcile(), 0);
    if (!pending) return () => window.clearTimeout(first);

    // Then poll while we wait for the webhook, ticking the countdown.
    const id = window.setInterval(() => {
      ticks.current += 1;
      setNow(Date.now());
      // Don't ask the gateway while Checkout is open: a first failed attempt
      // would release the hold out from under a customer who is retrying.
      if (document.hidden || checkoutOpen.current) return;
      // Every other tick goes straight to the gateway, so a webhook that never
      // shows up costs the customer ~6 seconds, not their booking.
      if (ticks.current % 2 === 1 && gatewayChecks.current < MAX_GATEWAY_CHECKS) void reconcile();
      else void refresh();
    }, POLL_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [pending, refresh, reconcile]);

  // Announce each outcome once, the moment it becomes true. Gated on `mounted`
  // so a hold that has already run out never flashes "waiting" first.
  useEffect(() => {
    if (!mounted || announced.current === view) return;
    announced.current = view;
    // Deferred: setting state straight from an effect body is what
    // react-hooks/set-state-in-effect warns about.
    const id = window.setTimeout(() => setBurst(view), 0);
    return () => window.clearTimeout(id);
  }, [mounted, view]);

  // Design preview — `?demo-status=confirmed` plays a burst on any booking.
  // Development only; the branch is dropped from the production bundle.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const asked = new URLSearchParams(window.location.search).get('demo-status');
    if (!asked || !isBurstTone(asked)) return;
    const id = window.setTimeout(() => setBurst(asked), 0);
    return () => window.clearTimeout(id);
  }, []);

  async function payNow() {
    if (!booking.payment) return;
    // Clear any burst still playing so its blur never sits over Checkout.
    setBurst(null);
    setBusy(true);
    setError(null);
    try {
      await withLoader(loadCheckout());
      checkoutOpen.current = true;
      await openCheckout({
        order: { ...booking.payment, currency: 'INR' },
        turfName: turf.name,
        description: describeSlots(booking.slotStarts.map((s) => new Date(s))),
        onClose: () => {
          checkoutOpen.current = false;
          void reconcile();
        },
      });
    } catch {
      checkoutOpen.current = false;
      setError(fill(c.status.paymentDown, { phone: turf.phone }));
    } finally {
      setBusy(false);
    }
  }

  const when = `${formatDateKey(businessDateKeyOf(new Date(booking.startsAt)))} · ${describeSlots(
    booking.slotStarts.map((s) => new Date(s)),
  )}`;
  const clock = `${String(Math.floor(msLeft / 60000)).padStart(2, '0')}:${String(
    Math.floor((msLeft % 60000) / 1000),
  ).padStart(2, '0')}`;

  const tone =
    view === 'confirmed'
      ? 'bg-soft-green inset-ring-green/30'
      : view === 'waiting'
        ? 'bg-soft-blue inset-ring-blue/30'
        : 'bg-rose-50 inset-ring-rose-200';

  return (
    <>
      {burst && <StatusBurst tone={burst} caption={c.announce[burst]} onDone={() => setBurst(null)} />}

      <div className="mx-auto w-full max-w-xl">
        <div className={cn('rounded-3xl p-6 inset-ring-1 sm:p-8', tone)}>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
            {fill(c.status.ref, { ref: booking.id.slice(-6) })}
          </p>

          {view === 'confirmed' && <Head title={c.status.confirmed.title} body={c.status.confirmed.body} />}

          {view === 'waiting' && (
            <>
              <Head title={c.status.waiting.title} body={c.status.waiting.body} />
              <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold tabular-nums">
                <span className="h-2 w-2 animate-pulse rounded-full bg-blue" />
                {mounted ? fill(c.status.waiting.held, { clock }) : c.status.waiting.checking}
              </p>
            </>
          )}

          {/* Payment failed: nothing charged, slots already back on the board. */}
          {view === 'failed' && <Head title={c.status.failed.title} body={c.status.failed.body} />}

          {view === 'expired' && <Head title={c.status.expired.title} body={c.status.expired.body} />}

          {view === 'cancelled' && (
            <>
              <Head title={c.status.cancelled.title} body={booking.cancelReason ?? undefined} />
              <p className="mt-3 text-sm font-semibold leading-6">{refundSentence(booking)}</p>
            </>
          )}

          <dl className="mt-6 space-y-3 border-t border-ink/10 pt-5 text-sm">
            <Row term={c.status.rows.when} value={when} />
            <Row term={c.status.rows.players} value={String(booking.numPeople)} />
            <Row term={c.status.rows.amount} value={formatRupees(booking.totalAmount)} />
            <Row term={c.status.rows.where} value={`${turf.name}, ${turf.address}`} />
          </dl>

          {view === 'waiting' && booking.payment && (
            <div className="mt-6">
              <Button type="button" size="lg" className="w-full" onClick={payNow} disabled={busy}>
                {busy ? c.status.waiting.paying : c.status.waiting.pay}
              </Button>
              {error && <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p>}
            </div>
          )}

          {(view === 'failed' || view === 'expired' || view === 'cancelled') && (
            <ButtonLink href="/book" size="lg" className="mt-6 w-full">
              {view === 'failed' ? c.status.failed.cta : c.status.expired.cta}
            </ButtonLink>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
          <Link href="/book" className="font-semibold text-green-deep underline underline-offset-4">
            {c.status.again}
          </Link>
          <a href={`tel:${turf.phone}`} className="font-semibold text-green-deep underline underline-offset-4">
            {c.status.call}
          </a>
        </div>
      </div>
    </>
  );
}

function Head({ title, body }: { title: string; body?: string }) {
  return (
    <>
      <h1 className="mt-2 text-3xl font-black uppercase leading-tight tracking-tight sm:text-4xl">{title}</h1>
      {body && <p className="mt-2 text-sm leading-6 text-ink-soft">{body}</p>}
    </>
  );
}

/** Says exactly what is happening to the customer's money. */
function refundSentence(b: BookingStatusDTO): string {
  const amount = formatRupees(b.refundAmount ?? 0);
  if (b.refundMethod === 'GATEWAY') {
    if (b.refundStatus === 'COMPLETED') return `${amount} has been refunded to the account you paid from.`;
    if (b.refundStatus === 'FAILED')
      return `We tried to refund ${amount} and it did not go through. We are on it — please call us.`;
    return `${amount} is being refunded to the account you paid from. It usually lands within 5–7 working days.`;
  }
  if (b.refundMethod === 'MANUAL') {
    return `${amount} was refunded directly to you${b.refundReference ? ` (reference ${b.refundReference})` : ''}.`;
  }
  if (b.refundMethod === 'NONE') return 'No refund was issued for this booking.';
  return 'No payment was taken for this booking.';
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-muted">{term}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  );
}
