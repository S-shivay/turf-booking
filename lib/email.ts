import 'server-only';
import { Resend } from 'resend';
import { describeSlots, formatDateKey, businessDateKeyOf } from '@/lib/slots';
import { formatRupees, ownerEmails } from '@/lib/utils';
import type { RefundMethod } from '@/generated/prisma/client';

const FROM = process.env.EMAIL_FROM ?? 'Turf Booking <onboarding@resend.dev>';

let client: Resend | null | undefined;
function resend(): Resend | null {
  if (client !== undefined) return client;
  client = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  if (!client) console.warn('[email] RESEND_API_KEY not set — emails are logged, not sent');
  return client;
}

async function send(to: string[], subject: string, html: string) {
  const recipients = [...new Set(to.filter(Boolean))];
  if (recipients.length === 0) return;
  const r = resend();
  if (!r) {
    console.info(`[email:dry-run] to=${recipients.join(',')} subject="${subject}"`);
    return;
  }

  // One request per recipient. Resend rejects an entire multi-recipient send
  // if any single address is not allowed (routine on an account with no
  // verified domain), which would drop the mail for everyone else too. It
  // also keeps the owners' addresses from appearing in each other's headers.
  const results = await Promise.allSettled(
    recipients.map((addr) => r.emails.send({ from: FROM, to: addr, subject, html })),
  );

  results.forEach((res, i) => {
    const addr = recipients[i];
    if (res.status === 'rejected') {
      console.error(`[email] ${addr} — request failed:`, res.reason);
      return;
    }
    const { error } = res.value;
    if (!error) return;
    // Log the message itself: the error object stringifies to "{}" in the
    // dev log, which hides the one line that says what to fix.
    console.error(`[email] ${addr} — ${error.name}: ${error.message}`);
    if (error.name === 'validation_error' && /own email address/i.test(error.message)) {
      console.error(
        `[email] This Resend account has no verified domain, so "${FROM}" may only mail the account's own address. ` +
          'Either verify a domain at resend.com/domains and set EMAIL_FROM to an address on it, ' +
          'or keep OWNER_EMAILS limited to the Resend account address while testing.',
      );
    }
  });
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function layout(title: string, rows: Array<[string, string]>, footer?: string) {
  const trs = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#5B6B7B;white-space:nowrap">${esc(k)}</td><td style="padding:6px 0;color:#1B2A38;font-weight:600">${esc(v)}</td></tr>`,
    )
    .join('');
  return `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#F3FAF6;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #D6F5E0;overflow:hidden">
    <div style="background:linear-gradient(90deg,#DBEEFF,#D6F5E0);padding:18px 24px;font-size:18px;font-weight:700;color:#0F3A66">${esc(title)}</div>
    <div style="padding:20px 24px"><table cellpadding="0" cellspacing="0" style="font-size:15px">${trs}</table>
    ${footer ? `<p style="margin-top:18px;color:#5B6B7B;font-size:14px">${esc(footer)}</p>` : ''}</div>
  </div></body></html>`;
}

export interface BookingEmailData {
  id: string;
  turfName: string;
  slotStarts: Date[];
  startsAt: Date;
  numPeople: number;
  totalAmount: number;
  customer: { name: string | null; email: string; phone: string | null };
}

function whenText(b: BookingEmailData) {
  return `${formatDateKey(businessDateKeyOf(b.startsAt))}, ${describeSlots(b.slotStarts)}`;
}

/** Booking confirmed → owners only. Customer sees it on screen. */
export async function sendBookingConfirmed(b: BookingEmailData) {
  await send(
    ownerEmails(),
    `New booking: ${whenText(b)} (${b.numPeople} people)`,
    layout('Booking confirmed', [
      ['Turf', b.turfName],
      ['When', whenText(b)],
      ['People', String(b.numPeople)],
      ['Paid', formatRupees(b.totalAmount)],
      ['Customer', b.customer.name ?? '—'],
      ['Phone', b.customer.phone ?? '—'],
      ['Email', b.customer.email],
      ['Booking ID', b.id],
    ]),
  );
}

export interface CancellationEmailData extends BookingEmailData {
  reason: string;
  refundMethod: RefundMethod;
  refundAmount: number;
  refundReference: string | null;
  refundNote: string | null;
}

function refundSentence(c: CancellationEmailData): string {
  const amt = formatRupees(c.refundAmount);
  switch (c.refundMethod) {
    case 'GATEWAY':
      return `${amt} has been refunded to your original payment method. It typically appears in 5–7 working days.${c.refundReference ? ` Reference: ${c.refundReference}.` : ''}`;
    case 'MANUAL':
      return `${amt} has been sent to you directly. Reference: ${c.refundReference ?? '—'}.${c.refundNote ? ` ${c.refundNote}` : ''}`;
    case 'NONE':
      return `No refund is being made. ${c.refundNote ?? ''}`.trim();
  }
}

