# Owner tools — implementation plan

Status: **BUILT, 22 Sep 2026** — every step in §11 is done and verified (§13). The plan is kept as
written, because it records *why* each decision was made; where the build differs it says so inline.
Supersedes the two-line sketch in `docs/UI-PLAN.md` §8 and fills in `docs/PLAN.md` §8 (Phase 8).

**What shipped:** `/owner` (the Owner desk — lifetime ledger, URL filters, income totals, cancel with
the three refund choices), `/owner/book` (free booking and owner moves), `GET /api/owner/export`
(a styled .xlsx workbook), `POST /api/owner/bookings/[id]/reschedule`, and `collectedOn()` moving every refund
path onto the cash actually taken — which also fixed the live bug in §6.4.

**Two changes made during the build, both for honesty rather than scope:**

- The "₹200 paid · ₹600 covered by the turf" line went onto the **customer's** card in
  `/my-bookings` as well as the owner's row. Promised in §5, easy to forget, and the card says
  "Amount paid" — so without it the card claims a payment their bank statement will not show.
- Cancelling a booking that never took any money no longer demands a "why no refund" note. It is
  filled in automatically (`nothing was charged for this booking`) so the server still records one.
  Found by driving the real UI: the free booking could not be cancelled at all without it.

---

## 0. What was asked for

> See `OWNER_EMAILS` in `.env`. If any of those emails is logged in, show **every booking with every
> detail** — customer name, email, mobile, slot time, date, persons. If the slot is not gone, show
> **Reschedule** and **Cancel**. Cancel offers three choices — refund **manually**, refund **by their
> payment method**, or **nothing** — owner picks one, hits submit, slot is cancelled. In rescheduling
> **any** slot and time may be picked as long as it is not gone, and **for the owner there is no
> payment** — the owner books free, so no payment page, book directly.

Added the same day, overruling my first answer on §5:

> When the owner reschedules and there is a price difference, the customer's booking shows the actual
> price of the booking — if they first paid ₹200 and the owner moves them into times that price at
> ₹400, show **₹400** in their booking.

And the shape of that first screen:

> Give the owner's page a name in the navbar. On it, a **table of every booking the turf has ever
> taken**, with **pagination** (`page`, `page_size`), **search**, and a filter for a **single date or
> a date range** — set 22-09 to 30-09 and see every entry in that range with the **total income** for
> it — plus a **download to Excel** carrying all the details, the total income and the number of
> entries.

Everything below serves exactly that. Where I had to decide something the request didn't cover, it is
listed in §12 with the decision I took, so you can overrule any of them in one line.

---

## 1. What already exists — do not rebuild

Roughly half of this feature is already in the codebase and working:

| Piece | Where | State |
|---|---|---|
| Owner identity (`OWNER_EMAILS` → `role = OWNER`) | `lib/auth.ts` | done |
| `requireOwner()` re-reading the role from the DB each request | `lib/auth.ts` | done |
| `/owner/*` redirect to sign-in when there is no session cookie | `proxy.ts` | done |
| `/owner` disallowed for crawlers | `app/robots.ts` | done |
| Owner free booking — ₹0, `CONFIRMED` at once, no Razorpay, 30-day window | `POST /api/owner/book`, `createBooking({ mode: 'owner' })` | done, **no UI** |
| Owner cancel + all three refund methods + gateway refund call + emails | `POST /api/bookings/[id]/cancel`, `cancelBooking()` | done, **no UI** |
| Reschedule machinery (link, swap in one transaction, slot safety) | `createReschedule()`, `applyRescheduleSwap()` | done, **customer rules only** |
| Booking cards with every detail, cancel confirm panel | `components/account/BookingList.tsx` | done for customers — the owner list is its sibling |

So the work is: **the owner's screens**, plus an owner path through reschedule, plus a handful of
guards. No schema change, no migration, no new index (§10).

---

## 2. Screens

Two pages — a ledger and a picker — plus one download endpoint. Both pages are `noindex` +
`force-dynamic` and sit behind `app/owner/layout.tsx`, which calls `requireOwner()` and `notFound()`s
otherwise (404, not 403 — the site never confirms that an owner area exists to someone who isn't
one). `/owner` is already disallowed in `app/robots.ts`.

### `/owner` — **Owner desk**

That is the name in the navbar (owners only, above My bookings) and the H1 on the page. One page,
because that is how it was asked for: **every booking this turf has ever taken**, in a table, with
search, paging, date filters, an income total and a download.

