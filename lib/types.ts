// Shared types crossing the client/server boundary. Keep these free of PII
// beyond what the requesting user is entitled to see.

export type SlotState = 'free' | 'held' | 'booked' | 'past';

export interface SlotDTO {
  index: number;
  /** ISO instant (UTC) */
  start: string;
  state: SlotState;
}

export interface SlotsResponse {
  date: string;
  serverNow: string;
  slots: SlotDTO[];
}

export interface TurfPublic {
  id: string;
  name: string;
  pricePerPersonPerSlot: number;
  minPeople: number;
  maxPeople: number;
  openHour: number;
  closeHour: number;
}

export interface CreateBookingRequest {
  date: string;
  slotIndexes: number[];
  numPeople: number;
  idempotencyKey: string;
  phone?: string;
}

export interface CreateBookingResponse {
  bookingId: string;
  orderId: string;
  /** paise */
  amount: number;
  currency: 'INR';
  keyId: string;
  expiresAt: string;
  customer: { name: string | null; email: string; phone: string | null };
}

export interface OwnerBookRequest {
  date: string;
  slotIndexes: number[];
  numPeople: number;
  idempotencyKey: string;
}

export type BookingStatusValue = 'PENDING' | 'CONFIRMED' | 'CANCELLED';
export type RefundMethodValue = 'GATEWAY' | 'MANUAL' | 'NONE';
export type RefundStatusValue = 'PENDING' | 'COMPLETED' | 'FAILED';

/** What the customer's status page sees about their own booking. */
export interface BookingStatusDTO {
  id: string;
  status: BookingStatusValue;
  startsAt: string;
  endsAt: string;
  slotStarts: string[];
  numPeople: number;
  totalAmount: number;
  expiresAt: string | null;
  cancelReason: string | null;
  refundMethod: RefundMethodValue | null;
  refundAmount: number | null;
  refundStatus: RefundStatusValue | null;
  refundReference: string | null;
  /** Present only while PENDING so the customer can retry payment. */
  payment: { orderId: string; keyId: string; amount: number } | null;
}

export interface CancelBookingRequest {
  reason: string;
  refundMethod: RefundMethodValue;
  refundAmount?: number;
  refundReference?: string;
  refundNote?: string;
}

/**
 * One row of "My bookings". Carries everything the customer's own receipt
 * needs — including the payment reference, which is theirs to see. Gateway
 * ids are shown only on the booking's own row, never in a list anyone else
 * can reach.
 */
export interface MyBookingDTO {
  id: string;
  status: BookingStatusValue;
  startsAt: string;
  endsAt: string;
  slotStarts: string[];
  numPeople: number;
  slotCount: number;
  totalAmount: number;
  /**
   * Paise actually charged. Below `totalAmount` when the turf moved this
   * booking into a dearer slot and covered the difference — the card says so
   * rather than claiming a payment the customer's bank statement won't show.
   */
  collected: number;
  createdAt: string;
  expiresAt: string | null;
  bookedByOwner: boolean;
  /** "upi" | "card" | "netbanking" | "wallet" — as the gateway reported it. */
  paymentMethod: string | null;
  /** Razorpay payment id. The customer's own transaction reference. */
  transactionId: string | null;
  orderId: string | null;
  cancelReason: string | null;
  cancelledAt: string | null;
  refundMethod: RefundMethodValue | null;
  refundAmount: number | null;
  refundStatus: RefundStatusValue | null;
  refundReference: string | null;
  /** True while this game is far enough ahead to cancel or move it here. */
  changeable: boolean;
  /** Set when this booking replaced an earlier one. */
  rescheduledFromId: string | null;
  /** Set when this booking was replaced by a later one. */
  rescheduledToId: string | null;
}

// ---------------------------------------------------------------------------
// Owner desk

/** Which rows the ledger is showing. Time-based and state-based, in one list. */
export type OwnerStatusFilter = 'all' | 'upcoming' | 'confirmed' | 'pending' | 'played' | 'cancelled';

/**
 * The whole ledger filter, parsed and clamped from the URL. It lives in the
 * query string rather than in React state so a filtered view is bookmarkable,
 * the back button walks the filter history, and the download link can carry
 * the very same params — the sheet and the screen can never disagree.
 */
