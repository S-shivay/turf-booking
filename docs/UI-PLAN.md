# UI Plan — Mobile-first, SEO-first

Status: **DRAFT — waiting for owner approval before any screen is built.**
Backend, data model and APIs are done (see `docs/PLAN.md`). This document only decides what visitors see.

Design targets:

- **99 % of visitors are on a phone.** Every screen is designed at 360 px wide first, checked at 390/430 px, then allowed to stretch to a laptop. Primary action always within thumb reach.
- **Colours: white, light green, light blue only.** Text colour follows the background: dark navy (`brand-900`) on white / light blue, dark green (`turf-900`) on light green, white on solid blue/green buttons. Tokens are in `app/globals.css`.
- **Every page has room for real photos.** Image sections are laid out now with placeholders so photos drop in later without moving anything.
- **SEO is part of the build.** Public pages target the phrases people type: *cricket turf, box cricket, cricket ground, cricket turf near me, book cricket turf online, night cricket, turf booking + city*.

---

## 1. Site map

| # | Route | Purpose | Indexed |
|---|---|---|---|
| 1 | `/` | Home — information + booking entry points | yes |
| 2 | `/about` | About us — the turf, the people, the ground | yes |
| 3 | `/contact` | Contact us — phone, WhatsApp, map, form | yes |
| 4 | `/book` | Book slot — 7-day grid, people, pay | yes |
| 5 | `/terms` | Terms & conditions | yes |
| 6 | `/privacy` | Privacy policy | yes |
| 7 | `/booking/[id]` | Payment status (customer only) | no |
| 8 | `/owner`, `/owner/book`, `/owner/bookings/[id]` | Owner tools | no |
| — | `/sitemap.xml`, `/robots.txt`, `/opengraph-image` | generated | — |

---

## 2. Global shell

```
┌──────────────────────────────┐
│ 🏏 <Turf name>          [≡]  │  56 px sticky header, white, blurred
├──────────────────────────────┤
│                              │
│         page content         │
│                              │
├──────────────────────────────┤
│ FOOTER (light blue)          │
│ <Turf name> · Box cricket    │
│ turf in <City>               │
│ Home · About · Contact       │
│ Book slot · Terms · Privacy  │
│ 📞 phone   💬 WhatsApp       │
│ © year                       │
└──────────────────────────────┘
```

- Header: logo + turf name, one "Book slot" pill button (blue), and a menu button that opens a full-screen sheet with the six links + Sign in/out. Owner sees an extra "Owner" link.
- Footer on every page: white text on `brand-900`? **No** — stays inside the palette: light blue background, navy text.
- Max content width 640 px on tablets/laptops, centred. Sections alternate **white → light green → white → light blue** so the page has rhythm without extra colours.
- Base font 16 px, minimum tap target 44 × 44 px, section padding 24 px top/bottom on mobile.

---

## 3. Home `/`

Three booking entry points, each worded for where the reader is on the page.

