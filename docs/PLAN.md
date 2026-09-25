# Cricket Turf Booking — Project Plan

Single-turf booking website. Public info page, Google login, 7-day slot grid, online payment, owner controls.

---

## 1. Scope

**In scope (v1)**

- Public turf information page: name, address, contact, photos, map, owner details
- Google login for customers
- 7-day rolling slot grid, 30-minute slots, 6:00 AM → 1:00 AM next day
- Multi-slot selection, 2–14 people, ₹50 per person per half hour
- Online payment (UPI / PhonePe / GPay / card / netbanking via Razorpay)
- Booking confirmation email to owners only
- Owner login: free booking, cancellation, refund recording
- Slot colour states: free / selected / held / booked

**Out of scope (v1)**

- Multiple turfs (schema supports it, UI assumes one)
- Customer booking history page
- Partial cancellation of a booking
- SMS / WhatsApp notifications
- Coupons, memberships, recurring bookings

---

## 2. Stack

| Layer | Choice |
|---|---|
| Language | TypeScript (frontend + backend) |
| Framework | Next.js 15, App Router |
| Styling | Tailwind CSS + shadcn/ui |
| Database | PostgreSQL (Neon or Supabase) |
| ORM | Prisma |
| Auth | Auth.js (NextAuth v5), Google provider |
| Payments | Razorpay |
| Email | Resend |
| Hosting | Vercel |
| Cron | Vercel Cron |

One language, one repo, one deploy. Frontend and backend live in the same Next.js project — API routes *are* the backend.

---

## 3. Project structure

```
turf-booking/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                          turf info (public, server component)
│   ├── book/
│   │   └── page.tsx                      slot grid + checkout
│   ├── booking/
│   │   └── [id]/page.tsx                 post-payment status page
│   ├── owner/
│   │   ├── page.tsx                      dashboard: today + upcoming
│   │   └── bookings/[id]/page.tsx        detail + cancel form
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── slots/route.ts                GET  slot states for a date
│       ├── bookings/route.ts             POST create pending booking
│       ├── bookings/[id]/route.ts        GET  booking status (polled)
│       ├── bookings/[id]/cancel/route.ts POST owner cancel + refund
│       ├── owner/book/route.ts           POST owner free booking
│       ├── webhooks/razorpay/route.ts    POST payment events
│       └── cron/expire-holds/route.ts    GET  sweep expired holds
├── components/
│   ├── SlotGrid.tsx
│   ├── SlotCell.tsx
│   ├── DayTabs.tsx
│   ├── PeopleCounter.tsx
│   ├── PriceSummary.tsx
│   └── CancelDialog.tsx
├── lib/
│   ├── db.ts                             Prisma singleton
│   ├── auth.ts                           Auth.js config + role logic
│   ├── slots.ts                          slot + business-date logic
│   ├── pricing.ts                        SERVER ONLY
│   ├── razorpay.ts                       SDK client
│   ├── email.ts                          Resend templates
│   └── types.ts                          shared types
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── .env                                  never commit
├── .env.example                          commit this
└── vercel.json                           cron config
```

---

## 4. Database schema