```
OWNER DESK                                              [ + Free booking ]
────────────────────────────────────────────────────────────────────────
Search [ name, phone, email, reference        ]   [ Download ]
On [ 24-09-2026 ]   or   From [ 22-09-2026 ] To [ 30-09-2026 ]
Today · This week · Upcoming · Past · Cancelled · All            25 ▾
────────────────────────────────────────────────────────────────────────
  47 bookings · 312 players · collected ₹58,400 · refunded ₹2,400
  ▸ income ₹56,000
────────────────────────────────────────────────────────────────────────
 DATE        TIMES            CUSTOMER          PL   AMOUNT  PAID  STATUS
 Tue 22 Sep  7:00–8:00 PM     Rahul Shah        8    ₹800    UPI   Confirmed   [Move] [Cancel]
             …                9876543210
────────────────────────────────────────────────────────────────────────
                                   ‹ Prev    Page 2 of 4    Next ›
```

**The filter lives in the URL**, never in React state: `/owner?page=2&page_size=25&q=rahul&from=2026-09-22&to=2026-09-30&status=all`.
The page is a server component that reads `searchParams`, so a filtered view is bookmarkable and
shareable, the back button works, the download button can hand the API the exact same query string,
and there is no client-side store to drift out of sync with what is on screen.

| Param | Meaning | Default / bounds |
|---|---|---|
| `page` | 1-based | 1 |
| `page_size` | rows per page | 25; one of 10 / 25 / 50 / 100 |
| `q` | free text over customer name, email, phone and booking reference | empty; ≤ 60 chars |
| `on` | a single date, `YYYY-MM-DD` | shorthand for `from = to = on` |
| `from` / `to` | inclusive date range over **game days** (§12.7) | whole history; `from ≤ to` |
| `status` | `all` · `confirmed` · `pending` · `cancelled` · `played` | `all` |

The named presets (Today · This week · Upcoming · Past · Cancelled) are not separate queries — each
is a link that writes those same params, so there is exactly one code path to get right. A bad or
out-of-range param is clamped, never 500s: `page` past the end shows the last page.

The strip above the table is **the whole filtered set, not the page** — one indexed aggregate query,
so the totals do not change as you page through. What "income" means precisely is §5.

Below `lg` the table becomes the same stack of cards the customer's list uses; the table itself sits
in its own `overflow-x-auto` wrapper so the page body never scrolls sideways. Each row — card or
table row — carries **everything**, because that is what was asked for:

- date, times (merged ranges via `describeSlots`), players
- customer **name, email, mobile** — these appear nowhere else on the site and are the reason this
  page is owner-only
- amount, and next to it the cash actually taken when a move made the two differ (§5), how it was
  paid (`upi` / `card` / …), transaction id, order id, booking reference
- status badge: Confirmed · Awaiting payment · Cancelled · Played
- "Booked on", cancel reason + refund line when cancelled, and a "moved from / moved to" trail when
  the booking is part of a reschedule chain
- **Reschedule** and **Cancel** while `startsAt > now` — see §12.3

A card's cancel opens an inline panel (not a separate page — one screen on a phone):

```
Why?            [ No-show ] [ Rain ] [ Turf closed ] [ Customer asked ]  + free text
Refund          ( ) Back the way they paid — ₹1,200 to Rahul's UPI
                ( ) I'll send it myself — UTR / reference required
                ( ) No refund — reason required
Amount          ₹ 1200            (editable; never more than what was paid)
                → "Cancel Sun 27 Sep, 7:00–8:00 PM, 8 players, and send ₹1,200 back to Rahul?"
                [ Cancel this booking ]   [ Keep it ]
```

The confirmation sentence carries real numbers, per `docs/PLAN.md` §8.3 — owners tap things by
accident on phones. "Back the way they paid" is disabled, with a one-line reason, when there is no
gateway payment on record (a free owner booking, or an unpaid hold); the server refuses it anyway.

### Download

The **Download** button is a plain link to `GET /api/owner/export` carrying the current query string,
so what you get is exactly what you are looking at — same filter, same dates, same search, but every
matching row rather than the page in front of you.

The file has three parts:

1. a header block naming the turf, the filter in words ("22 Sep 2026 → 30 Sep 2026", "search: rahul")
   and when it was generated;
