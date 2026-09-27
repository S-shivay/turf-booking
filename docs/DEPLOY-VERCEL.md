# Deploying to Vercel

Written for whoever is putting this site live — you, or someone you hand it to. It assumes you can
use a terminal and click around a dashboard; it assumes nothing about Vercel, Neon, Razorpay or
Auth.js. Follow it top to bottom once, then keep §12 for every deploy after that.

Real money moves through this site. Two rules apply the whole way down:

- **Do the whole thing in Razorpay Test Mode first** (§7), take a booking end to end, and only then
  swap in live keys. A payment page that half-works costs you a customer; a webhook that half-works
  costs you a slot you can't sell twice.
- **Never run `prisma migrate reset` or `prisma db push` against the production database.** Both will
  wipe it. Migrations are additive and go through `prisma migrate deploy` (§2.4, §12.2).

Wherever you see `YOURDOMAIN.in`, put your real domain. Wherever you see `turf-booking.vercel.app`,
put the URL Vercel gives you.

---

## 0. What you need before you start

| Thing | Why | Cost |
|---|---|---|
| A **GitHub** account | Vercel deploys from a Git repo | free |
| A **Vercel** account | hosting | free tier works, but see §9 about cron |
| A **Neon** (or other Postgres) project for production | the live database — **separate from the one you develop against** | free tier fine to start |
| A **domain** | Google sign-in, Razorpay webhooks and SEO all want a stable address | ~₹800/yr |
| A **Razorpay** account, **activated** (KYC done) | live payments | per-transaction fee |
| A **Resend** account + the same domain | booking emails | free tier: 3,000/month |
| A **Google Cloud** project | "Sign in with Google" | free |

Decide the domain first. Google's redirect URI, Razorpay's webhook URL, Resend's sender and
`NEXT_PUBLIC_SITE_URL` all contain it, and changing it later means editing four dashboards.

---

## 1. Get the code into GitHub

The repo currently has one commit and no remote, so this is a real step, not a formality.

**1.1 — Check nothing secret is about to be committed.**

```bash
git status --porcelain | grep -E "^\?\?.*\.env$|^A.*\.env$"   # must print nothing
git check-ignore -v .env                                       # must say .gitignore:… .env*
```

`.gitignore` already covers `.env*` (except `.env.example`), `/generated`, `/.next` and `.vercel`.
If `.env` ever shows up in `git status`, stop and fix the ignore rule before committing — a pushed
`.env` means rotating every key in this document.

**1.2 — Commit and push.**

```bash
git add -A
git commit -m "Turf booking site: homepage, booking flow, owner desk, payments"
gh repo create turf-booking --private --source=. --push
# or: create an empty private repo on github.com, then
# git remote add origin https://github.com/<you>/turf-booking.git && git push -u origin master
```

**Keep the repo private.** It contains your business rules, your owner-only screens and your refund
logic. Nothing in it is secret on its own, but there is no reason to publish it.

---

## 2. The production database

**Use a different database from the one you have been developing against.** Your dev database has
test bookings, test payments and your own phone number in it. Mixing them means your first month's
income report is fiction.

**2.1 — Create it.** In Neon, create a new **project** (not just a branch) called `turf-booking-prod`.

**Pick the region now, and pick it to match Vercel** (§3.4). Every page render makes several database
round trips, so the distance between the function and the database is most of your latency budget:

**Look at Neon's region list and apply this rule**, because what Neon offers changes over time:

| If the list has | Choose | And set Vercel's function region to |
|---|---|---|
| Mumbai (`ap-south-1`) | Mumbai | `bom1` (Mumbai) |
| otherwise | Singapore (`ap-southeast-1`) | `sin1` (Singapore) |

Mumbai is better for players in India, but **matching matters more than distance**: a function in
Mumbai talking to a database in Singapore is worse than both being in Singapore, because one page
render makes several round trips. The targets in `CLAUDE.md` (`/api/slots` under 150 ms) assume the
two are in the same place. Your dev database is in Singapore, so Singapore is certainly available.

**2.2 — Copy both connection strings.** Neon gives you two, and you need both:

- **Pooled** (host contains `-pooler`) → this is `DATABASE_URL` for the app. Serverless functions
  open and drop connections constantly; the pooler is what keeps Postgres from running out.