```prisma
generator client { provider = "prisma-client-js" }
datasource db    { provider = "postgresql"; url = env("DATABASE_URL") }

enum Role          { CUSTOMER OWNER }
enum BookingStatus { PENDING CONFIRMED CANCELLED }
enum RefundMethod  { GATEWAY MANUAL NONE }
enum RefundStatus  { PENDING COMPLETED FAILED }

model User {
  id        String    @id @default(cuid())
  email     String    @unique
  name      String?
  image     String?
  phone     String?
  role      Role      @default(CUSTOMER)
  createdAt DateTime  @default(now())
  bookings  Booking[] @relation("CustomerBookings")
  cancelled Booking[] @relation("CancelledBy")
}

model Turf {
  id          String    @id @default(cuid())
  name        String
  description String?
  address     String
  phone       String
  email       String
  lat         Float
  lng         Float
  images      String[]
  ownerName   String
  ownerPhone  String
  openHour    Int       @default(6)    // 6 AM
  closeHour   Int       @default(25)   // 1 AM next day
  pricePerPersonPerSlot Int @default(50)
  minPeople   Int       @default(2)
  maxPeople   Int       @default(14)
  isActive    Boolean   @default(true)
  bookings    Booking[]
  slots       Slot[]
}

model Booking {
  id              String        @id @default(cuid())
  idempotencyKey  String        @unique
  turfId          String
  userId          String
  numPeople       Int
  slotCount       Int
  totalAmount     Int           // paise
  status          BookingStatus @default(PENDING)
  bookedByOwner   Boolean       @default(false)

  razorpayOrderId   String?     @unique
  razorpayPaymentId String?
  paymentMethod     String?     // upi | card | netbanking | wallet

  cancelledById   String?
  cancelledAt     DateTime?
  cancelReason    String?

  refundMethod    RefundMethod?
  refundAmount    Int?
  refundStatus    RefundStatus?
  refundReference String?       // Razorpay refund id OR UPI UTR OR "cash"
  refundNote      String?
  refundMarkedBy  String?
  refundMarkedAt  DateTime?

  expiresAt       DateTime?     // pending holds only
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  turf            Turf          @relation(fields: [turfId], references: [id])
  user            User          @relation("CustomerBookings", fields: [userId], references: [id])
  canceller       User?         @relation("CancelledBy", fields: [cancelledById], references: [id])
  slots           Slot[]

  @@index([turfId, status])
  @@index([status, expiresAt])
}

model Slot {
  id           String   @id @default(cuid())
  bookingId    String
  turfId       String
  slotStart    DateTime @db.Timestamptz
  businessDate DateTime @db.Date

  booking      Booking  @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  turf         Turf     @relation(fields: [turfId], references: [id])

  @@unique([turfId, slotStart])        // ← prevents double booking
  @@index([turfId, businessDate])
}
```

**The two lines that matter most**

- `@@unique([turfId, slotStart])` — the database physically rejects a second booking on the same slot. This, not application code, is what guarantees correctness under concurrency.
- `onDelete: Cascade` — deleting a booking frees its slots automatically.

Never hard-delete a booking row. Cancellation sets `status = CANCELLED` and deletes only the `Slot` rows.

Store money as **paise** (integers). `₹1,200 → 120000`. No floats anywhere near money.

---

## 5. Core domain logic

### 5.1 Business date

A "booking day" runs 6:00 AM → 1:00 AM the next calendar day. The 12:00 AM and 12:30 AM slots belong to the *previous* business date.

```ts
// lib/slots.ts
const IST = 'Asia/Kolkata';
const SLOTS_PER_DAY = 38;        // 6:00 AM → 12:30 AM inclusive, 30-min steps

// Returns 38 UTC timestamps for a given business date
export function generateSlots(businessDate: Date): Date[] {
  const start = zonedTimeToUtc(`${format(businessDate)}T06:00:00`, IST);
  return Array.from({ length: SLOTS_PER_DAY },
    (_, i) => addMinutes(start, i * 30));
}

// Which business date does a timestamp belong to?
export function businessDateOf(ts: Date): Date {
  const ist = utcToZonedTime(ts, IST);
  return ist.getHours() < 6 ? startOfDay(subDays(ist, 1)) : startOfDay(ist);
}

// The 7-day window shown to customers
export function visibleDates(now: Date): Date[] {
  const today = businessDateOf(now);
  return Array.from({ length: 7 }, (_, i) => addDays(today, i));
}
```

Vercel runs in UTC. Never use `new Date().getHours()` for business logic — always convert to IST explicitly. Write unit tests for `businessDateOf` at 11:59 PM, 12:00 AM, 12:30 AM, 1:00 AM, and 5:59 AM before building anything on top of it.

### 5.2 Pricing

```ts
// lib/pricing.ts — imported by API routes ONLY
export function calculateTotal(
  numPeople: number,
  slotCount: number,
  pricePerPersonPerSlot: number
): number {
  return numPeople * slotCount * pricePerPersonPerSlot * 100; // paise
}
```

The frontend computes an identical number for display. The server result is the only one that reaches Razorpay. Never accept an amount from the client.

### 5.3 Slot states

| State | Colour | Meaning |
|---|---|---|
| `free` | green | available |
| `selected` | blue | this user's current selection (client-side only) |
| `held` | yellow | pending booking, `expiresAt > now()` |
| `booked` | red | confirmed |
| `past` | grey | `slotStart < now()`, not selectable |