export interface OwnerQuery {
  page: number;
  pageSize: number;
  /** Customer name, email, phone or booking reference. */
  q: string | null;
  /** Inclusive business-date range over the day the game is played. */
  from: string | null;
  to: string | null;
  status: OwnerStatusFilter;
}

/** One row of the ledger. Carries customer PII — owner responses only. */
export interface OwnerBookingDTO {
  id: string;
  status: BookingStatusValue;
  startsAt: string;
  endsAt: string;
  slotStarts: string[];
  numPeople: number;
  slotCount: number;
  /** What the booking is worth now. May exceed `collected` after an owner move. */
  totalAmount: number;
  /**
   * What the slot is worth at list price. Equals `totalAmount` for anything a
   * customer paid for; for a block the turf made — where `totalAmount` is 0 —
   * it is what those times would have sold for, so the desk can show what the
   * block is holding rather than a bare "no charge".
   */
  value: number;
  /** Paise actually taken from the customer, following the reschedule chain. */
  collected: number;
  createdAt: string;
  expiresAt: string | null;
  bookedByOwner: boolean;
  customer: { name: string | null; email: string; phone: string | null };
  paymentMethod: string | null;
  transactionId: string | null;
  orderId: string | null;
  cancelReason: string | null;
  cancelledAt: string | null;
  refundMethod: RefundMethodValue | null;
  refundAmount: number | null;
  refundStatus: RefundStatusValue | null;
  refundReference: string | null;
  rescheduledFromId: string | null;
  rescheduledToId: string | null;
  /** Not cancelled and not started — it can still be taken off the board. */
  cancellable: boolean;
  /**
   * …and it is confirmed, so it can be moved. A booking still waiting for
   * payment cannot: there is nothing to carry across yet, and the server
   * refuses it, so the button is not offered.
   */
  movable: boolean;
  /** There is a gateway payment to pull a refund from. */
  refundableToSource: boolean;
}

/** Money and counts over the **whole** filtered set, never just the page. */
export interface OwnerTotals {
  entries: number;
  players: number;
  /** paise actually received */
  collected: number;
  /** paise sent back (failed refunds excluded — that money never left) */
  refunded: number;
  income: number;
  /** How many of the entries are blocks the turf made, and what they are worth. */
  blockedCount: number;
  blocked: number;
}

export interface OwnerLedger {
  rows: OwnerBookingDTO[];
  totals: OwnerTotals;
  page: number;
  pages: number;
}

/** What a reschedule may not go below. The picker starts from these. */
export interface RescheduleBasis {
  bookingId: string;
  numPeople: number;
  slotCount: number;
  /** Paise already paid, carried straight over to the new booking. */
  creditApplied: number;
  startsAt: string;
  /** The original's own times, which stay selectable while moving. */
  slotStarts: string[];
}

export interface RescheduleRequest {
  date: string;
  slotIndexes: number[];
  numPeople: number;
  idempotencyKey: string;
}

export type RescheduleResponse =
  /** Nothing more to pay — the swap already happened. */
  | { outcome: 'moved'; bookingId: string }
  /** The new times cost more; pay the difference to complete the move. */
  | {
      outcome: 'payment_required';
      bookingId: string;
      orderId: string;
      /** paise — the difference only, never the full price */
      amount: number;
      currency: 'INR';
      keyId: string;
      expiresAt: string;
      customer: { name: string | null; email: string; phone: string | null };
    };

export type ApiError =
  | { error: 'UNAUTHENTICATED' }
  | { error: 'FORBIDDEN' }
  | { error: 'NOT_FOUND' }
  | { error: 'VALIDATION'; message: string }
  | { error: 'SLOTS_TAKEN'; taken: string[] }
  | { error: 'RATE_LIMITED'; message: string }
  | { error: 'TOO_MANY_HOLDS'; message: string }
  | { error: 'PAYMENT_UNAVAILABLE'; message: string }
  | { error: 'INTERNAL' };

/**
 * One numbered section of a legal page (`/terms`, `/privacy`, `/cancellation`).
 * The copy lives in `content/terms.ts`, `content/privacy.ts` and
 * `content/cancellation.ts`; `components/legal.tsx` renders it, so every legal
 * page numbers, links and lays out identically.
 */
export interface LegalSection {
  /** Anchor id — stable, because links and bookmarks point at them (`/terms#cancellation`). */
  id: string;
  title: string;
  paras?: string[];
  bullets?: { label?: string; text: string }[];
  after?: string[];
}