- **Direct** (same host without `-pooler`) → used *only* for migrations and seeding. Prisma's
  migration engine takes advisory locks and uses prepared statements, which a transaction-mode
  pooler does not support. Migrating over the pooled URL fails in confusing ways.

**2.3 — Point your terminal at production, without touching `.env`.**

`prisma7.config.ts` loads `.env` through dotenv, and **dotenv does not overwrite a variable that is
already set** — so a shell variable wins for the life of that terminal window:

```powershell
# PowerShell — this window only. Close it when you're done.
$env:DATABASE_URL = "postgresql://…@ep-xxx.ap-south-1.aws.neon.tech/neondb?sslmode=require"   # DIRECT url
```

**2.4 — Create the schema.**

```bash
npx prisma migrate deploy
```

`migrate deploy` applies the four migrations in `prisma/migrations/` and **only** those. It never
generates, never resets, never drops. It is the only migration command that should ever see the
production URL.

**2.5 — Seed the one Turf row, exactly once.**

```bash
npx prisma db seed
```

`prisma/seed.ts` is idempotent (27 Sep 2026): it looks for an active Turf first and does nothing if
one already exists, so a second run cannot leave you with two. That matters because the site reads
the **first** active row (`getTurf()` → `findFirst`) — a stray second turf would be invisible rather
than obviously wrong. Fill the `TURF` block at the top of the seed in before running it against
production, or put the real details in afterwards (2.6).

**2.6 — Put your real details in that row.** The seed writes placeholders (`Your Turf Name`,
`9xxxxxxxxx`, a Kanpur lat/lng). These are not cosmetic: the turf's name, address, phone and email
appear on the homepage, `/contact`, `/terms`, `/cancellation`, in every email and in the JSON-LD
that Google reads.

```bash
npx prisma studio      # still pointed at production in this window
```

Open the `Turf` row and set `name`, `description`, `address`, `phone`, `email`, `lat`, `lng`,
`ownerName`, `ownerPhone`. Leave `pricePerPersonPerSlot` (₹50), `openHour`, `closeHour`,
`minPeople`/`maxPeople` (2/14) alone unless the business actually changed. Add photo URLs to
`images` when you have them — that is the homepage gallery.

Then **close that terminal window** so `DATABASE_URL` stops pointing at production.

---

## 3. Import the project into Vercel

**3.1** — vercel.com → **Add New… → Project** → import your GitHub repo.

**3.2 — Framework preset:** Next.js. Vercel detects it.

**3.3 — Build & install settings: leave them alone.** The defaults are correct for this project:

- Install: `npm install` — which runs `postinstall: prisma generate`. This matters: `generated/` is
  git-ignored, so the Prisma client is built on Vercel at install time. Without it the build fails
  with "Cannot find module '@/generated/prisma/client'".
- Build: `next build`.
- **Do not** change the build command to `prisma migrate deploy && next build`. That would run
  migrations on every deploy including preview branches, all pointed at your production database.
  Migrations stay manual (§12.2).

**3.4 — Region.** Project → Settings → Functions → **Function Region** → the one you matched in §2.1
(`bom1` Mumbai). Do this before your first real traffic.

**3.5 — Node version.** Settings → General → Node.js Version → **22.x**. Next 16 needs ≥ 20.9.

**3.6 — Do not deploy yet.** Add the environment variables first (§4), or the first build produces a
site that cannot reach the database.

---

## 4. Environment variables