```
┌──────────────────────────────┐  WHITE
│ H1  <Turf name> — Box Cricket│
│     Turf in <Area>, <City>   │
│ Floodlit cricket ground,     │
│ 30-min slots, pay by UPI.    │
│ ₹50/person/30 min · 2–14     │
│ players · 6 AM – 1 AM        │
│ [ ▶ Book a slot now ]        │  ← CTA #1 (blue, full width, 48 px)
│ [ 📞 Call the turf ]         │  ← secondary (white, blue border)
├──────────────────────────────┤  IMAGE SECTION A
│ ┌────────────────────────┐   │  hero photo 16:9, full-bleed
│ │   [ turf photo ]       │   │  alt: "Floodlit box cricket turf at
│ └────────────────────────┘   │  night in <City>"
├──────────────────────────────┤  LIGHT GREEN
│ H2 Why play cricket here     │
│ ✓ Floodlit night cricket     │  4 tiles, 2×2 on mobile, icon + one line
│ ✓ Book online in 1 minute    │
│ ✓ Pay by UPI / card          │
│ ✓ Slots from 6 AM to 1 AM    │
├──────────────────────────────┤  WHITE
│ H2 How turf booking works    │
│ ① Pick your slots            │  3 numbered steps, stacked
│ ② Add your players           │
│ ③ Pay online, get confirmed  │
│ [ Check slot availability ]  │  ← CTA #2 (green, full width)
├──────────────────────────────┤  IMAGE SECTION B
│ ▭▭ ▭▭ ▭▭ ▭▭  photo strip     │  4–6 photos, horizontal snap-scroll,
│                              │  4:3 cards, "See more on About"
├──────────────────────────────┤  LIGHT BLUE
│ H2 Slot timings & price      │
│ ┌ table ────────────────┐    │  hours / price / players / hold rule /
│ │ 6:00 AM – 1:00 AM     │    │  what happens if you don't pay in 15 min
│ │ ₹50 per person / slot │    │
│ │ 2 – 14 players        │    │
│ └───────────────────────┘    │
├──────────────────────────────┤  WHITE
│ H2 Where to find us          │
│ address · phone · email      │
│ [ map embed, lazy ]          │
│ Get directions →             │
├──────────────────────────────┤  LIGHT GREEN
│ H2 Frequently asked          │
│ ▸ Do you provide bat & ball? │  5–6 <details>, feeds FAQPage JSON-LD
│ ▸ What if it rains?          │
│ ▸ How many players per side? │
│ ▸ Can I cancel?              │
│ ▸ Is parking available?      │
├──────────────────────────────┤  LIGHT BLUE (closing band)
│ Ready to play?               │
│ Slots fill up fast on        │
│ weekends and evenings.       │
│ [ Reserve your turf slot ]   │  ← CTA #3 (blue, full width)
└──────────────────────────────┘
```

CTA wording by position: **"Book a slot now"** (top, intent), **"Check slot availability"** (middle, curiosity), **"Reserve your turf slot"** (bottom, urgency). All three go to `/book`.

---

## 4. About us `/about`

```
┌──────────────────────────────┐  WHITE
│ H1 About <Turf name>         │
│ Box cricket ground in <City> │
│ 2–3 short paragraphs: who    │
│ runs it, since when, why     │
├──────────────────────────────┤  IMAGE SECTION C
│ ┌──────────┐ ┌──────────┐    │  2-column photo grid on mobile,
│ │ pitch    │ │ nets     │    │  each with a caption line
│ └──────────┘ └──────────┘    │  ("Astro-turf pitch", "Floodlights",
│ ┌──────────┐ ┌──────────┐    │   "Seating", "Parking")
│ │ lights   │ │ seating  │    │
│ └──────────┘ └──────────┘    │
├──────────────────────────────┤  LIGHT GREEN
│ H2 The ground                │
│ size, surface, nets, lights, │  spec list: label / value rows
│ changing room, water, parking│
├──────────────────────────────┤  WHITE
│ H2 The people                │
│ owner name + photo slot,     │  1–2 cards, photo placeholder circle
│ one line each                │
├──────────────────────────────┤  LIGHT BLUE
│ H2 Rules of play             │
│ shoes, timings, conduct      │  short bullets
├──────────────────────────────┤  WHITE
│ [ Book a slot ]              │  ← page-end CTA
└──────────────────────────────┘
```

---

## 5. Contact us `/contact`

```
┌──────────────────────────────┐  WHITE
│ H1 Contact <Turf name>       │
│ [ 📞 Call ]  [ 💬 WhatsApp ] │  ← two big buttons side by side, 48 px
│ phone · email · address      │  tappable tel:/mailto:
│ Open 6 AM – 1 AM, every day  │
├──────────────────────────────┤  IMAGE SECTION D
│ [ map embed, 16:9 ]          │
│ Get directions →             │
├──────────────────────────────┤  LIGHT GREEN
│ H2 Send us a message         │
│ Name  [            ]         │  form → POST /api/contact (new, small),
│ Phone [            ]         │  emails owners via Resend, rate-limited
│ Msg   [            ]         │
│ [ Send message ]             │
├──────────────────────────────┤  LIGHT BLUE
│ Want to play instead?        │
│ [ Book a slot ]              │
└──────────────────────────────┘
```

---

## 6. Book slot `/book`