/** Booking cancelled → owners + customer. Must state the refund precisely. */
export async function sendBookingCancelled(c: CancellationEmailData) {
  const rows: Array<[string, string]> = [
    ['Turf', c.turfName],
    ['Cancelled slots', whenText(c)],
    ['People', String(c.numPeople)],
    ['Reason', c.reason],
    ['Refund', refundSentence(c)],
    ['Booking ID', c.id],
  ];
  await Promise.all([
    send(
      [c.customer.email],
      `Your booking on ${formatDateKey(businessDateKeyOf(c.startsAt))} was cancelled`,
      layout('Booking cancelled', rows, 'If anything here looks wrong, reply to this email or call the turf.'),
    ),
    send(
      ownerEmails(),
      `Cancelled: ${whenText(c)} — ${c.customer.name ?? c.customer.email}`,
      layout('Booking cancelled', [...rows, ['Customer', c.customer.name ?? '—'], ['Phone', c.customer.phone ?? '—']]),
    ),
  ]);
}

export interface RescheduleEmailData extends BookingEmailData {
  /** The booking as it stood before the move — its times are now free again. */
  previous: { id: string; startsAt: Date; slotStarts: Date[]; numPeople: number };
  /** Paise collected for the move. 0 when the booking did not change size. */
  amountPaid: number;
  /** The turf moved it, not the customer — so the customer is told as well. */
  byOwner?: boolean;
}

/**
 * Booking moved → owners, and the customer too when the turf is the one that
 * moved it. A move the customer made themselves needs no email: they watched
 * it happen. A move the turf made is news — they would otherwise turn up at
 * the old time — so it goes to them in their own words.
 *
 * The owners' copy spells out **both** windows, the one freed and the one
 * filled: "a booking changed" is useless to whoever is running the board.
 */
export async function sendBookingRescheduled(r: RescheduleEmailData) {
  const from = `${formatDateKey(businessDateKeyOf(r.previous.startsAt))}, ${describeSlots(r.previous.slotStarts)}`;
  const to = whenText(r);
  const who = r.customer.name ?? r.customer.email;

  const jobs = [
    send(
      ownerEmails(),
      `Moved: ${from} → ${to} — ${who}`,
      layout(
        'Booking moved',
        [
          ['Turf', r.turfName],
          ['Was', `${from} · ${r.previous.numPeople} people`],
          ['Now', `${to} · ${r.numPeople} people`],
          ['Moved by', r.byOwner ? 'the turf' : 'the customer'],
          ['Extra paid', r.amountPaid > 0 ? formatRupees(r.amountPaid) : 'nothing more to pay'],
          ['Booking total', formatRupees(r.totalAmount)],
          ['Customer', r.customer.name ?? '—'],
          ['Phone', r.customer.phone ?? '—'],
          ['Email', r.customer.email],
          ['New booking ID', r.id],
          ['Previous booking ID', r.previous.id],
        ],
        'The old times are free again and back on the board.',
      ),
    ),
  ];

  if (r.byOwner) {
    jobs.push(
      send(
        [r.customer.email],
        `Your booking has moved to ${to}`,
        layout(
          'Your booking has moved',
          [
            ['Turf', r.turfName],
            ['New time', `${to} · ${r.numPeople} players`],
            ['Previous time', from],
            ['To pay', 'nothing — this move is on us'],
            ['Booking ID', r.id],
          ],
          'We moved this booking for you, so please come at the new time. Nothing more is owed. If the new time does not suit you, call the turf and we will sort it out.',
        ),
      ),
    );
  }

  await Promise.all(jobs);
}

/** Payment arrived after the hold expired and the slots were gone. */
export async function sendLateWebhookRefund(
  b: BookingEmailData & { refundReference: string | null; refundOk: boolean },
) {
  const body = b.refundOk
    ? `Your payment of ${formatRupees(b.totalAmount)} was received after the slot hold had expired and the slots were taken by someone else. A full refund has been issued to your original payment method and typically appears in 5–7 working days.${b.refundReference ? ` Reference: ${b.refundReference}.` : ''}`
    : `Your payment of ${formatRupees(b.totalAmount)} was received after the slot hold had expired and the slots were taken by someone else. The turf owner has been notified and will refund you in full shortly.`;
  await Promise.all([
    send(
      [b.customer.email],
      'We could not confirm your booking — full refund',
      layout(
        'Booking not confirmed',
        [
          ['Requested slots', whenText(b)],
          ['Amount', formatRupees(b.totalAmount)],
          ['Booking ID', b.id],
        ],
        body,
      ),
    ),
    send(
      ownerEmails(),
      `${b.refundOk ? 'Auto-refunded' : 'REFUND NEEDED'}: late payment for ${whenText(b)}`,
      layout('Late payment', [
        ['Customer', b.customer.name ?? b.customer.email],
        ['Phone', b.customer.phone ?? '—'],
        ['Amount', formatRupees(b.totalAmount)],
        [
          'Gateway refund',
          b.refundOk ? `issued (${b.refundReference ?? ''})` : 'FAILED — refund manually from the Razorpay dashboard',
        ],
        ['Booking ID', b.id],
      ]),
    ),
  ]);
}