Vercel → Project → Settings → **Environment Variables**. Add each one to **Production** (and to
Preview only if you want branch deploys to work — see the warning at the end of this section).

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | Neon **pooled** URL | Sensitive. Not the direct one. |
| `DB_POOL_MAX` | `5` | Connections *per function instance*. Serverless spawns many; keep it small. |
| `AUTH_SECRET` | `npx auth secret` → copy the value | Sensitive. **Generate a fresh one for production** — do not reuse the dev value. Changing it later signs everyone out. |
| `AUTH_GOOGLE_ID` | from §6 | |
| `AUTH_GOOGLE_SECRET` | from §6 | Sensitive. |
| `RAZORPAY_KEY_ID` | `rzp_live_…` (or `rzp_test_…` while testing) | |
| `RAZORPAY_KEY_SECRET` | from §7 | Sensitive. |
| `RAZORPAY_WEBHOOK_SECRET` | from §7.3 | Sensitive. **Not** the key secret — a different value you choose. |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | **the same string as `RAZORPAY_KEY_ID`** | Read in the browser. See the warning below. |
| `RESEND_API_KEY` | from §8 | Sensitive. Leave unset and emails are logged instead of sent — useful for a first deploy, useless in production. |
| `EMAIL_FROM` | `Turf Name <bookings@YOURDOMAIN.in>` | Must be on the domain you verified with Resend (§8). |
| `OWNER_EMAILS` | `you@gmail.com,partner@gmail.com` | Google addresses that get the OWNER role and every booking email. Comma-separated, no spaces. |
| `CRON_SECRET` | 32+ random chars (`openssl rand -hex 32`) | Sensitive. Vercel sends it automatically as `Authorization: Bearer …` to the cron route. |
| `NEXT_PUBLIC_SITE_URL` | `https://YOURDOMAIN.in` | No trailing slash. Sitemap, robots.txt, OG image and every absolute link use it. |
| `NEXT_PUBLIC_TURF_CITY` | e.g. `Kanpur` | Without it the site literally renders `[CITY]`. |
| `NEXT_PUBLIC_TURF_AREA` | e.g. `Kakadeo` | Same — `[AREA]` shows up in headings and SEO copy. |
| `NEXT_PUBLIC_TURF_STATE` | e.g. `Uttar Pradesh` | Optional. |
| `NEXT_PUBLIC_WHATSAPP` | `919876543210` | Country code, digits only. Falls back to the turf phone. |
| `NEXT_PUBLIC_LOGO_SRC` | `/logo.png` | Optional; file goes in `/public`. A placeholder mark shows until then. |
| `NEXT_PUBLIC_LEGAL_NAME` | only if you trade as a company | Leave **empty** otherwise. `/terms` then names the turf itself as the contracting party, which is correct — never invent a business name. |

**Two traps worth spelling out:**

1. **`NEXT_PUBLIC_*` are baked into the JavaScript at build time.** Changing one does nothing until
   you redeploy. If `[CITY]` is still on the page after you set it, you changed the variable and
   never rebuilt.
2. **`RAZORPAY_KEY_ID` and `NEXT_PUBLIC_RAZORPAY_KEY_ID` must be the same key.** The server creates
   the order with one and the browser opens checkout with the other; mix a test key with a live one
   and checkout dies with an unhelpful "order not found". Change them together, always.

`NEXT_PUBLIC_GOOGLE_MAPS_KEY` appears in `.env.example` but **nothing reads it** — the `/contact`
map is a keyless embed. Skip it.

**Preview deployments:** Google sign-in will not work on a `*-git-branch.vercel.app` URL unless you
add that exact URL to Google's redirect URIs, and Razorpay webhooks only ever point at production.
Previews are fine for looking at UI; do not test payments on them.

---

## 5. First deploy and the domain

**5.1** — Deploy. Watch the build log. It should end with `✓ Compiled successfully` and a route list
where almost everything is `ƒ (Dynamic)` — that is correct here, every page is rendered per request
because of the CSP nonce.

**5.2** — Open the `.vercel.app` URL. The homepage should render with your turf's real name. Do not
try to log in yet; Google isn't configured.

**5.3 — Add the domain.** Settings → Domains → add `YOURDOMAIN.in` and `www.YOURDOMAIN.in`, then set
the DNS records Vercel shows you at your registrar. Wait for both to go green. Vercel issues the TLS
certificate itself.

**5.4** — Set `NEXT_PUBLIC_SITE_URL` to the final `https://YOURDOMAIN.in` (if you guessed earlier)
and **redeploy** so it is baked in.

> **About HSTS:** once the site is live, `next.config.ts` sends
> `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`. Browsers will then
> refuse plain http for your domain **and every subdomain** for two years. That is the right setting
> for a payment site, but it means any subdomain you create later must also have https. It is only
> sent when the request arrived over https, so local and LAN testing are unaffected.

---

## 6. Google sign-in

Customers sign in with Google to book; you sign in with Google to reach `/owner`.

**6.1** — console.cloud.google.com → create a project (e.g. `turf-booking`).

**6.2 — OAuth consent screen:** User type **External**. Fill in app name, your support email, and the
developer email. Scopes: the defaults (`openid`, `email`, `profile`) — nothing sensitive, so no
Google review is needed.

**6.3 — Publish it.** While the app is in *Testing*, only the handful of accounts you list can sign
in, and their sessions expire in seven days — customers would simply be locked out. Press **Publish
app**. With only non-sensitive scopes it goes live immediately.