```
┌──────────────────────────────┐  WHITE
│ H1 Book Cricket Turf Slots   │
│ Sun 14  Mon 15  Tue 16  ▸▸   │  ← DayTabs: horizontal snap, today first
├──────────────────────────────┤
│ ✓ Free  ● Selected  ⏱ Held  │  ← legend, one line
│ ✕ Booked                     │
├──────────────────────────────┤
│  6:00 AM ✓   6:30 AM ✓       │  ← SlotGrid: 2 columns at 360 px,
│  7:00 AM ⏱   7:30 AM ✕       │     3 at ≥ 480 px, 4 at ≥ 768 px
│  8:00 AM ●   8:30 AM ●       │     cells 56 px, time + icon + word
│  …                           │
├──────────────────────────────┤
│ hint bar (on tapping a held/ │  "Being booked by someone else. It
│ booked/past cell)            │   frees up in a few minutes if they
│                              │   don't complete payment."
├──────────────────────────────┤  LIGHT GREEN
│ Players  [ − ]  8  [ + ]     │  ← 48 px buttons, 2–14
│ Phone    [ 9xxxxxxxxx ]      │  ← asked once, remembered
├──────────────────────────────┤
│ 3 slots × 8 players × ₹50    │
│ Total ₹1,200                 │
│ Held for 15 min while you pay│
└──────────────────────────────┘
   sticky bottom: ₹1,200 · [ Proceed to pay ]   (light blue bar, blue button)
```

Slot cell states (colour **and** icon **and** word — never colour alone):

| state | background / text | label | tap |
|---|---|---|---|
| free | light green / dark green | ✓ Free | selects |
| selected | solid blue / white | ● Selected | deselects |
| held | light yellow / dark amber | ⏱ Held | hint |
| booked | light red / dark red | ✕ Booked | hint |
| past | light grey / grey | — | hint "This time has passed" |

(Held/booked use amber/red because "free vs taken" must be unmistakable; they are status colours, not brand colours.)

Behaviour: grid polls every 10 s (paused when tab hidden); a selected slot that becomes taken is dropped and named in the hint bar; Proceed while signed out saves the selection, sends to Google sign-in, restores it on return; 409 from the API names the taken slots and keeps the rest.

---

## 7. Terms `/terms` and Privacy `/privacy`

Same template, white background, readable width:

```
┌──────────────────────────────┐
│ H1 Terms & Conditions        │
│ Last updated: <date>         │
│ On this page: (jump links)   │
│ H2 Bookings & holds          │  15-min hold, payment = confirmation
│ H2 Cancellations & refunds   │  owner-cancel policy, gateway 5–7 days,
│ H2 Conduct & safety          │  manual UPI, no-show
│ H2 Payments                  │  Razorpay, INR, prices per person/slot
│ H2 Liability                 │
│ H2 Contact                   │
└──────────────────────────────┘
```

Privacy: what we store (Google name/email, phone, bookings), why, who sees it (Razorpay, Resend, Google), retention, how to delete, cookies (session only). Content is provided as Markdown so you can edit it without touching code.

---

## 8. Functional screens (no design changes needed, kept for completeness)

**`/booking/[id]`** — PENDING: spinner, "hold ends in 12:34", **Pay now** re-opens Checkout; CONFIRMED: green card with slots, players, amount, address, "Show this at the gate"; CANCELLED: reason + exact refund sentence. Polls every 3 s while pending. `noindex`.

**`/owner`** — refund-failed alert, "+ Free booking", today/upcoming rows (time, name, players, ₹, status), recent cancellations. **`/owner/book`** — same grid, owner mode (30-day window, no payment). **`/owner/bookings/[id]`** — details + **Cancel** bottom sheet: reason, refund method (Razorpay / Manual UPI / None; default from payment method), amount, UTR (required for manual), note (required for none), confirmation sentence with real numbers.

---

## 9. Image sections — what to prepare

| Section | Where | Count | Shape | Suggested subject |
|---|---|---|---|---|
| A hero | Home top | 1 | 16:9, 1600 px | floodlit turf at night, wide |
| B strip | Home middle | 4–6 | 4:3, 1200 px | pitch, nets, players mid-game, seating |
| C grid | About | 4 | 4:3 | pitch, lights, seating, parking |
| D map | Contact | — | embed | — |
| People | About | 1–2 | square | owner / staff |
| OG image | shared links | 1 | 1200×630 | generated from name + city + brand colours |