2. one row per booking with **every** column the screen holds — date, times, players, customer name,
   email, mobile, amount, cash collected, refunded, method, transaction id, order id, reference,
   status, booked-on, cancelled-on, cancel reason, and the moved-from / moved-to ids;
3. a totals row: **entries, players, collected, refunded, income** — the same figures as the summary
   strip, so the sheet and the screen can never disagree.

Format is a real **`.xlsx`** (owner, 23 Sep 2026 — §12.8 was overruled; `exceljs` is now a
dependency). What that buys, and why each part is there:

- **A banner.** The turf's name on ink, then one line naming the filter in words and the moment it
  was generated. A download that has been forwarded twice still says what it is.
- **Six summary boxes** — bookings, players, collected, refunded, income, blocked — each two columns
  wide so all six are on one screen. A figure you have to scroll right to find is one nobody reads.
- **A frozen dark header on row 7**, repeated on every printed page (`printTitlesRow`), with the
  filter dropdowns on it.
- **Colour that means something**: zebra rows for tracking across nineteen columns, a Status cell
  tinted per state (green confirmed, amber awaiting payment, rose cancelled, sky owner block), red
  text down a cancelled row, green on cash actually collected, and a rose Reason cell when a refund
  failed. Same palette tokens as the site, as ARGB.
- **Money as numbers with a `₹` number format**, never as text: the columns have to sum, sort and
  filter in the hands of whoever opens them.
- **TOTAL / INCOME / BLOCKED bands** at the foot, the same figures as the boxes at the top.

**Column widths are measured, not guessed** (owner, 24 Sep 2026 — resizing columns by hand on every
download is the complaint that drove it). Every value is measured as it streams past; each column
then takes the width of its longest value, clamped between a per-column `min` and `max`, and a
column whose longest value still would not fit switches to `wrapText` instead of being cut. Headings
get `ARROW` characters of extra room because Excel paints the filter button over the right-hand end
of the cell — which is also why a right-aligned money heading carries an indent, or it reads
"Amou▾".

Rows still stream out of the database in batches; only the workbook itself is assembled in memory,
which is what the row cap below bounds.

Capped at 20,000 rows per download with a note in the file if it truncates, so a stray unfiltered
request can never hold a connection open for a minute.

### `/owner/book` — free booking

The customer picker in owner mode: 30 days of day chips instead of 7, no slot cap, no phone field,
no price, no Razorpay. The summary panel reads "No charge — booked by the turf" and the button says
**Book it** instead of a rupee amount. On success → `/owner` with the new booking at the top.

### `/owner/book?reschedule=<id>` — move any booking

Same screen, seeded from the booking being moved: its own day, its own times already selected (the
`mine` / "Yours" state that already exists in the picker), its players in the stepper. Then:

- **any** free time in the 30-day window is selectable, in any quantity — none of the customer's
  floors apply
- there is never anything to pay, whichever direction the size goes (§5)
- **Move it** completes the swap in one request and returns to `/owner`

---

## 3. Data layer (`lib/bookings.ts`, `lib/types.ts`)

```ts
/** The whole filter, parsed and clamped from the URL by `ownerQuerySchema`. */
export interface OwnerQuery {
  page: number; pageSize: number;
  q: string | null;
  from: DateKey | null; to: DateKey | null;
  status: 'all' | 'confirmed' | 'pending' | 'cancelled' | 'played';
}

/** Everything on an owner's card. PII included — this DTO never leaves an owner response. */
export interface OwnerBookingDTO {
  id: string; status: BookingStatusValue;
  startsAt: string; endsAt: string; slotStarts: string[];
  numPeople: number; slotCount: number;
  totalAmount: number; createdAt: string; expiresAt: string | null;
  bookedByOwner: boolean;
  customer: { name: string | null; email: string; phone: string | null };
  paymentMethod: string | null; transactionId: string | null; orderId: string | null;
  cancelReason: string | null; cancelledAt: string | null;
  refundMethod: RefundMethodValue | null; refundAmount: number | null;
  refundStatus: RefundStatusValue | null; refundReference: string | null;
  rescheduledFromId: string | null; rescheduledToId: string | null;
  /** startsAt is still ahead — cancel and move are offered. */
  changeable: boolean;
  /** No gateway payment to pull a refund from; the picker disables that option. */
  refundableToSource: boolean;
}

/** Money and counts over the *whole* filtered set — never just the page. */
export interface OwnerTotals {
  entries: number; players: number;
  collected: number; refunded: number; income: number;  // paise
}

export async function listOwnerBookings(
  turf: Turf, query: OwnerQuery, now?: Date,
): Promise<{ rows: OwnerBookingDTO[]; totals: OwnerTotals; pages: number }>;

/** The same filter, unpaged, for the download. Streams; never materialised in one array. */
export function streamOwnerBookings(turf: Turf, query: OwnerQuery): AsyncIterable<OwnerBookingDTO>;
```

