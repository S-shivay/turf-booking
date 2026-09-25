@AGENTS.md

# Turf Booking — Project Guide

Single-turf **box cricket** booking website: information pages + a 7-day slot grid with online payment + owner tools. Real money flows through it, so **security, correctness under concurrency, low latency, and mobile-first UX are non-negotiable**.

- Full product plan: `docs/PLAN.md` (source of truth for scope, flows, phases, open decisions).
- Homepage spec: `docs/HOMEPAGE-SPEC.md` — **the built homepage follows this; edit copy in `content/home.ts`, not JSX.**
- Other pages: `docs/UI-PLAN.md` (draft, superseded on palette/navbar by the homepage spec).
- Going live: `docs/DEPLOY-VERCEL.md` — the deploy runbook (Vercel, Neon, Google, Razorpay, Resend, cron), written for whoever is putting it live. **Change what a provider needs and change that doc in the same commit.**
- Everything below is a hard rule unless it says "prefer".

## Status (14 Sep 2026)

| Area | State |
|---|---|
| Schema + migrations (Neon Postgres) | done — `prisma/schema.prisma` |
| Slot / business-date logic + unit tests | done — `lib/slots.ts`, `lib/slots.test.ts` (16 tests) |
| Booking service (holds, P2002→409, idempotency, expiry, webhook confirm, late-payment refund, owner cancel/refund) | done — `lib/bookings.ts` |
| API routes (slots, bookings, status, cancel, owner/book, webhook, cron) | done — `app/api/**` |
| Auth (Auth.js v5 + Google, JWT, OWNER_EMAILS) | done — `lib/auth.ts` |
| Razorpay, Resend, validation, CSP proxy, security headers | done |
| **Homepage** | **built** to `docs/HOMEPAGE-SPEC.md` (multi-sport, animated, mobile-first) — `app/page.tsx`, `content/home.ts`, `components/home/*` |
| **Book slot `/book` + status `/booking/[id]`** | **built** — day strip, live grid (10 s poll), players, phone, Razorpay checkout, status poller — `app/book/`, `app/booking/[id]/`, `components/book/*`, `content/book.ts`, `lib/checkout.ts` |
| **About `/about` + Contact `/contact`** | **built** (16 Sep 2026) — the navbar/footer links point at these, so they are real pages, not anchors — `app/about/`, `app/contact/`, `content/about.ts`, `content/contact.ts`. Contact has no message form (call/WhatsApp/email only); `POST /api/contact` from `docs/UI-PLAN.md` §5 is still an open decision |
| **Privacy `/privacy`** | **built** (19 Sep 2026) — summary card, TOC, 11 numbered sections, contact/grievance block — `app/privacy/`, `content/privacy.ts`. **It describes what the code actually does** (Google sign-in, phone on the booking form, Razorpay, Resend, no analytics, no IP in our DB); change the data the app handles and change this page in the same commit, or it becomes a false statement to customers. |
| **Terms `/terms`** | **built** (19 Sep 2026) — 14 sections. Cancellation moved out to its own page (row below); the `#cancellation` section that remains is a two-paragraph pointer that incorporates the policy by reference — **keep that id**, old links and bookmarks still aim at it. Owner rules baked in: 24 h cancel/reschedule window, **children under 10 free and not counted, national ID required as proof of age**, non-marking shoes, no smoking/alcohol/tobacco. **Never name a business the owner has not given you** — `site.legalName` is empty by default and the terms name the turf itself as the contracting party; it only appears if `NEXT_PUBLIC_LEGAL_NAME` is set. Like `/privacy` it states what the code enforces — the {hold}-minute hold, gateway-only confirmation, failed payment releasing slots — so code and copy change together. |
| **Cancellation `/cancellation`** | **built** (19 Sep 2026, owner) — its own page, not a `/terms` anchor, because the footer calls it "Cancellation Policy" and a policy people are sent to should be a destination. 8 sections: notice window, how to cancel, rescheduling, refunds, unpaid holds, turf-initiated cancellation, sessions ended early, contact — `app/cancellation/`, `content/cancellation.ts`. `NOTICE_HOURS` (24) is the single source for the window; `/terms` §cancellation points here and `/book`'s FAQ names it. Like the other legal pages it states what the code does (the {hold}-minute hold expiring on its own, a failed payment releasing slots, a late payment auto-refunded). |
| **Account: login + `/my-bookings`** | **built** (21 Sep 2026, owner) — the navbar carries Log in when signed out and the customer's name → My bookings / Log out when signed in (`components/UserMenu.tsx`, desktop; the same entries live in `MenuDrawer` on phones, where there is room). `/my-bookings` lists every booking that became real with its full receipt — times, players, amount, method, transaction and order id, reference, refund — plus **Cancel** and **Reschedule** while the game is >24 h away. Noindex, `force-dynamic`. `app/my-bookings/`, `components/account/BookingList.tsx`, `content/account.ts`. Abandoned payment attempts (`HOLD_EXPIRED`/`PAYMENT_FAILED`/`PAYMENT_UNAVAILABLE`) are filtered out — noise, not history. |
| **Owner desk `/owner` + `/owner/book`** | **built** (22 Sep 2026, owner) to `docs/OWNER-PLAN.md`. `/owner` is the lifetime ledger: every booking with full customer detail (name, email, phone — they appear nowhere else on the site), **filtered entirely from the URL** (`q`/`from`/`to`/`on`/`status`/`page`/`page_size`, parsed by `parseOwnerQuery`, built by `lib/owner-url.ts`) so a view is bookmarkable and the download carries the same query; **ordered newest-booked first** (`createdAt desc, id desc` — there is no sort control, and the date presets do not change it); totals cover the **whole filter, never the page** and carry a fourth tile, **Blocked**, worth what the turf's own free bookings would have sold for (counted apart from Income, which is money that actually arrived); table from `lg`, cards below. **Move** shows only on a booking that is `CONFIRMED` and still ahead (`movable`), **Cancel** on anything not already cancelled and still ahead (`cancellable`) — an unpaid booking has nothing to carry across, so it gets Cancel alone. Every filter, page and preset routes through one `useTransition` (`components/owner/LedgerNav.tsx`): React suppresses a Suspense fallback for content already on screen inside a transition, so the keyed boundary covers the first arrival at a view and a dimming `PendingVeil` covers every change after it. Dates are picked in `components/owner/DateRangePicker.tsx` (month grid, six quick ranges, bottom sheet on phones) with hidden `from`/`to` inputs so the GET form still works unhydrated. Cancel is an inline panel with the three refund choices and a confirmation sentence carrying real numbers. `/owner/book` is the picker in owner mode (30 days, uncapped, no phone, no price, no payment) and `?reschedule=<id>` moves anyone's booking. `GET /api/owner/export` is a real `.xlsx` (exceljs, 24 Sep 2026): the site's palette as cell fills, six summary boxes across the top, a frozen dark header on row 7, zebra rows, a coloured Status cell per state, ₹ as a number format (never a string — the figures must add up), and TOTAL / INCOME / BLOCKED bands at the foot. **Column widths are measured from the data as it streams past** (`widest[]` → `min`/`max` per column, and a column whose longest value still does not fit wraps instead) so nobody drags a border on open; headings carry `ARROW` of extra room because Excel paints the filter button over the right of the cell. Owner-only via `requireOwner()` in `app/owner/layout.tsx` (404, not 403). `app/owner/*`, `components/owner/*`, `content/owner.ts`. |
| **An owner move takes the new price but moves no money** | owner, 22 Sep 2026. `totalAmount = max(list price, cash already taken)` — never below what was paid, and a free turf booking stays free — with `creditApplied = totalAmount`, so `payableAmount` is 0, no Razorpay order exists and the swap lands in one transaction. **Therefore `totalAmount` is a price, not a receipt**: every refund path reads `collectedOn()` instead, which walks the reschedule chain for the cash actually taken *and* the payment id to pull it back from. That also fixed a live bug — a customer who moved a booking for free and then cancelled was refunded nothing, because the replacement had no payment id of its own. Both cards show `{paid} paid · {covered} covered by the turf` whenever the two differ; income is `Σ(totalAmount − creditApplied) − refunds`, which needs no chain walk because money enters once per row. |
| Concurrency test, Razorpay test-mode run, Lighthouse | pending |