Until real photos arrive every slot renders a light-green placeholder with the caption, at the final size, so nothing shifts later.

---

## 10. SEO plan

**Titles & descriptions**

| Page | `<title>` |
|---|---|
| `/` | `<Turf> — Box Cricket Turf in <Area>, <City> \| Book Online` |
| `/about` | `About <Turf> — Cricket Ground in <City>` |
| `/contact` | `Contact <Turf> — Cricket Turf <City> Phone, Map, Timings` |
| `/book` | `Book Cricket Turf Slots Online — <Turf>, <City>` |
| `/terms` | `Terms & Conditions — <Turf>` |
| `/privacy` | `Privacy Policy — <Turf>` |

Descriptions are 140–155 chars, contain the primary phrase once, and end with the offer ("₹50/person, UPI accepted, instant confirmation").

**Structured data (JSON-LD)**

- `/`: `SportsActivityLocation` (name, address, geo, telephone, openingHoursSpecification 06:00–01:00, priceRange, image[], hasMap, sameAs) + `FAQPage` from the FAQ section.
- `/about`: `Organization`. `/contact`: `ContactPage`. `/book`: `BreadcrumbList`.

**Technical**

- `app/sitemap.ts` (the six public pages), `app/robots.ts` (disallow `/owner`, `/booking`, `/api`), `app/opengraph-image.tsx`, `metadataBase` + canonical from `NEXT_PUBLIC_SITE_URL`.
- One `<h1>` per page; H2s carry secondary phrases naturally (*cricket ground, play cricket, night cricket, turf booking*).
- `<address>`, `<time datetime>`, `<nav aria-label>`, descriptive alt text on every image.
- `next/image` with `sizes`, AVIF/WebP, hero `priority`, everything else lazy.
- Budget on mobile: LCP < 2.0 s, CLS < 0.05, INP < 200 ms; `/` ships no client JS except the photo strip's scroll-snap (CSS only, so effectively zero).
- Owner to-do that matters more than code: Google Business Profile with identical name/phone/address linking here; 4–6 real photos; FAQ answers.

---

## 11. Mobile CSS rules (apply everywhere)

1. Style for 360 px first; `sm:`/`md:` only add columns/width.
2. 16 px side padding on the page; nothing scrolls sideways except DayTabs and photo strips (own `overflow-x-auto` + `scroll-snap`).
3. Tap targets ≥ 44 px; slot cells 56 px; CTAs 48 px, full width on mobile.
4. `100dvh` not `100vh`; `env(safe-area-inset-bottom)` on the sticky bar; `viewport-fit=cover`.
5. Inputs `font-size: 16px` (no iOS zoom); `inputmode="numeric"` for phone/players.
6. No hover-only states; anything hover shows must show on tap.
7. `prefers-reduced-motion` respected.
8. `aspect-ratio` boxes on all images (no layout shift).
9. Section backgrounds alternate white / light green / light blue; text colour is set per section, never global.
10. Test matrix: Chrome Android 360×800, Safari iOS 390×844, low-end Android with 4× CPU throttle.

---

## 12. Build order once approved

1. Primitives (`Button`, `Card`, `Section`, `Field`, `Input`, `Notice`), `Header` + menu sheet, `Footer`
2. Home with SEO metadata, JSON-LD, sitemap, robots, OG image
3. About, Contact (+ `/api/contact`), Terms, Privacy
4. `/book`: DayTabs, SlotGrid, HintBar, PeopleCounter, PhoneField, PriceSummary, BookingFlow, Checkout
5. `/booking/[id]` status
6. Owner pages + Cancel sheet
7. Lighthouse mobile pass

---

## Questions before build

1. Turf's real **name, area, city** for H1/titles, or placeholders until launch?
2. Contact form: keep it (emails owners), or just Call/WhatsApp buttons?
3. WhatsApp number — same as the turf phone?
4. Contiguous slots only, or gaps allowed? (currently gaps allowed)