`GET /api/slots?turfId=&date=` returns state per slot and **nothing else**. No customer names, phones or booking IDs — that payload is visible in DevTools.

Because the query filters on `expiresAt > now()`, abandoned holds return to green automatically with no cleanup needed.

**Accessibility:** red/green is exactly the pair colourblind users can't separate (~1 in 12 men). Every cell carries an icon and text label in addition to colour: `✓ Available`, `⏱ Locked`, `✕ Booked`.

---

## 6. API routes

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/slots` | GET | public | slot states for one business date |
| `/api/bookings` | POST | customer | create pending booking + Razorpay order |
| `/api/bookings/[id]` | GET | owner of booking | status polling after payment |
| `/api/bookings/[id]/cancel` | POST | **owner** | cancel + record refund |
| `/api/owner/book` | POST | **owner** | free booking, instantly confirmed |
| `/api/webhooks/razorpay` | POST | signature | payment captured / failed |
| `/api/cron/expire-holds` | GET | `CRON_SECRET` | sweep expired pending holds |

Every route that mutates data reads the role from the **server session**, never from the request body.

---

## 7. Customer booking flow

```
1. Pick date tab → grid loads, polling starts (10s interval)
2. Select slots (multi-select) + set people count (2–14)
3. Price shown (display only)
4. Click Proceed → Google login if not signed in
5. POST /api/bookings
   ├─ validate: slots within 7-day window, not past, contiguous check optional
   ├─ validate: 2 ≤ people ≤ 14
   ├─ recalculate price server-side
   ├─ TRANSACTION:
   │    DELETE expired holds on these exact slots
   │    INSERT booking (PENDING, expiresAt = now + 15 min)
   │    INSERT slot rows        ← unique index enforces exclusivity
   ├─ on P2002 → 409 { error: 'SLOTS_TAKEN', taken: [...] }
   └─ create Razorpay order, return orderId