**6.4 — Credentials → Create credentials → OAuth client ID → Web application:**

- **Authorised JavaScript origins:**
  - `https://YOURDOMAIN.in`
  - `http://localhost:3000` (keep, for local work)
- **Authorised redirect URIs:**
  - `https://YOURDOMAIN.in/api/auth/callback/google`
  - `http://localhost:3000/api/auth/callback/google`

That path is Auth.js's, not something you can choose. Add `https://www.YOURDOMAIN.in/...` too if you
let the `www` host serve rather than redirect.

**6.5** — Copy the client ID and secret into `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` on Vercel and
redeploy.

**6.6 — Check it.** Sign in on the live site with an address in `OWNER_EMAILS`. You should land back
on the site with your name in the navbar, and **Owner desk** should appear in the menu. Sign in with
any other Google account and `/owner` must return a 404 — that is deliberate: the site never admits
an owner area exists.

---

## 7. Razorpay

### 7.1 — Test mode first

Do this before you touch live keys. In the Razorpay dashboard switch to **Test Mode**, take
`rzp_test_…` / its secret, put them in Vercel (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
`NEXT_PUBLIC_RAZORPAY_KEY_ID`), add the test webhook (§7.3), redeploy, and run the whole §10 checklist
with a test card. Only when every step passes do you swap in live keys and redeploy.

### 7.2 — Live keys

Account must be **activated** (KYC submitted and approved) before live keys exist. Dashboard →
Account & Settings → **API Keys** → Generate Live Key. The secret is shown **once** — copy it
straight into Vercel.

### 7.3 — The webhook (this is the important one)

Nothing else confirms a booking. A browser redirect never does, the checkout callback never does —
only this webhook, or the server asking Razorpay directly when the webhook is late.

Dashboard → Settings → **Webhooks** → Add New Webhook:

- **URL:** `https://YOURDOMAIN.in/api/webhooks/razorpay`
- **Secret:** invent a long random string. Put the *same* string in `RAZORPAY_WEBHOOK_SECRET` on
  Vercel. This is **not** your API key secret.
- **Active events** — tick exactly these five, which are the ones the handler acts on:

  | Event | What the site does with it |
  |---|---|
  | `payment.captured` | confirms the booking, or refunds it if the hold had already expired |
  | `payment.authorized` | captures the payment explicitly (accounts without auto-capture never fire `captured` on their own) |
  | `payment.failed` | asks Razorpay for every attempt on the order, and frees the slots only if all of them failed |
  | `refund.processed` | marks the refund done on the booking |
  | `refund.failed` | flags it on the owner desk so you can send the money another way |

Anything else you tick is answered `200` and ignored, harmlessly.

**7.4 — Auto-capture.** You can leave it on or off; the code handles both. Off means `authorized`
arrives first and the site captures it itself.

**7.5 — Verify delivery.** After your first test payment, open the webhook in the dashboard and look
at recent deliveries. `200` is what you want. `400 BAD_SIGNATURE` means `RAZORPAY_WEBHOOK_SECRET`
does not match what you typed into Razorpay. `500` means a real error — check the Vercel function
logs.

---

## 8. Resend (booking emails)

Until a domain is verified, Resend accepts only its shared sender and **delivers only to the address
that owns the Resend account** — everyone else comes back `403 validation_error`. That is why owner
mail may have looked broken in development.

**8.1** — resend.com → **Domains** → Add Domain → `YOURDOMAIN.in`.

**8.2** — Add the DNS records it gives you (an MX and two or three TXT records: SPF and DKIM) at your
registrar — the same place you added Vercel's records. Wait for **Verified**.

**8.3** — API Keys → create one with **Sending access** → `RESEND_API_KEY` on Vercel.

**8.4** — Set `EMAIL_FROM` to an address on that domain: `Your Turf <bookings@YOURDOMAIN.in>`.
A `from` on any other domain is rejected.

**8.5** — Redeploy, then make a test booking and confirm the mail arrives. Who gets what:

| Event | Goes to |
|---|---|
| Booking confirmed | owners only |
| Booking moved | owners only (names both the freed and the filled window) |
| Booking cancelled | owners **and** the customer, stating the refund precisely |
| Late payment auto-refunded | customer and owners |

