# Homepage Spec — Futuristic Sports Turf (built 14 Sep 2026)

Source of truth for `app/page.tsx`, `content/home.ts`, `components/home/*`. The owner's brief, condensed to what the build must satisfy. Scope: **homepage only** — no other pages, dashboards or backend UI were part of this brief.

## Owner rules (14 Sep 2026)
- **Never mention "30 minutes" / slot length in copy.** Bookings are described by sport, date and time only.
- **Always state the player rule: minimum 2, maximum 14 players per booking** (from `Turf.minPeople/maxPeople`, filled as `{min}`/`{max}`).
- Homepage carries **no booking widget**; every CTA links to `/book`.
- Keep space for **multiple live images** (gallery section) — the turf will upload photos once open.

## Identity
- Concept: **SPORT × TECHNOLOGY × COMMUNITY** — a futuristic digital sports arena. Futuristic • Premium • Sporty • Fresh • Trustworthy • Energetic • Minimal • Interactive • Conversion-focused.
- Palette: white `#FFFFFF`, soft green `#F1FFF5`, soft blue `#F0FAFF`, light green `#B9F5C8`, light blue `#BDEBFF`, primary green `#22C55E`, primary blue `#38BDF8`, dark `#101817`. Green→blue gradient accents. Never overwhelmingly green/blue.
- Reference for *business type only*: app.nyboxcricket.in — design, layout, copy, colours are original.
- Placeholders until real values exist: `[TURF NAME]`, `[CITY]`, `[AREA]`, `[PHONE NUMBER]`, `[EMAIL]`, `[ADDRESS]` (`lib/site.ts`, Turf row).

## Section flow (exact order)
1. **Sticky glass navbar** — logo · Home / Sports / Facilities / Experience / FAQ (anchors) · BOOK A SLOT. Mobile: logo · BOOK · hamburger drawer. Sticky bottom BOOK A SLOT on mobile after the hero scrolls away; hides over the booking preview, final CTA and footer.
2. **Hero** — H1 "PLAY MORE. / BOOK SMARTER." + supporting copy + location-aware SEO line. Animated arena: cricket ball on a curved path with green trail, swinging bat, drifting/rotating football, shuttle on a blue-trail arc, racket, turf, glow particles, light parallax. Mobile: compact scene (bat, ball, football), CTA above the fold. **CTA #1 BOOK YOUR SLOT** + EXPLORE THE EXPERIENCE + "Cricket • Football • Badminton" + 3 trust chips.
3. **What's your game?** — Cricket / Football / Badminton interactive strip (icons react on hover/tap).
4. **A place built around the game.** — editorial intro, 3 paragraphs about the experience (not a facility list).
5. **One space. Three ways to play.** — Cricket "Bring your game." / Football "Own the pitch." / Badminton "Rally. Smash. Repeat." with SVG visuals, micro-CTAs EXPLORE CRICKET / PLAY FOOTBALL / PLAY BADMINTON. Swipeable on mobile.
6. **CTA #2** "Your game. Your time. Your turf." — CHECK AVAILABLE SLOTS on a green/blue gradient with animated ball behind.
7. **More than just a turf** — benefit paragraph (no list) then 11 facility icon cards: goal net, plastic & wooden bats, wickets, badminton net, parking, bathrooms, mini café, refreshments, energy drinks, seating, surveillance. **Badminton rackets are deliberately absent — the turf does not provide them and the word is not used anywhere in copy** (owner, 19 Sep 2026). 4-col desktop, 2-col tablet/phone, 1-col under 340 px.
8. **Come for the game. Stay for the experience.** — PLAY / REFRESH / RELAX with animated illustrations.
9. **From "let's play" to game on.** — 01 CHOOSE / 02 BOOK / 03 PLAY, animated connector line, numbers pop in on scroll.
10. **Live from the turf** — photo gallery (8 slots: main pitch, floodlights, match in progress, goal & net, badminton court, seating & café, practice nets, parking) fed by `Turf.images`; placeholders until live photos are uploaded. **No booking widget on the homepage — booking happens only on `/book`.**
11. **Who's ready to play?** — Friends / Teams / Corporate groups / Sports lovers.
12. **Your next sports session starts here** — 4 SEO paragraphs (cricket turf, box cricket, football turf, badminton court, sports turf, turf booking, online turf booking…) written for humans.
13. **Looking for a sports turf in [CITY]?** — short local copy.
14. **What players say** — 4 demo testimonials ("Verified player"), swipeable on mobile.
15. **Questions before game time?** — 9-item accordion.
16. **CTA #3** "STOP PLANNING. / START PLAYING." — dark charcoal with moving sports silhouettes, RESERVE YOUR GAME.
17. **Footer** — name, blurb, nav, contact placeholders, Privacy / Terms / Cancellation, "Made for the love of the game."

## CTA language (never "Book Now" everywhere)
Hero BOOK YOUR SLOT · Sports EXPLORE CRICKET / PLAY FOOTBALL / PLAY BADMINTON · Mid CHECK AVAILABLE SLOTS · Final RESERVE YOUR GAME. All go to `/book`.

## Responsive (mobile first — most bookings are on phones)
Must look excellent at 320 / 360 / 375 / 390 / 414 / 430 px, tablets, laptops, large monitors. No horizontal scroll; large type and 44 px+ targets; swipeable sports cards, dates and testimonials; compact facility cards; reduced decorative animation on mobile; sticky bottom CTA that never covers important content.

## Animation philosophy
Scroll reveal, fade-up, scale, subtle parallax, floating objects, sport trajectories, hover states, button micro-interactions, gradient movement, card elevation. Avoid bouncing, constant movement, slow transitions, loaders, background video. **Respect `prefers-reduced-motion`.** CSS-driven; JS limited to the reveal observer, mobile CTA visibility and the demo widget.

## SEO & semantics
One H1, logical H2s, H3s on cards, alt text, title + meta description + Open Graph, `SportsActivityLocation` + `FAQPage` JSON-LD with placeholders. Written for humans; no keyword stuffing.

## Performance
No image requests on the homepage (all art is inline SVG); lazy/responsive images when real photos are added; minimal JS; no extra libraries.