## Product rules (from `docs/PLAN.md`)

- **One turf** (schema is multi-turf-ready; UI assumes one). Seeded by `prisma/seed.ts`.
- **Slot = 30 min.** Business day 6:00 AM → 1:00 AM next day = **38 slots**; the 12:00/12:30 AM slots belong to the *previous* business date. **Timezone is `Asia/Kolkata` explicitly** — Vercel runs UTC; never use `Date#getHours()` for business logic.
- **Price = ₹50 × people × slots**, 2–14 people. **Money is integer paise.** Server recomputes every amount; the client's figure is display-only.
- **Customers see 7 days; owners 30.** Customer bookings cap at 12 slots; owners are uncapped.
- **Hold = 15 min** (`PENDING`, `expiresAt`). Slot rows are inserted at hold time, before payment. `@@unique([turfId, slotStart])` is the double-booking guarantee — never remove it.
- **A failed payment ends the hold immediately** (owner's rule, 16 Sep 2026). The 15 minutes only exist while money may still arrive: nobody has tried yet, or an attempt is in flight (`created`/`pending`/`authorized`). Once the gateway shows attempts and **every one failed**, `releaseFailedHold` cancels with `cancelReason: 'PAYMENT_FAILED'` and deletes the Slot rows, and the status page says "Payment failed — pick your times again" instead of counting down. `allAttemptsFailed` (`lib/payments.ts`, unit-tested) is the predicate; it is deliberately false for an empty attempt list. Trade-off accepted: a customer retrying after a failure loses the slot rather than the next customer being blocked by a dead hold.
- **Only the signed Razorpay webhook confirms a booking** — or the server asking Razorpay itself (`reconcileFromGateway` → `POST /api/bookings/[id]/reconcile`), which runs the identical `confirmPayment` path. Never confirm from a browser redirect or the checkout `handler`: the client may name a booking id, never a payment outcome. Reconcile exists because a webhook can be late, fail delivery, and can never reach `localhost` at all — without it a paid booking sits on "Waiting for your payment" in dev. It fires for any booking created in the last 24 h that has an order but **no payment tied to it yet — including one already `CANCELLED` by hold expiry**: someone can pay in the last seconds of a hold, and without that check we keep money for a slot we never delivered (`confirmPayment` refunds it automatically). The status page therefore calls reconcile once on arrival whatever the booking's status says.

- **Capture, don't assume**: an account without auto-capture leaves a successful payment at `authorized` — the customer has paid, the money is not ours, and `payment.captured` never fires. Both the webhook (`payment.authorized`) and reconcile capture it explicitly.
- **Cancellation**: owners can cancel anything; **customers can cancel and reschedule their own booking while it is more than `CHANGE_WINDOW_HOURS` (24 h) away** (owner, 21 Sep 2026) — `withinChangeWindow()` in `lib/slots.ts` is the single predicate, used by the DTO, the picker and the server. Inside the window the buttons disappear and the copy points at the phone. Either route sets `CANCELLED` + deletes `Slot` rows; never hard-deletes a `Booking`. Refund methods: `GATEWAY` (Razorpay), `MANUAL` (UTR required), `NONE` (note required). A customer cancel takes **no body at all** — its own route (`customer-cancel`) so there is no refund method, amount or note a customer could name; the server derives `GATEWAY` vs `NONE` from what was actually paid.
- **Reschedule = a second Booking that replaces the first once paid** (owner, 21 Sep 2026). `rescheduleOfId` links them, `creditApplied` carries the money across, `requestedSlots` records what was asked for. Three rules make it safe: the original keeps its times until the replacement confirms (an abandoned move costs the customer nothing); the times the two **have in common stay with the original**, so a half-finished move can never strand a slot; and the swap — free the original's rows, insert the missing ones, retire the original — happens in **one transaction**, inside `confirmPayment` when money is owed or inside `createReschedule` when it is not.
- **A move may never shrink a booking.** `numPeople >= original` **and** `slotCount >= original`, so `payableAmount = totalAmount - creditApplied` is never negative and a reschedule never produces a refund. Enforced in `createReschedule` *and* expressed in the picker as controls — the stepper will not go below the booking's players and the CTA stays off below its number of times. **Never write copy explaining the rule** (owner, 21 Sep 2026): the picker opens on the booking's own day with its own times already selected, so the floor is simply where the customer starts. `/cancellation` and `/terms` do state it, because a policy page that promised refunds we will not pay would be a false contract.
- **Emails**: confirmed → owners only; **moved → owners only** (`sendBookingRescheduled`, owner 21 Sep 2026 — it must name **both** windows, the one freed and the one filled, or it is useless to whoever is running the board); cancelled → owners + customer (must state the refund precisely); late-webhook refund → customer + owners. A move fires from whichever path completes it: the reschedule route when nothing is owed, `confirmPayment` → webhook/reconcile when the difference is paid. `ConfirmOutcome.confirmed` carries `moved` so those callers send "booking moved" instead of "new booking" — sending the latter would leave the owner thinking the old slot is still taken.
- **Roles**: `CUSTOMER` / `OWNER`. Owner = Google email in `OWNER_EMAILS`, stamped on `User.role` at sign-in and **re-read from the DB** by `requireOwner()` on every owner request.
- **Slot states**: free (green) / selected (blue) / held (yellow) / booked (red) / past (grey). Always icon + word + colour, never colour alone.
- Gaps between selected slots are **allowed** (open decision §16.4).

## Stack (do not swap without asking)

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16.3** App Router, React 19, TS strict | Plan said 15; we're on 16. Read `node_modules/next/dist/docs/` before using any framework API. Middleware is **`proxy.ts`**. `params` is a Promise. `after()` for side effects. |
| Styling | Tailwind v4, tokens in `app/globals.css` `@theme` | No shadcn or animation libraries — inline SVG + CSS. |
| DB | Neon Postgres + **Prisma 7** (`prisma-client` generator → `generated/prisma`, `@prisma/adapter-pg`) | Import from `@/generated/prisma/client`; singleton `lib/db.ts` with a bounded pool. Config in `prisma7.config.ts`. |
| Auth | Auth.js / NextAuth v5 beta, Google, **JWT sessions** (no adapter tables) | Env: `AUTH_SECRET`, `AUTH_GOOGLE_ID/SECRET`. |
| Payments | Razorpay Orders + Checkout + Webhooks | `lib/razorpay.ts` |
| Email | Resend | `lib/email.ts` |
| Validation | zod, `lib/validation.ts` | every external input, `.strict()` |
| Tests | vitest | `npx vitest run` — **unit tests only**: `vitest.config.mts` teaches it the `@/` alias and limits `include` to `lib/**/*.test.ts`. Anything that needs the database is written as a throwaway `lib/*.itest.ts` with its own config (alias `server-only` to `node_modules/server-only/empty.js`, load `.env` in a setup file — vitest does not), run once, then deleted. Such a test must create its own rows on business dates 2–3 weeks out, clear of real bookings, and delete exactly what it made. |
| Hosting | Vercel + Vercel Cron (`vercel.json`, every 10 min) | |

Commands: `npm run dev` · `npm run build` · `npm run lint` · `npx tsc --noEmit` · `npx vitest run` · `npx prisma migrate dev --name <x>` · `npx prisma db seed` · `npx prisma studio`.

## Code map

```
app/
  layout.tsx                 site-wide SEO metadata, fonts
  page.tsx                   homepage (docs/HOMEPAGE-SPEC.md)
  book/page.tsx              /book — day + slot picker, players, phone, pay (dynamic)
  booking/[id]/page.tsx      post-checkout status (noindex, owner or own booking)
  about/page.tsx             /about — story, ground spec, facilities, house rules
  contact/page.tsx           /contact — call/WhatsApp, details, map embed (no form)
  my-bookings/page.tsx       /my-bookings — the customer's own bookings, cancel + reschedule (noindex)
  owner/layout.tsx           requireOwner() or 404 — the gate for every owner screen
  owner/page.tsx             /owner — the Owner desk: the whole ledger, filtered from the URL
  owner/loading.tsx          the desk's skeleton (every filter and page change is a navigation)
  owner/book/page.tsx        /owner/book — free booking, and ?reschedule=<id> to move anyone's
  privacy/page.tsx           /privacy — policy (indexed); copy in content/privacy.ts
  terms/page.tsx             /terms — booking terms (indexed); #cancellation points at /cancellation
  cancellation/page.tsx      /cancellation — cancellation & refund policy (indexed), linked from the footer
  sitemap.ts robots.ts opengraph-image.tsx
  actions/auth.ts            signIn/signOut server actions (open-redirect guarded)
  api/
    auth/[...nextauth]/      Auth.js handlers
    slots/                   GET ?date=  → states only, no PII
    bookings/                POST hold + Razorpay order
    bookings/[id]/           GET status (own booking / owner)
    bookings/[id]/cancel/    POST owner cancel + refund
    bookings/[id]/customer-cancel/ POST the customer cancelling their own (no body)
    bookings/[id]/reschedule/ POST move a booking; 201 {outcome: moved | payment_required}
    bookings/[id]/reconcile/ POST ask Razorpay directly (webhook late/undeliverable)
    owner/book/              POST owner free booking
    owner/bookings/[id]/reschedule/ POST the turf moving a booking (no money either way)
    owner/export/            GET  the ledger as a styled .xlsx workbook — same query params as /owner
    webhooks/razorpay/       POST raw-body signature verify → confirm/refund
    cron/expire-holds/       GET Bearer CRON_SECRET
components/
  Navbar.tsx MenuDrawer.tsx NavLinks.tsx UserMenu.tsx Footer.tsx MobileCTA.tsx ui.tsx legal.tsx
  account/ BookingList.tsx (my-bookings cards + cancel confirm)
  owner/ Ledger.tsx (table ≥ lg, cards below) LedgerFilters.tsx (GET form + presets + chips)
         StatStrip.tsx (totals for the whole filter) CancelPanel.tsx (the three refund choices)
  home/ art.tsx (all SVG) Motion.tsx
  loader/ CricketTurfLoader.tsx (+ .module.css) GlobalLoader.tsx
  book/ BookingFlow.tsx (picker + checkout) BookingStatus.tsx (status poller)
        StatusBurst.tsx (per-tone outcome animation, self-removing)
content/home.ts              every word on the homepage + the site-wide nav and legal links
content/book.ts              every word on /book, incl. all customer-facing hints
content/about.ts             every word on /about
content/contact.ts           every word on /contact
content/privacy.ts           every word on /privacy (+ the 'last updated' date)
content/terms.ts             every word on /terms (+ the 'last updated' date)
content/account.ts                     every word on /my-bookings, the account menu and the reschedule banner
content/cancellation.ts      every word on /cancellation (+ NOTICE_HOURS, the 24 h window)
content/owner.ts             every word on /owner and /owner/book, incl. the refund wording
lib/
  db.ts auth.ts slots.ts pricing.ts bookings.ts razorpay.ts email.ts
  owner-url.ts               the ledger filter ↔ the URL, pure (+ owner-url.test.ts)
  payments.ts                pure gateway-status predicates (+ payments.test.ts)
  validation.ts api.ts types.ts utils.ts site.ts (city/area/whatsapp; optional legalName)
  loading.ts                 request counter + apiFetch/apiJson/withLoader (drives the global loader)
  checkout.ts                client-side Razorpay Checkout loader (never confirms anything)
proxy.ts                     CSP nonce + optimistic /owner redirect (no Prisma)
next.config.ts               security headers, image patterns
prisma/ schema.prisma migrations/ seed.ts
docs/ PLAN.md HOMEPAGE-SPEC.md UI-PLAN.md OWNER-PLAN.md DEPLOY-VERCEL.md
types/next-auth.d.ts         session/JWT augmentation (@auth/core/jwt)
```

## UI rules

**Copy rules (owner, 14 Sep 2026)**: never mention "30 minutes"/slot length in user-facing copy (the slot engine stays 30-min internally); **badminton rackets are NOT provided** (owner, 19 Sep 2026) — the word "racket" appears nowhere in user-facing copy, not even as "bring your own": no facility card, no FAQ, no equipment list. The badminton net, bats and wickets are provided and stay listed; always state **2 min / 14 max players per booking** (`{min}`/`{max}` from the Turf row); no booking widget on the homepage — booking only on `/book`; the homepage gallery (`Turf.images`) is where live photos land.

**Pages**: Home `/` (built), Book slot `/book` (built), About, Contact, Terms, Cancellation, Privacy (indexed) + `/booking/[id]` (built) and `/owner/*` (noindex). Every CTA on the site points at `/book`; booking exists nowhere else.

**Never render the clock during SSR**: anything derived from `Date.now()` (a countdown, "expired?", relative time) differs between the server render and hydration, and a hydration mismatch in dev pops the error overlay — **which locks page scroll and looks like a broken page**. Gate it on a mounted flag (`useSyncExternalStore(() => () => {}, () => true, () => false)`) as `BookingStatus` does. Fixed IST formatting (`lib/slots.ts`) is safe; the user's locale and the current time are not.

**`<body>` carries `suppressHydrationWarning`** (`app/layout.tsx`, 19 Sep 2026). Grammarly and similar extensions stamp `data-gr-ext-installed` / `data-new-gr-c-s-check-loaded` onto `<body>` before React hydrates; React reports the mismatch, the dev overlay pops, scroll locks, and the site looks broken to anyone running one. The prop applies **one level deep** — that element's own attributes and text, never its children — so genuine mismatches inside the app are still reported. Do not reach for it anywhere else: on our own components a hydration warning is a real bug, and silencing it hides the thing worth fixing.

**Outcome burst (`components/book/StatusBurst.tsx`)** (owner, 17 Sep 2026): a settled booking is announced by a **short film, not a dialog** — animation over the blurred page, then a 0.45 s fade and it removes itself, leaving the normal status page. **Each scene holds for its own full length plus a beat** (`PLAY_MS` per tone: confirmed 4.4 s, failed/expired/cancelled 3.3 s, waiting 2.4 s — owner, 17 Sep 2026: a scene cut off mid-flight reads as a bug). Change a keyframe delay and change the matching `PLAY_MS`. Two champagne flutes swing in, clink and fizz under falling confetti for `confirmed`; a sweeping clock for `waiting`; a cross drawn in with a shake of the head for the three dead ends. One caption line each, in `content/book.ts` → `announce`. Rules: the layer is **`pointer-events-none` with no scroll lock**, so taps fall through and there is nothing to hand back; it carries **no buttons** (the page behind it has them all, which is what makes auto-dismissal safe); it fires **once per outcome** (a ref remembers what has been announced, so the 3 s poll cannot replay it) and only after `mounted`, so a dead hold never flashes "waiting" first. The timers read `onDone` through a **latest-callback ref**: the status page re-renders every poll, and an effect depending on that fresh arrow would restart the timers forever and the scene would never end. Confetti values are **deterministic** (a seeded sine, not `Math.random`). `backdrop-filter` sits on the same element that animates opacity — an ancestor animating opacity becomes the backdrop root and a child filter would have nothing to sample. Dev preview: `?demo-status=confirmed|waiting|failed|expired|cancelled` on a booking page.

**Nothing but Razorpay locks the page.** Checkout writes `body { overflow: hidden }` *inline* and unlocks on its own teardown; our own layers never touch that inline style, and never save-and-restore it — doing so hands the page back while Checkout is still up, or holds it after Checkout has gone. A component that must block the page uses its own surface (an attribute + a rule in `globals.css`), never the inline style.

**Razorpay Checkout teardown**: Checkout locks the page (`body { overflow: hidden }` + a full-screen container) and only unlocks when its own teardown finishes — which is *after* our `handler` fires. Always `rzp.close()` + `releaseCheckout()` (in `lib/checkout.ts`) before doing anything else, and leave Checkout with a **full document load**, never `router.push` — a soft navigation inherits the lock and the next page cannot scroll.

**Booking flow (`/book` → `/booking/[id]`)**: the selection survives Google sign-in through the URL (`?date=&slots=&people=`), re-validated server-side — no sessionStorage. Slot cells carry colour **and** glyph **and** word; `held`/`booked` use amber/rose status colours (outside the brand palette on purpose). Every rejection speaks through one `role="status"` hint bar, worded in `content/book.ts`. The client never confirms a payment: Checkout's handler and its dismiss callback both just navigate to `/booking/[id]`, which every 3 s alternates a plain status read with a `reconcile` call (server → Razorpay) until the booking settles, capped at 20 gateway checks.

**Palette (from the homepage spec — use these tokens, no ad-hoc hex)**: white, soft green `soft-green` #F1FFF5, soft blue `soft-blue` #F0FAFF, light green `mint` #B9F5C8, light blue `sky` #BDEBFF, primary `green` #22C55E, primary `blue` #38BDF8, text `ink` #101817. Green→blue gradient for primary actions (`.btn-gradient`, `.text-gradient`). Never overwhelmingly green or blue. Legacy `brand-*`/`turf-*` names are aliased in `globals.css`.

**`ring-inset` does not exist in Tailwind v4** (23 Sep 2026 — verified by compiling `app/globals.css`: no `.ring-inset` rule is emitted, while `.inset-ring-*` is). It is silently dropped, so every `ring-1 ring-inset` in this project was drawing the ring **outside** the element — invisible at 1 px, ugly the moment a 2 px focus ring appears. The v4 spelling is `inset-ring-1` / `inset-ring-<colour>`; ~105 occurrences were converted across `app/` and `components/`. A handful of rings are meant to sit outside (the navbar logo halo) and stay as plain `ring-*`. If a border ever looks like it is floating outside a rounded field, check for this first.

**Layout system**: `components/ui.tsx` — `Section` (tone: white | green | blue | arena | dark sets bg + text colour), `Eyebrow`, `H2` (black uppercase), `Lead`, `Card`, `Button`/`ButtonLink` (gradient | dark | outline | ghost | white). Custom classes (`.glass`, `.snap-strip`, `.btn-gradient`…) live in `@layer components` so Tailwind utilities can override them.

**Navigation**: floating glass navbar (`components/Navbar.tsx`) with centre links Home / About Us / Contact Us and BOOK A SLOT; mobile hamburger drawer (`MenuDrawer`, portaled to body); sticky bottom CTA on phones (`MobileCTA`) that hides over the preview, final CTA and footer (it needs the homepage's `#home` hero to appear at all, so it stays hidden on other pages).

**Site nav is routes, never `#hash`** (owner, 16 Sep 2026). `nav` in `content/home.ts` is the single source for the navbar, the drawer and the footer's Explore list, and every entry is a real path rendered through `next/link`. A hash is not a destination: from any page but the homepage it goes nowhere, and on the homepage it dirties the URL without moving anyone. In-page scroll anchors are still fine *within* the homepage (`#experience`, `#cricket`), just not in site navigation. `components/NavLinks.tsx` is the one client component that renders the list; it marks the current page with `aria-current="page"` via `usePathname` (`/` matches only itself).

**Testing on a real phone over Wi-Fi** (owner, 18 Sep 2026 — all four of these were live bugs). Two headers exist that are correct on https and fatal on a plain-http LAN address, and both are now scheme-gated: **HSTS** is emitted only when `x-forwarded-proto: https` (`next.config.ts` `has` rule) and **`upgrade-insecure-requests`** only when the proxy sees an https scheme. Sent over http they make the browser rewrite every asset URL to https, the dev/prod server does not speak TLS, and the page paints with **every script dead (ERR_SSL_PROTOCOL_ERROR)** — it looks like a styling bug, it is a total loss of interactivity. Separately, `next dev` serves its HMR socket only to the host it was started with, so a LAN address needs **`allowedDevOrigins`** (`next.config.ts`, private ranges listed) or the dev runtime retries a refused websocket forever and **never hydrates**: taps do nothing and the phone burns battery. Symptom to recognise in all three cases: the page looks right, scrolls, and no button, drawer, date or stepper responds. Check the browser console for SSL or websocket errors before suspecting the UI. Test the **production build** on a phone (`npm run build && npx next start -H 0.0.0.0`) — dev ships ~4 MB of unminified JS and hydrates in ~2.5–6 s over Wi-Fi against ~0.8 MB and ~1.4 s for a build; "the app is lagging" on a phone is usually just dev mode.

**Mobile-first — most visitors book on phones**
1. Design at 360 px; verify 320 / 375 / 390 / 414 / 430; `sm:`/`md:` only *add* columns or width.
2. Page never scrolls sideways. Watch for: `<fieldset>` (needs `min-w-0`), grid children (`min-w-0`), strips (`.snap-strip` / `overflow-x-auto`).
3. Tap targets ≥ 44 px; CTAs 48–56 px, full-width on mobile. Audited at 320/360/390/414/430 with a script that reports every `a`/`button`/`input` under 44 px; the only accepted exception is a link inline **inside a sentence** (making it 44 px breaks the line box, and WCAG 2.5.8 exempts it).
4. `100dvh`; `env(safe-area-inset-*)`; inputs ≥ 16 px; `inputmode="numeric"`.
5. No hover-only affordances; `group-active:` mirrors `group-hover:`.
6. Respect `prefers-reduced-motion` — all motion settles to a static state.

**Animation**: CSS-only where possible (offset-path arcs, stroke-dash trails, keyframes). JS is limited to `components/home/Motion.tsx` (IntersectionObserver reveal via `data-reveal` + `--scroll-y` parallax), `MobileCTA`, and the demo `BookingPreview`. No animation libraries. SVG gradient/clip ids must be unique per rendered instance (a hidden duplicate `<defs>` wins the lookup and paints nothing); gradients on straight lines need `gradientUnits="userSpaceOnUse"`.

**SEO — built in**: one H1 per page; per-page `metadata`; JSON-LD (`SportsActivityLocation` + `FAQPage` on Home); `app/sitemap.ts`, `app/robots.ts`, `app/opengraph-image.tsx` (satori: every text node must be a single string — mixed `text {expr}` children crash it); `lang="en-IN"`; semantic `<address>`, `<time>`, `<nav aria-label>`. Copy targets *cricket turf, box cricket, football turf, badminton court, sports turf, turf booking, online turf booking + city* — written for humans, no stuffing. Placeholders `[TURF NAME]`, `[CITY]`, `[AREA]` stay until real values are set (`lib/site.ts` env vars, Turf row).

**Global loader (every API call)**: `components/loader/CricketTurfLoader.tsx` (CSS-3D cricket scene, full-screen blur, `inert` on `[data-app-root]`, 500 ms min-visible, 320 ms fade, reduced-motion fallback) is mounted once via `GlobalLoader` in `app/layout.tsx` and driven by the request counter in `lib/loading.ts`. **All client-side API calls go through `apiFetch` / `apiJson` / `withLoader`** so the loader shows automatically and hides on success or error; background polling (e.g. the slot grid every 10 s) passes `{ silent: true }` so it never blocks the UI. Never animate `opacity` on a `preserve-3d` parent (it flattens children) and keep `backdrop-filter` on a sibling layer, not an ancestor, of 3D content. Dev preview: any page with `?demo-loader`.

**Verification**: after UI changes run Playwright against the dev server (installed Edge via `channel: 'msedge'`) at 360 and 1280: check `scrollWidth === clientWidth`, console errors, and screenshots. Chrome's `--screenshot` flag clamps to ~500 px wide — don't trust it for mobile.

## Performance — every API must be fast

| Endpoint | p95 target |
|---|---|
| `GET /api/slots` (polled every 10 s) | < 150 ms |
| `POST /api/bookings` (hold + Razorpay order) | < 400 ms |
| Webhook | < 300 ms |
| Owner lists | < 250 ms |

1. One indexed query per read; compute in memory. No N+1. `select` only what's rendered.
2. Emails and logging go through `after()` — never on the critical path. Razorpay order creation is the only external call inside booking-create, and it runs **outside** the DB transaction.
3. Transactions are short: release stale holds → insert booking + slots → done.
4. Bounded pg pool (`DB_POOL_MAX`, default 10). Never a `PrismaClient` per request. No Prisma in `proxy.ts`.
5. Server Components by default; `'use client'` only for the grid, counters, checkout and polling.
6. Any new `where`/`orderBy` combination gets an `@@index` in the same change.
7. Public pages are dynamic (CSP nonce) but cheap: one `Turf` read, deduped with React `cache`.

## Security — payments are involved

- **Never trust a client amount, role, or timestamp.** Server recomputes price, reads role from the session/DB, derives `slotStart` from `(date, index)`.
- **Webhook**: verify `X-Razorpay-Signature` over the **raw body** with `timingSafeEqual` before parsing; check `amount` + `currency` equal the booking; idempotent on retries; 200 for events we ignore, 500 only for transient failures (so Razorpay retries).
- **Late payment** (hold expired, slots gone): record the payment, mark `CANCELLED` + `GATEWAY` refund, call the refund API outside the transaction, email customer + owners. Never keep money for a slot we can't deliver.
- **Idempotency key** (UUID per checkout attempt) on every booking create; replays return the original.
- **Abuse limits** (DB-backed, cross-instance): ≤ 10 booking attempts / min / user; ≤ 2 active holds / user; customer bookings ≤ 12 slots.
- **Auth on every mutating route**: `currentUser()` → 401; `requireOwner()` → 403 (re-reads role from DB). Object-level checks: customers see only their own booking; unknown/foreign ids return 404, not 403.
- **`/api/slots` returns states only** — no names, phones or booking ids.
- **Secrets are server-only** (`import 'server-only'` in `lib/db.ts`, `auth.ts`, `razorpay.ts`, `email.ts`, `pricing.ts`, `bookings.ts`). Only `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `NEXT_PUBLIC_GOOGLE_MAPS_KEY`, `NEXT_PUBLIC_SITE_URL` reach the browser.
- **Headers**: per-request nonce CSP with `'strict-dynamic'` in `proxy.ts` (Razorpay + Google Maps allow-listed); HSTS, nosniff, `X-Frame-Options: DENY`, Referrer-Policy, Permissions-Policy in `next.config.ts`.
- **Cron**: `Authorization: Bearer CRON_SECRET`, constant-time compare.
- Errors to clients are generic codes (`SLOTS_TAKEN`, `VALIDATION`, …); details only in server logs.
- `.env` is git-ignored; `.env.example` is committed with empty values. Never run `migrate reset`/`db push` against a non-local DB. Migrations are additive.

## High traffic & concurrency

- Stateless instances: no in-memory limiters, caches or counters.
- Race on the same slots → `P2002` → `409 { error: 'SLOTS_TAKEN', taken: [...] }`; the client drops those slots and keeps the rest. Partial overlap rolls back entirely (intended).
- Expiry vs. webhook is serialised by row locks: every state change is an `updateMany ... WHERE status = 'PENDING'` whose predicate is re-checked after the lock, so a hold that just got confirmed is never released, and a payment for a released hold is refunded.
- Two expiry layers: inline (on the requested slots, inside booking-create) and cron (global, every 10 min). The grid treats expired holds as free regardless.
- If Razorpay order creation fails, the hold is released immediately (`PAYMENT_UNAVAILABLE`); no orphan holds.
- Before launch: fire two simultaneous booking requests for the same slots and confirm exactly one wins (plan §13 Phase 6).

## Environment

See `.env.example`. **Current `.env` needs**: `AUTH_SECRET` (the file has `BETTER_AUTH_SECRET` — rename), `RAZORPAY_WEBHOOK_SECRET`, `EMAIL_FROM` (verified domain in prod), `NEXT_PUBLIC_SITE_URL`.

**Resend without a verified domain** (the current state): the only usable sender is `onboarding@resend.dev` and it delivers **only to the Resend account's own address** — every other recipient returns `403 validation_error`. So `lib/email.ts` sends one request per recipient rather than one for all (a single bad address used to take the whole notification down with it) and logs `name: message`, not the error object, which stringifies to `{}` in the dev log. Real fix for production: verify a domain at resend.com/domains and point `EMAIL_FROM` at it.

## Working agreements

- Read the bundled Next.js docs for any API you're not sure of — this version differs from training data.
- Every mutation: auth → zod parse → authorization → transaction → `after()` side effects → minimal response.
- Money paths need a reproducible check before "done": hold → pay → webhook → confirm; expire; late webhook → refund; owner cancel → refund.
- Run `npm run lint`, `npx tsc --noEmit`, `npx vitest run` before declaring work complete; `npx prisma validate` after schema edits.
- Don't commit unless asked. Never commit `.env`, `generated/`, `.next/`.
- UI copy avoids technical wording: yellow = "Being booked by someone else — it frees up in a few minutes if they don't pay"; red = "Already booked"; 409 = "6:00 PM and 6:30 PM were just booked by someone else."