Three queries behind one call, run in parallel: the page (`skip`/`take`), a `count`, and one
`aggregate` for the totals. `select` only what a row renders, customer joined in the same query — no
N+1. A date range becomes a `startsAt` range built with `slotStartAt(from, 0)` and the end of the
last slot on `to`, so the whole filter rides the existing `@@index([turfId, startsAt])`; ordering is
that same column, so paging never sorts in memory. Owner lists have a p95 target of 250 ms
(`CLAUDE.md`); the page is a server component, so a page of the ledger costs one round trip and no
client fetch.

Search is the one part that cannot use an index: `q` becomes a case-insensitive `contains` over the
joined `User` (name, email, phone) plus an `endsWith` on the booking id for a reference like
`OPM1C7`. At this turf's scale — one ground, a few thousand bookings — that is a scan of a small
table and stays well inside the target. If the table ever gets big, the fix is a `pg_trgm` GIN index
on `User.name`/`email`, not a rewrite; noting it here so nobody is surprised.

Reschedule gets an actor rather than a second implementation:

```ts
export interface RescheduleInput {
  …existing fields…
  /** Who is moving it. An owner may move anyone's booking and is bound by none of the customer rules. */
  actor: { id: string; isOwner: boolean };
}
```

Inside `createReschedule`, `actor.isOwner` changes exactly five things and nothing else:

| Rule | Customer | Owner |
|---|---|---|
| Whose booking | their own, else `NOT_FOUND` | anybody's |
| 24-hour window (`withinChangeWindow`) | enforced | not applied |
| Visible window | `VISIBLE_DAYS` (7) | `OWNER_VISIBLE_DAYS` (30) |
| Floors (`numPeople`/`slotCount` may not shrink) | enforced | not applied |
| Money | difference collected before the swap | never collected, never returned; the booking takes the new price and the turf covers the gap — §5 |

The replacement booking keeps the **customer's** `userId`, so it stays their booking, shows up in
their My bookings, and any later refund still points at them. `applyRescheduleSwap` gains an
`actorId` parameter so the retired original records the owner as its canceller instead of the
customer (today it hardcodes `next.userId`).

---

## 4. API

| Route | Method | Who | Notes |
|---|---|---|---|
| `/api/owner/book` | POST | owner | **exists** — the picker just calls it |
| `/api/bookings/[id]/cancel` | POST | owner | **exists** — the cancel panel just calls it |
| `/api/owner/bookings/[id]/reschedule` | POST | owner | **new** |
| `/api/owner/export` | GET | owner | **new** — the ledger download, same query params as the page |

The ledger itself needs no route: `/owner` is a server component and reads its own data. Only the
download is an endpoint, because a browser has to be able to follow it as a link.

`GET /api/owner/export?from=…&to=…&q=…&status=…` — `requireOwner()`, `ownerQuerySchema` over the
search params (same schema the page uses, so the two can never interpret a filter differently),
then an `.xlsx` workbook with `Content-Disposition: attachment; filename="bookings-2026-09-22-to-2026-09-30.xlsx"`,
`Cache-Control: no-store`, and a `after()` log line recording which owner exported what — a file of
customer phone numbers leaving the building is worth a trace.

The owner move gets its own route rather than a flag on the customer one. That mirrors the split
already made for cancel (`cancel` vs `customer-cancel`): a client can never hand an owner rule to a
customer endpoint, because the endpoint doesn't have one. `ownerRescheduleSchema` is the customer
schema with `slotIndexesSchema(SLOTS_PER_DAY)` in place of the 12-slot cap.

Response is `{ outcome: 'moved', bookingId }` — the only outcome an owner move has.

---

## 5. Money on an owner move: the booking carries its new price, the refund follows the cash