6. Razorpay checkout opens (UPI / PhonePe / GPay / card / netbanking)
7. Webhook arrives → verify signature → status = CONFIRMED
8. Email to owners
9. Customer's status page polls /api/bookings/[id] until CONFIRMED
```

### 7.1 The concurrency guarantee

```
t=0.000  P1 POSTs  → INSERTs slot rows 6:00, 6:30, 7:00, 7:30
t=0.004  P2 POSTs  → attempts same rows → BLOCKS on unique index
t=0.030  P1 commits
t=0.030  P2 unblocks → unique violation (Prisma P2002) → 409
```

Postgres does the waiting. There is no window between "check" and "write" because there is no separate check. Slot rows are inserted **before** payment, so P2 is blocked the moment P1 clicks Proceed.

**Partial overlap:** if P1 holds 6:00–7:00 and P2 wants 6:30–7:30, the whole transaction rolls back. P2 gets nothing rather than half a booking. That's intended.

### 7.2 Idempotency

The client generates a UUID per checkout attempt and sends it as `idempotencyKey`. The unique constraint stops a double-tapped Proceed button from creating two pending bookings.

### 7.3 Hold expiry

Two layers:

1. **Inline** — the `DELETE` at the top of the booking transaction clears dead holds on the requested slots immediately.
2. **Cron** — every 10 minutes, sweep globally so the grid looks correct even when nobody is booking.

```json
// vercel.json
{ "crons": [{ "path": "/api/cron/expire-holds", "schedule": "*/10 * * * *" }] }
```

### 7.4 Late webhook edge case

Hold expires at minute 15; webhook arrives at minute 16 saying paid; slots may be gone.

Handler must re-check slot availability before confirming. If genuinely taken: call Razorpay refund API, set `status = CANCELLED`, `refundMethod = GATEWAY`, and email the customer. Rare, but without this code path you have taken money for a slot you cannot deliver.

15 minutes is deliberately generous — well past a normal UPI payment.

---

## 8. Owner flow

### 8.1 Identifying owners

`OWNER_EMAILS` env var, comma-separated. On sign-in, Auth.js sets `role = OWNER` if the Google email matches. Role lives on the `User` row and is read from the server session on every protected route.

```ts
const session = await auth();
if (session?.user?.role !== 'OWNER') return new Response(null, { status: 403 });
```

### 8.2 Free booking

`POST /api/owner/book` — same transaction as a customer booking, but:

- `status = CONFIRMED` immediately, no PENDING stage
- `totalAmount = 0`, `bookedByOwner = true`
- no Razorpay order, no `expiresAt`
- no email (the owner already knows)

Still subject to the unique index. An owner cannot double-book either.

### 8.3 Cancellation

Owners can cancel any booking, including paid ones.

```ts
await prisma.$transaction(async (tx) => {
  await tx.slot.deleteMany({ where: { bookingId: id } });   // frees slots

  let ref = refundReference;
  if (refundMethod === 'GATEWAY') {
    const r = await razorpay.payments.refund(booking.razorpayPaymentId!, {
      amount: refundAmount, speed: 'normal',
    });
    ref = r.id;
  }

  await tx.booking.update({
    where: { id },
    data: {
      status: 'CANCELLED',
      cancelledById: session.user.id,
      cancelledAt: new Date(),
      cancelReason: reason,
      refundMethod, refundAmount, refundReference: ref, refundNote: note,
      refundStatus: refundMethod === 'GATEWAY' ? 'PENDING' : 'COMPLETED',
      refundMarkedBy: session.user.id,
      refundMarkedAt: new Date(),
    },
  });
});
```

**Guards**

- Confirm dialog must show real numbers: *"Cancel Sun 14 Sep, 7:00–8:00 AM, 8 people, refund ₹1,600 to Rahul?"* — not a generic "Are you sure?". Owners tap things by accident on phones.
- Hide the cancel button once `slotStart < now()`. Past slots can't be meaningfully freed or refunded through this flow.

---

## 9. Refunds

Three methods, one field:

| Method | Money path | Speed | Reference to store |
|---|---|---|---|
| `GATEWAY` | Razorpay pulls from your settlement | 5–7 working days | Razorpay refund ID (auto) |
| `MANUAL` | You send UPI / cash yourself | instant | **UTR or note — required** |
| `NONE` | No refund (no-show, reschedule) | — | required note |

The slot deletion is identical in all three. Only money handling differs.

**Make `refundReference` a required form field for MANUAL.** An unexplained manual refund is indistinguishable from no refund three months later.

**Chargeback risk.** If a customer disputes with their bank, the bank asks Razorpay for proof. A gateway refund is in the record and the dispute closes. A manual refund is invisible to Razorpay — you must produce evidence yourself or pay twice.

Suggested default, prefilled by `paymentMethod` stored at webhook time:

- **card / netbanking → GATEWAY** (chargebacks are a real mechanism there)
- **UPI → MANUAL** (chargebacks rare, small amounts, instant repayment keeps customers happy)

Note the MDR (~2%) is not returned on a refund either way. Manual saves no fees, it only changes who moves the money.

---

## 10. Emails (Resend)

| Trigger | To | Contains |
|---|---|---|
| Booking confirmed | **owners only** | date, slots, people, amount, customer name + phone |
| Booking cancelled | **owners + customer** | slots cancelled, reason, refund amount + method + ETA |
| Late-webhook refund | customer | apology, full refund detail |

Your original plan said owners only, never the customer. Correct for normal bookings — the customer sees on-screen confirmation. **Not correct for cancellations.** If someone paid ₹1,200 for Sunday 7 AM and the slot silently disappears, they will show up at the gate.

Cancellation email must state the refund precisely:

- gateway → "₹1,600 refunded to your original payment method, 5–7 working days"
- manual → "₹1,600 sent to your UPI, ref 4287xxxxxx"
- none → whatever was agreed, plainly

Never send "refunded" without saying how. That's the message that generates the phone call.

---

## 11. Security rules

1. **Never trust a client-sent amount.** Recalculate server-side every time.
2. **Never trust a client-sent role.** Read from server session.
3. **Never confirm a booking from a browser redirect.** Only the signed webhook confirms.
4. **Verify the Razorpay webhook signature** with `RAZORPAY_WEBHOOK_SECRET` before parsing.
5. **Never expose other customers' data** in `/api/slots`. State only.
6. **Secrets stay server-side.** Only `NEXT_PUBLIC_*` reaches the browser. `RAZORPAY_KEY_ID` is public; `RAZORPAY_KEY_SECRET` is not.
7. **Rate-limit** `/api/bookings` per user. A known lever if someone holds slots to block a competitor: cap active holds at 2 per user.
8. Never commit `.env`.

---

## 12. Environment variables

```bash
DATABASE_URL=