If `RESEND_API_KEY` is empty the site does not crash — it logs `[email:dry-run]` and carries on. Good
for a first deploy, not for a real one.

---

## 9. The cron job (expiring unpaid holds)

`vercel.json` is already in the repo:

```json
{ "crons": [{ "path": "/api/cron/expire-holds", "schedule": "*/10 * * * *" }] }
```

Vercel picks it up on deploy — nothing to configure. Because `CRON_SECRET` is set, Vercel sends
`Authorization: Bearer <CRON_SECRET>` and the route compares it in constant time; anything else gets
a 401.

**Check your plan's cron limits.** Vercel's Hobby tier restricts cron jobs to roughly one run per
day; a ten-minute schedule needs Pro. Two ways to live with that:

- **Upgrade to Pro** (also gives you longer function timeouts, which the export route may want on a
  big date range), or
- **Call the endpoint from outside** — cron-job.org, GitHub Actions, any scheduler — every 10 minutes:
  ```
  GET https://YOURDOMAIN.in/api/cron/expire-holds
  Authorization: Bearer <CRON_SECRET>
  ```

**What happens if the cron never runs:** less than you'd fear. Expired holds are *also* released
inline whenever someone tries to book overlapping times, and the slot grid already paints an expired
hold as free. The cron exists to keep the ledger tidy, not to keep the board correct. So a Hobby
deploy is survivable — just set the external scheduler when you can.

---

## 10. Smoke test on the live site

Do these in order, on the real domain, in Razorpay **test** mode. Every one of them touches a path
that is hard to fix after a customer has found it.

1. **Homepage** — real turf name, no `[CITY]` / `[AREA]` / `[TURF NAME]` anywhere. Check `/about`,
   `/contact`, `/terms`, `/cancellation`, `/privacy` too.
2. **On a phone**, on mobile data (not your Wi-Fi): the page scrolls, the menu opens, the day strip
   and slot grid respond. If nothing responds, it is never the CSS — check the browser console.
3. **`/book`** — pick a day, pick times, set players. The price should be ₹50 × people × slots.
4. **Sign in with Google** mid-flow. Your selection must survive the round trip.
5. **Pay** with a Razorpay test card. You should land on the status page and it should turn
   *Confirmed* within a few seconds.
6. **Razorpay dashboard → the webhook** — a `200` delivery for `payment.captured`.
7. **Email** — the owner addresses got "new booking".
8. **`/my-bookings`** — the booking is there with its full receipt, and Cancel / Reschedule show
   because the game is more than 24 h away.
9. **`/owner`** — the booking is at the top (newest booked first), with name, phone and email.
   Filter by a date range; the totals should change with it.
10. **Download** the ledger. The `.xlsx` opens with the summary boxes, the frozen header and columns
    already the right width.
11. **Cancel it from `/owner`** with "Back the way they paid" — the refund should appear in Razorpay,
    the customer should get an email that states the amount, and the slots should be green again.
12. **Double-booking** — open `/book` in two browsers, select the same slot, pay in one: the other
    must be told those times were just taken. This is the one test worth doing twice.
13. **`/api/slots?date=…`** in a browser — states only. No names, no phone numbers, no booking ids.
14. **`/owner` signed out** and signed in as a non-owner — both must 404.

Then switch to live keys, redeploy, and make **one real ₹100-odd booking with your own card** and
refund it. That is the only way to know the live account, not just the test one, is wired right.

---

## 11. Going-live checklist

- [ ] Production database is separate from dev, migrated, seeded once, Turf row filled in
- [ ] Neon region and Vercel function region match
- [ ] Domain attached, https green, `NEXT_PUBLIC_SITE_URL` set **and redeployed**
- [ ] Google consent screen **published**, redirect URI on the real domain
- [ ] Razorpay **live** keys, and `NEXT_PUBLIC_RAZORPAY_KEY_ID` is the same key
- [ ] Webhook live, five events, secret matches, deliveries returning 200
- [ ] Resend domain verified, `EMAIL_FROM` on it, test mail received
- [ ] `OWNER_EMAILS` correct — this is the only thing standing between a stranger and every
      customer's phone number
- [ ] `CRON_SECRET` set; cron running every 10 min (or the external scheduler is)
- [ ] `/owner` 404s for everyone else
- [ ] One real payment taken and refunded

---

## 12. After it is live

### 12.1 Deploying a change

