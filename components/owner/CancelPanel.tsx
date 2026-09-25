'use client';

import { useState } from 'react';
import * as c from '@/content/owner';
import { fill } from '@/content/home';
import { ApiError, apiJson } from '@/lib/loading';
import { businessDateKeyOf, formatDateKey, describeSlots } from '@/lib/slots';
import type { OwnerBookingDTO, RefundMethodValue } from '@/lib/types';
import { cn, formatRupees } from '@/lib/utils';

/**
 * Cancelling a booking, and deciding what happens to the money.
 *
 * Three things make this safe to put in front of a tired owner on a phone at
 * 11 pm: the confirmation line spells out the real booking and the real
 * amount rather than asking "are you sure"; the amount can never exceed the
 * **cash actually taken** (which is not always the price — the turf may have
 * covered a difference on a move); and "back the way they paid" simply is not
 * offered when there is no payment to pull from, instead of failing later.
 *
 * The server re-checks every one of those. This is the courtesy, not the lock.
 */
export function CancelPanel({
  b,
  onClose,
  onDone,
}: {
  b: OwnerBookingDTO;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const max = b.collected;
  const [method, setMethod] = useState<RefundMethodValue>(
    max === 0 ? 'NONE' : b.refundableToSource ? 'GATEWAY' : 'MANUAL',
  );
  const [reason, setReason] = useState('');
  const [rupees, setRupees] = useState(String(Math.round(max / 100)));
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amount = Math.min(max, Math.max(0, Math.round(Number(rupees) * 100) || 0));
  const when = `${formatDateKey(businessDateKeyOf(new Date(b.startsAt)))}, ${describeSlots(
    b.slotStarts.map((s) => new Date(s)),
  )}`;
  const name = b.customer.name?.trim() || b.customer.email.split('@')[0];

  const sentence =
    max === 0
      ? fill(c.cancel.confirmFree, { when, players: b.numPeople })
      : method === 'GATEWAY'
        ? fill(c.cancel.confirmRefund, { when, players: b.numPeople, amount: formatRupees(amount), name })
        : method === 'MANUAL'
          ? fill(c.cancel.confirmManual, { when, players: b.numPeople, amount: formatRupees(amount), name })
          : fill(c.cancel.confirmNone, { when, players: b.numPeople, amount: formatRupees(max) });

  async function submit() {
    const why = reason.trim();
    if (why.length < 3) return setError(c.cancel.needReason);
    if (method === 'MANUAL' && !reference.trim()) return setError(c.cancel.needReference);
    // "Why no refund?" is a fair question when money was taken and is being
    // kept. When nothing was ever charged it is bureaucracy, so the answer is
    // filled in rather than demanded — the server still records one.
    if (max > 0 && method === 'NONE' && !note.trim()) return setError(c.cancel.needNote);
    const why_none = note.trim() || c.cancel.nothingCharged;

    setBusy(true);
    setError(null);
    try {
      const res = await apiJson<{ refundMethod: RefundMethodValue | null; refundAmount: number | null }>(
        `/api/bookings/${b.id}/cancel`,
        {
          method: 'POST',
          body: JSON.stringify({
            reason: why,
            refundMethod: method,
            ...(method === 'NONE' ? {} : { refundAmount: amount }),
            ...(method === 'MANUAL' ? { refundReference: reference.trim() } : {}),
            ...(method === 'NONE' ? { refundNote: why_none } : note.trim() ? { refundNote: note.trim() } : {}),
          }),
        },
      );
      const tail =
        res.refundMethod === 'GATEWAY'
          ? c.cancel.refundSent
          : res.refundMethod === 'MANUAL'
            ? c.cancel.refundManual
            : c.cancel.refundNone;
      onDone(fill(c.cancel.done, { refund: tail }));
    } catch (err) {
      setBusy(false);
      if (err instanceof ApiError) {
        setError(err.code === 'VALIDATION' ? err.message : err.code === 'UNAUTHENTICATED' ? c.hints.signedOut : c.hints.generic);
      } else {
        setError(c.hints.generic);
      }
    }
  }

  return (
    <div className="rounded-3xl bg-soft-blue p-4 inset-ring-1 inset-ring-blue/25 sm:p-5">
      <h3 className="text-sm font-black uppercase tracking-[0.1em]">{c.cancel.title}</h3>

      {/* ------------------------------------------------------- why */}
      <fieldset className="mt-4 min-w-0">
        <legend className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{c.cancel.reasonLabel}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {c.cancel.reasonPresets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setReason(p)}
              className={cn(
                'inline-flex min-h-11 items-center rounded-full px-3.5 text-[13px] font-bold transition-colors',
                reason === p ? 'bg-ink text-white' : 'bg-white text-ink-soft inset-ring-1 inset-ring-ink/10 hover:bg-soft-green',
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={c.cancel.reasonPlaceholder}
          maxLength={200}
          className="mt-2 h-12 w-full min-w-0 rounded-2xl bg-white px-4 text-base font-medium inset-ring-1 inset-ring-ink/10 placeholder:font-normal placeholder:text-muted/70 outline-hidden transition-[box-shadow,background-color] duration-200 focus:inset-ring-2 focus:inset-ring-blue focus:shadow-[0_0_0_4px_rgba(56,189,248,.14)]"
        />
      </fieldset>

      {/* ---------------------------------------------------- the money */}
      <fieldset className="mt-5 min-w-0">
        <legend className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{c.cancel.refundLabel}</legend>

        {max === 0 ? (
          <p className="mt-2 rounded-2xl bg-white px-4 py-3 text-sm text-ink-soft inset-ring-1 inset-ring-ink/10">
            {c.cancel.noGateway}
          </p>
        ) : (
          <div className="mt-2 space-y-2">
            {(['GATEWAY', 'MANUAL', 'NONE'] as const).map((key) => {
              const opt = c.cancel.methods[key];
              const disabled = key === 'GATEWAY' && !b.refundableToSource;
              const on = method === key;
              return (
                <label
                  key={key}
                  className={cn(
                    'flex min-h-14 cursor-pointer items-start gap-3 rounded-2xl p-3.5 inset-ring-1 transition-colors',
                    disabled
                      ? 'cursor-not-allowed bg-white/50 text-muted inset-ring-ink/[0.06]'
                      : on
                        ? 'bg-white inset-ring-2 inset-ring-blue'
                        : 'bg-white/70 inset-ring-ink/10 hover:bg-white',
                  )}
                >
                  <input
                    type="radio"
                    name={`refund-${b.id}`}
                    checked={on}
                    disabled={disabled}
                    onChange={() => setMethod(key)}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-[#0ea5e9]"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-ink">{opt.label}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-muted">
                      {disabled ? c.cancel.noGateway : fill(opt.help, { name })}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        )}

        {max > 0 && method !== 'NONE' && (
          <div className="mt-3">
            <label htmlFor={`amt-${b.id}`} className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
              {c.cancel.amountLabel}
            </label>
            <div className="mt-1.5 flex h-12 items-center gap-1 rounded-2xl bg-white px-4 inset-ring-1 inset-ring-ink/10 transition-shadow duration-200 focus-within:inset-ring-2 focus-within:inset-ring-blue focus-within:shadow-[0_0_0_4px_rgba(56,189,248,.14)]">
              <span className="text-base font-bold text-muted">₹</span>
              <input
                id={`amt-${b.id}`}
                type="number"
                inputMode="numeric"
                min={1}
                max={Math.round(max / 100)}
                value={rupees}
                onChange={(e) => setRupees(e.target.value)}
                className="h-full w-full min-w-0 bg-transparent text-base font-bold tabular-nums outline-hidden [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
            <p className="mt-1 text-[11px] text-muted">{fill(c.cancel.amountHelp, { max: formatRupees(max) })}</p>
          </div>
        )}

        {method === 'MANUAL' && (
          <Text
            id={`ref-${b.id}`}
            label={c.cancel.referenceLabel}
            placeholder={c.cancel.referencePlaceholder}
            value={reference}
            onChange={setReference}
          />
        )}
        {max > 0 && method === 'NONE' && (
          <Text
            id={`note-${b.id}`}
            label={c.cancel.noteLabel}
            placeholder={c.cancel.notePlaceholder}
            value={note}
            onChange={setNote}
          />
        )}
      </fieldset>

      {/* ------------------------------------------------- the sentence */}
      <p className="mt-5 rounded-2xl bg-white px-4 py-3.5 text-[15px] font-semibold leading-6 text-ink inset-ring-1 inset-ring-ink/10">
        {sentence}
      </p>

      {error && (
        <p role="alert" className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 inset-ring-1 inset-ring-amber-200">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="inline-flex h-12 items-center justify-center rounded-full bg-rose-600 px-6 text-sm font-bold uppercase tracking-wide text-white transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:hover:translate-y-0 sm:w-auto"
        >
          {busy ? c.actions.cancelling : c.cancel.go}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-bold uppercase tracking-wide text-ink-soft hover:bg-white sm:w-auto"
        >
          {c.cancel.keep}
        </button>
      </div>
    </div>
  );
}

function Text({
  id,
  label,
  placeholder,
  value,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mt-3 min-w-0">
      <label htmlFor={id} className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={120}
        className="mt-1.5 h-12 w-full min-w-0 rounded-2xl bg-white px-4 text-base font-medium inset-ring-1 inset-ring-ink/10 placeholder:font-normal placeholder:text-muted/70 outline-hidden transition-[box-shadow,background-color] duration-200 focus:inset-ring-2 focus:inset-ring-blue focus:shadow-[0_0_0_4px_rgba(56,189,248,.14)]"
      />
    </div>
  );
}