**Owner's rule, 22 Sep 2026:** when an owner move changes the price, the customer's booking shows the
**new** price. Move a ₹200 booking into times that price at ₹400 and the customer's card reads ₹400,
even though ₹200 was collected and the turf waived the difference. No payment is ever taken and no
refund is ever made on an owner move — that part is unchanged.

```ts
// owner mode — no Razorpay order, CONFIRMED at once, swap in the same transaction
const price = calculateTotal(numPeople, wanted.length, turf.pricePerPersonPerSlot);
const cash  = (await collectedOn(originalId)).paise;  // what the customer actually paid, chain included

totalAmount   = original.bookedByOwner
  ? original.totalAmount        // a booking the turf gave away stays free, whatever it would price at
  : Math.max(price, cash);      // the booking's worth now — but never below what was paid
creditApplied = totalAmount;    // → payableAmount() === 0: the turf covers any difference
```

Two things that block is doing:

- **`price`** is what satisfies the rule above — ₹400 shows on the card.
- **`Math.max`** handles the other direction. An owner move into cheaper times must not rewrite a
  ₹400 booking down to ₹200: the customer paid ₹400, the card would understate it, and since an owner
  move refunds nothing, the missing ₹200 would look like money we kept. Downwards, the figure stands
  still.

### `totalAmount` is a price, not a receipt — so the refund can no longer read it

Once `totalAmount` can exceed the cash taken, **`totalAmount` stops being a safe refund amount.**
`cancelBooking` currently defaults `refundAmount` to `b.totalAmount` and caps it there; on the
booking above that would ask Razorpay for ₹400 against a ₹200 capture, and Razorpay rejects it. Every
money path must move onto the cash figure:

```ts
/**
 * Paise actually taken from the customer for this booking, following the
 * reschedule chain back: each link contributes what was payable on it
 * (`totalAmount - creditApplied`), which is zero for a link the turf waived
 * or granted free. Also returns the payment a refund has to be pulled from,
 * because a moved booking has no payment id of its own.
 */
export async function collectedOn(bookingId: string): Promise<{ paise: number; paymentId: string | null }>;
```

| Caller | Was | Becomes |
|---|---|---|
| `cancelBooking` default + cap | `b.totalAmount` | `collectedOn(b.id).paise` |
| `cancelBooking` gateway refund target | `b.razorpayPaymentId` | `collectedOn(b.id).paymentId` |
| `cancelByCustomer` "is there anything to refund" | `totalAmount > 0 && razorpayPaymentId` | `paise > 0 && paymentId` |
| Owner cancel panel | shows `totalAmount` | shows both: price and cash, refund defaults to cash |

For every booking that has never been moved, `collectedOn` returns exactly `totalAmount` and the
existing payment id, so nothing about the ordinary path changes.

### What the customer's card says

The amount stays the big number — ₹400, as asked. When the turf covered a difference, one quiet line
underneath keeps the receipt true: **"₹200 paid · ₹200 covered by the turf."** Without it the card
reads "Amount paid ₹400" against a ₹200 bank statement, which is the kind of mismatch that turns into
an argument at the gate. The owner board always shows both figures.

### Income: what the desk's total actually adds up

The number at the top of the ledger has to be money that reached the turf, not a sum of prices. It
does not need a chain walk — money enters the system exactly once per booking row, at the moment that
row was paid for, and that amount is `totalAmount − creditApplied`:

```
collected = Σ (totalAmount − creditApplied)    over rows that were actually paid for
refunded  = Σ refundAmount                      over rows with a refund recorded
income    = collected − refunded
```

Check it against the ₹200 → ₹400 owner move: the original contributes 200, the replacement
contributes `400 − 400 = 0`, total 200 — the cash, exactly. A customer move that collected a ₹200
difference contributes 200 on each row, total 400 — again the cash. Free owner bookings contribute 0
because they are priced at 0. Holds that were never paid contribute nothing, because rows that never
reached `CONFIRMED` are excluded.

That makes the whole figure one `aggregate` over the same indexed filter — two sums and a count, no
per-row work, which is why the total can cover the entire filtered set rather than the page.

The strip shows all three (**collected · refunded · income**) rather than one blended number: an
owner reconciling against a bank statement needs to see the refunds, not have them silently netted
away.

### One knock-on worth knowing about

If the customer later moves that ₹400 booking themselves, their credit is the ₹400 on the booking,
not the ₹200 they paid — so growing it to ₹600 costs them ₹200. That is the gift staying given, which
is right: we upgraded them for free and we do not quietly claw it back the next time they touch the
booking.