Push to `master`. Vercel builds and swaps atomically. If something is wrong, Deployments → the last
good one → **Promote to Production**; it is instant, because the old build is still there.

A rollback does **not** undo a database migration. Which is why:

### 12.2 Running a migration against production

```powershell
$env:DATABASE_URL = "…DIRECT (non-pooled) url…"
npx prisma migrate deploy
```

Run it **before** deploying code that needs the new column, so the two orders of operations never
cross. Migrations here are additive by rule — a column the old code ignores is harmless, a dropped
column is an outage.

### 12.3 Adding or removing an owner

Edit `OWNER_EMAILS` on Vercel and redeploy. The role is re-read from the database on every owner
request, so a removed owner is locked out on their next click — no waiting for a session to expire.

### 12.4 Rotating a secret

Change it in the provider's dashboard and on Vercel, then redeploy. `AUTH_SECRET` signs everyone out
when it changes; the rest are invisible to customers.

### 12.5 Where to look when something breaks

- **Vercel → Deployments → the deployment → Functions** — runtime logs. The code logs
  `[webhook]`, `[export]`, `[email]` and `[cron]` prefixes on purpose.
- **Razorpay → Webhooks → deliveries** — whether the event even reached you.
- **Resend → Emails** — whether a mail was accepted or bounced.
- **Neon → Monitoring** — connection count, if pages start timing out.

### 12.6 Never

- `prisma migrate reset` or `prisma db push` against production
- committing `.env`
- removing `@@unique([turfId, slotStart])` from the schema — it is the only thing that makes
  double-booking impossible under load
- confirming a payment from anything but the webhook or `reconcile`

---

## 13. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Build fails: `Cannot find module '@/generated/prisma/client'` | `prisma generate` didn't run | Install command must be plain `npm install` (runs `postinstall`) |
| Site loads, every page says `[CITY]` / `[TURF NAME]` | `NEXT_PUBLIC_*` set after the build, or Turf row still has seed values | Redeploy; edit the Turf row in Prisma Studio |
| Google: **redirect_uri_mismatch** | URI not registered, or `www` vs apex mismatch | Add the exact `https://…/api/auth/callback/google` in Cloud Console |
| Sign-in works for you, not for customers | consent screen still in *Testing* | Publish it (§6.3) |
| Checkout opens then fails instantly | `RAZORPAY_KEY_ID` and `NEXT_PUBLIC_RAZORPAY_KEY_ID` are different keys, or one is test and one is live | Make them identical, redeploy |
| Booking sits on "Waiting for your payment" | webhook not reaching the site | Check the webhook URL and deliveries; the status page also asks Razorpay directly, so a *permanent* wait means the payment genuinely didn't succeed |
| Webhook shows `400 BAD_SIGNATURE` | `RAZORPAY_WEBHOOK_SECRET` ≠ what you typed in Razorpay | Re-enter both, redeploy |
| Webhook shows `500` | transient DB error; Razorpay retries | Check function logs — the retry usually lands |
| `[webhook] AMOUNT MISMATCH` in the logs | money arrived that doesn't match the booking | Deliberate: the booking is **not** confirmed. Look at it by hand |
| No emails, no errors | `RESEND_API_KEY` empty | Set it; the site logs `[email:dry-run]` in this state |
| Emails only reach you, others `403 validation_error` | domain not verified at Resend | Finish §8 |
| Cron route returns 401 | `CRON_SECRET` missing or mismatched | Set it on Vercel and redeploy |
| Cron never fires | plan limit (§9) | Upgrade, or use an external scheduler |
| Pages slow, or "too many connections" | `DB_POOL_MAX` too high across many instances, or the direct URL in `DATABASE_URL` | Pooled URL, `DB_POOL_MAX=5` |
| Export download times out on a huge range | function duration limit | Narrow the date range, or raise `maxDuration` on the route |

---

## 14. Still open (not blockers, but do them)

Carried over from `CLAUDE.md` — none stop a deploy, all are worth closing early:

1. **`.env` locally still has `BETTER_AUTH_SECRET`** where the code wants `AUTH_SECRET`. There is a
   fallback so it works, but production should use a fresh `AUTH_SECRET` and nothing else.
2. **Concurrency test** — two simultaneous requests for the same slots, exactly one wins (§10.12).
3. **Lighthouse** on the live domain, on mobile.
4. **Turf photos** — `images` on the Turf row is what fills the homepage gallery.