AUTH_SECRET=                    # npx auth secret
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
NEXTAUTH_URL=

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=    # public key, checkout needs it

RESEND_API_KEY=
OWNER_EMAILS=you@gmail.com,partner@gmail.com

CRON_SECRET=
NEXT_PUBLIC_GOOGLE_MAPS_KEY=
```

Commit `.env.example` with empty values.

---

## 13. Build phases

**Phase 1 — Foundation**
Next.js + Prisma + Neon. Schema migrated. Seed one turf. Info page renders details, photos, Google Maps embed. No auth.

**Phase 2 — Slot logic**
`lib/slots.ts` complete. Unit tests for the midnight rollover before any UI. This is where bugs hide.

**Phase 3 — Grid, read-only**
`GET /api/slots`. Day tabs, 38 cells, green/yellow/red rendering. Insert a fake booking manually to verify colours.

**Phase 4 — Selection**
Multi-select, blue state, people counter with 2–14 limit, live price total.

**Phase 5 — Auth**
Auth.js + Google. Server session. `OWNER_EMAILS` → role.

**Phase 6 — Booking API**
The transaction, unique index, pending holds, idempotency key, 409 handling with taken-slot list. **Test concurrency here before moving on** — fire two simultaneous requests for the same slots and confirm exactly one wins.

**Phase 7 — Payments**
Razorpay test mode, checkout, webhook, signature verification, status page polling.

**Phase 8 — Owner**
Dashboard, free booking, cancellation, refund form.

**Phase 9 — Notifications & cleanup**
Resend templates, cron sweep, grid polling with visibility pause.

**Phase 10 — Polish**
Mobile layout, tap-to-show hints (hover doesn't exist on phones), loading states, empty states, error boundaries.

Phases 1–6 are the actual project. Payments are mostly following Razorpay's docs.

---

## 14. Copy

Avoid raw technical wording in the UI.

- Yellow: **"Being booked by someone else."** Then: *"This slot will free up in a few minutes if they don't complete payment."* The second sentence tells the user it's worth waiting.
- Red: **"Already booked."**
- 409 error: **"6:00 and 6:30 were just booked by someone else."** Keep the rest of their selection intact.

---

## 15. Pre-launch

- [ ] **Razorpay KYC** — business PAN, bank account, GST if applicable. Approval takes days. **Start this now**, it's the only item with external lead time. Test mode works immediately, so build against it while waiting.
- [ ] Google OAuth consent screen published (not in test mode — test mode caps you at 100 users)
- [ ] Production redirect URIs added in Google Cloud Console
- [ ] Webhook URL registered in Razorpay dashboard, pointed at the deployed domain
- [ ] Resend sending domain verified (otherwise mail lands in spam)
- [ ] Cron secret set in Vercel
- [ ] Concurrency tested against the production database
- [ ] Refund flow tested end to end in test mode
- [ ] Timezone verified on Vercel (runs UTC — confirm 12:30 AM slots land on the right business date)
- [ ] Cancellation policy written and shown before payment
- [ ] Talk to whoever handles your accounts about GST treatment of cancellations, and how manual refunds should be recorded. Gateway and manual refunds may need different handling.

---

## 16. Decisions still open

1. **Cancellation policy** — can customers cancel at all in v1, or owner-only? Owner-only is simpler and matches the current plan.
2. **Refund policy per reason** — owner's fault and rain both suggest full refund; no-show is your call. Write it down and show it before payment.
3. **Hold duration** — 15 min recommended. Shorter frustrates slow payers, longer blocks slots pointlessly.
4. **Contiguous slots only?** — should 6:00 + 9:00 in one booking be allowed, or must slots be adjacent? Allowing gaps is simpler; requiring contiguity matches how turfs are actually used.
5. **Advance window** — 7 days fixed, or configurable per turf?

---

## 17. Quick reference

```
Slots per day     38  (6:00 AM → 12:30 AM, 30-min steps)
Business day      6:00 AM → 1:00 AM next calendar day
Visible window    7 days including today
People            min 2, max 14
Price             ₹50 × people × slots
Hold duration     15 minutes
Poll interval     10 seconds (paused when tab hidden)
Cron sweep        every 10 minutes
Money stored as   paise (integer)
Timezone          Asia/Kolkata, explicit — Vercel runs UTC
```