If money genuinely needs to come back, that is a cancel with a refund — the screen built for it.

---

## 6. Guards and edge cases

1. **Cancelling a booking with a live move attempt.** Today, cancelling a booking leaves any
   `PENDING` reschedule child alone — it can still be paid for minutes later, confirm, and hold slots
   for a booking that no longer exists. `cancelBooking` must, in its transaction, cancel every
   `PENDING` child (`rescheduleOfId = id`) with `RESCHEDULE_REPLACED` and delete its slot rows. This
   is a real defect in the current code, not new scope; the owner screen is just what makes it
   reachable.
2. **Cancelling the child itself** (a move that hasn't been paid for) must leave the original intact.
   It already does — the swap only happens on confirmation — but it gets a test.
3. **Past bookings.** `cancelBooking` already refuses `startsAt < now`; the card hides both buttons.
   §12.3 covers why "started" and not "finished".
4. **A moved booking has no payment id of its own — today that silently kills its refund.** A
   customer who pays ₹200, moves the booking for free and then cancels currently gets
   `refundMethod: NONE` and the note "nothing was charged for this booking", because
   `cancelByCustomer` tests `razorpayPaymentId` on the replacement, which is null. Their ₹200 is
   simply kept. `collectedOn` (§5) fixes this for both the customer and the owner path, and it is the
   same helper the new price rule needs — one change, two defects closed. This is a live bug in the
   code today, not new scope.
5. **Gateway refund with genuinely no payment** — a free owner booking, or an unpaid hold. Server
   throws `VALIDATION`; the UI disables the option and says why, so the owner never meets the error.
6. **Partial refunds** are allowed, and capped at the **cash collected**, not at `totalAmount` (§5).
7. **Double booking** is unchanged: the owner picker goes through the same
   `@@unique([turfId, slotStart])`, so an owner cannot double-book either, and a race returns the
   same `409 SLOTS_TAKEN` with the times named.
8. **An owner moving their own free booking** keeps `totalAmount = 0` and `bookedByOwner = true`.
   The price rule in §5 skips it explicitly: a booking the turf gave away must not acquire a price
   just because it was moved into a busier window.

---

## 7. Security

Nothing here relaxes an existing rule.

- Every owner route calls `requireOwner()`, which re-reads the role from the DB — removing an email
  from `OWNER_EMAILS` cuts access on the next request, not the next sign-in.
- `app/owner/layout.tsx` repeats the check for pages. The `proxy.ts` redirect stays what it is: a UX
  shortcut based on a cookie's presence, never an authorisation decision.
- Customer PII (name, email, phone) appears **only** in owner responses. `/api/slots` stays
  states-only.
- The client still sends no amount, no role and no refund outcome. The cancel panel sends a method
  and an amount the server re-checks against what was actually paid; the picker sends slot indexes
  the server turns into timestamps itself.
- Refund amounts are integer paise end to end.
- **The export is the largest pile of customer data this site will ever hand out**, so it is the
  strictest thing here: owner-only, `no-store`, filename derived from the filter (never from user
  input), row-capped, and logged with the owner's id and the filter they used. The move to `.xlsx`
  removed the formula-injection problem rather than adding one: a cell is a formula in a workbook
  only if it is written as one, so a name someone typed at sign-up starting with `=` is stored as
  the string it is — the CSV escaper that used to quote `=`, `+`, `-` and `@` is gone with the CSV.
- Every query param is parsed by zod and clamped before it reaches Prisma — `page_size` cannot be
  10,000, `q` is length-bounded, and dates go through `dateKeySchema`.

---

## 8. Copy

New file `content/owner.ts`, the single source for every word on these screens — same rule as every
other page. Plain wording, no gateway jargon:

- refund methods: **"Back the way they paid"** / **"I'll send it myself"** / **"No refund"**
- the covered-difference line on the customer's card, in `content/account.ts` alongside the rest of
  that page: **"{paid} paid · {covered} covered by the turf"**
- statuses: Confirmed · Awaiting payment · Cancelled · Played
- the confirmation sentence template, with `{when}`, `{players}`, `{amount}`, `{name}`
- the desk's own words: the page name **Owner desk**, the filter presets, the summary strip
  (**bookings · players · collected · refunded · income**), the empty state ("No bookings match that
  filter"), and every column heading in the table and the workbook — one list, used by both, so the sheet
  and the screen are labelled identically

The site-wide rules still apply: never name a slot length, always 2–14 players, no "racket" anywhere.

---

## 9. UI

- `components/owner/Ledger.tsx` (table ≥ lg, cards below), `OwnerBookingCard.tsx`, `CancelPanel.tsx`,
  `LedgerFilters.tsx` — the card and the inline confirm are modelled on
  `components/account/BookingList.tsx`, which already solves both, plus the `router.refresh()` after
  a change.
- **The filters are a `<form method="GET">`**, not a controlled client form. Submitting navigates to
  the same page with new params, so it works before hydration and with JS off, and the browser's back
  button walks the filter history for free. The only client code is the debounce on the search box,
  which just pushes the same URL sooner.
- Existing palette and `components/ui.tsx` primitives only. No new colours.
- Designed at 360 px: the table collapses to cards, the preset strip is a `.snap-strip`, the pager is
  two 48 px buttons with "Page 2 of 4" between them, every control ≥ 44 px, the date inputs are
  native `type="date"` (a phone's own picker beats anything we would build), and the amount input is
  `inputmode="numeric"` and ≥ 16 px so iOS doesn't zoom.
- `BookingFlow` gains one boolean prop, `asOwner`, orthogonal to the existing `reschedule` prop:
  it swaps the day window, drops the phone field and the price panel, and sends to the owner routes.
- The navbar learns one thing: `Navbar` already loads `currentUser()`, so `UserMenu` and `MenuDrawer`
  take `isOwner` and show an **Owner desk** entry above My bookings.
- Every client call goes through `apiJson` so the global loader behaves.

---

## 10. Schema

**No migration.** Every field these screens need already exists — `Booking.rescheduleOfId`,
`creditApplied`, `requestedSlots`, the refund columns, `User.phone` — and every query rides an
existing index (`[turfId, startsAt]`, `[turfId, status]`, `[rescheduleOfId]`). The ledger filters and
orders by `startsAt` within a turf, which is exactly `[turfId, startsAt]`.

Two things that *would* cost an index, neither of them in scope unless you ask:

- filtering by **booked date** instead of game date (§12.7) needs `@@index([turfId, createdAt])`;
- fuzzy search at a much larger scale needs `pg_trgm` GIN indexes on `User.name` and `User.email`.

---

## 11. Build order

| # | Step | Touches |
|---|---|---|
| 1 | `ownerQuerySchema`, `listOwnerBookings` (page + count + totals), `OwnerBookingDTO` + `content/owner.ts` | `lib/bookings.ts`, `lib/types.ts`, `lib/validation.ts`, `content/owner.ts` |
| 2 | `/owner` layout guard, ledger table + cards, filter form, pager, summary strip; navbar Owner desk | `app/owner/*`, `components/owner/*`, `UserMenu`, `MenuDrawer` |
| 3 | Cancel panel wired to the existing cancel route | `components/owner/CancelPanel.tsx` |
| 4 | `GET /api/owner/export` — .xlsx workbook, summary boxes, totals bands, measured widths, cap, audit line | `app/api/owner/export/route.ts` |
| 5 | `/owner/book` free booking (picker in owner mode) | `app/owner/book/page.tsx`, `BookingFlow` |
| 6 | `collectedOn()` + move every refund path onto it (§5) — **do this before step 7** | `lib/bookings.ts`, `components/account/BookingList.tsx` |
| 7 | Owner reschedule: `actor` in `createReschedule`, the price rule, `actorId` in the swap, new route, picker mode | `lib/bookings.ts`, `lib/validation.ts`, `app/api/owner/bookings/[id]/reschedule/route.ts` |
| 8 | Guards §6.1–6.2 + customer email on an owner-initiated move | `lib/bookings.ts`, `lib/email.ts` |
| 9 | Tests, mobile pass, lint/tsc/build | — |

Each step lands something usable on its own: after 3 you can run the turf from a phone, after 4 you
can hand your accountant a spreadsheet, after 5 you can block slots for a walk-in.

---

## 12. Decisions I took — say the word and I'll change any of them

1. **An owner move never bills and never refunds, but the booking does take the new price** (§5,
   your call on 22 Sep 2026). Two consequences I decided on rather than ask: a move into *cheaper*
   times leaves the figure where it is instead of writing it down below what was paid, and the card
   carries a "₹200 paid · ₹200 covered by the turf" line under the amount so the receipt still
   matches the customer's bank statement. Drop that line and the card claims a payment that never
   happened.
2. **An owner move emails the customer**, not just the owners. Their game time changed; they must
   hear it from us and not at the gate. Owner cancels already email the customer. (Both are dead
   until `EMAIL_FROM` points at a verified Resend domain — still outstanding, see `CLAUDE.md`.)
3. **"Not gone" means the game hasn't started** (`startsAt > now`), so a 9:30 PM slot loses its
   buttons at 9:30 PM, not at 10:00 PM. It matches the guard `cancelBooking` already enforces, and
   half a slot is not something to resell.
4. **No `/owner/bookings/[id]` page.** `docs/UI-PLAN.md` sketched one, but the request is for every
   detail in the list, and a second screen on a phone is a step backwards. Cancel is an inline panel.
5. **Abandoned payment attempts are hidden** from the Cancelled tab (expired holds, failed payments,
   superseded move attempts) — same filter the customer's list uses. Say so if you want them.
6. **Owner bookings stay uncapped** in slots and keep the 2–14 player range from the Turf row.
7. **The date filter is on the game day**, not the day the booking was made — "22-09 to 30-09" means
   games played in that week, which is how a ground's takings are usually read. Filtering by booked
   date instead is a one-line change plus an index (§10); say which you want and I'll make it the
   default, or add a toggle for both.
8. ~~**The download is a CSV**~~ — **overruled** (owner, 23 Sep 2026): *"in download csv file
   download i want xlsx"*. `exceljs` is now a dependency and the route writes a real workbook; §7
   above describes what it looks like and why. The one cost that came with it: exceljs carries a
   transitive **moderate** `uuid` advisory, on a code path it does not use (it never passes `buf`).
9. **The page is named "Owner desk"** in the navbar and as its H1. Alternatives if you prefer:
   "Bookings", "Turf desk", "Admin". One word from you and it changes everywhere, since it lives in
   `content/owner.ts`.
10. **Default page size 25**, options 10 / 25 / 50 / 100, and the pager is Prev/Next with "Page 2 of
    4" rather than numbered pages — on a phone, numbered pages are a row of 30 px tap targets.

---

## 13. Verification before it's called done

- vitest integration, the money cases first:
  - **₹200 → ₹400 owner move**: the customer's card reads ₹400, `payableAmount` is 0, no Razorpay
    order exists, and cancelling it afterwards refunds **₹200**, not ₹400.
  - **₹400 → ₹200 owner move**: the figure stays ₹400 and a later cancel refunds ₹400.
  - A free owner booking moved into a priced window stays at ₹0.
  - `collectedOn` returns `totalAmount` + the booking's own payment id for a booking that was never
    moved, and follows the chain for one that was — including the free customer move whose refund is
    broken today (§6.4).
  - An owner move frees the old times, takes the new ones, retires the original with the **owner**
    as canceller, and cancelling a booking kills its pending move attempt.
- Two simultaneous owner bookings for the same slot → exactly one wins, the other gets `SLOTS_TAKEN`.
- vitest on the ledger, against seeded data whose answer is known by hand:
  - a range of **22 Sep → 30 Sep** returns exactly the games in those days, inclusive at both ends,
    including a 12:30 AM slot that belongs to the previous business day;
  - `income` equals `collected − refunded` and matches the sum worked out by hand across a chain
    containing an owner move, a paid customer move and a free owner booking;
  - the totals are identical on page 1 and page 3 — they describe the filter, not the page;
  - `page=999` returns the last page rather than an error, `page_size=10000` is clamped, and a `q`
    full of `%` and `_` matches literally instead of being read as SQL wildcards;
  - search finds a booking by reference, by phone, and by a name in the wrong case.
- The export: row count and totals row match the screen for the same filter, a customer named
  `=cmd()` comes back quoted and inert, and the file opens in Excel with ₹ and any non-ASCII name
  intact (that is what the BOM is for).
- The owner page and export are refused for a signed-in customer and for a signed-out visitor.
- Playwright at 360 and 1280 on `/owner` and `/owner/book`: `scrollWidth === clientWidth`, no console
  errors, screenshots.
- `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`, `npm run build`.
- A live pass in Razorpay test mode: book as a customer, pay, then cancel it from `/owner` with
  "back the way they paid" and confirm the refund lands in the Razorpay dashboard.
