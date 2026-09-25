import type { Metadata } from 'next';
import Link from 'next/link';
import { signInWithGoogle } from '@/app/actions/auth';
import { currentUser } from '@/lib/auth';
import { getRescheduleBasis, getSlotStates, getTurf } from '@/lib/bookings';
import { prisma } from '@/lib/db';
import { placeholder, site, whatsappLink } from '@/lib/site';
import {
  HOLD_MINUTES,
  MAX_SLOTS_PER_BOOKING,
  VISIBLE_DAYS,
  businessDateKeyOf,
  formatDateKey,
  visibleDateKeys,
} from '@/lib/slots';
import { fill } from '@/content/home';
import * as account from '@/content/account';
import * as c from '@/content/book';
import { BookingFlow, type DayOption, type RescheduleMode } from '@/components/book/BookingFlow';
import { Button, ButtonLink, Eyebrow, H2, Lead, Section } from '@/components/ui';

// Live availability — never cached, never prerendered.
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const turf = await getTurf();
  const name = turf?.name ?? placeholder.turf;
  const title = `Book Cricket Turf Slots Online — ${name}, ${site.city}`;
  const description = `Check live availability and book cricket, box cricket, football or badminton slots at ${name} in ${site.area}, ${site.city}. ₹${turf?.pricePerPersonPerSlot ?? 50} per player, UPI accepted, instant confirmation.`;
  return { title, description, alternates: { canonical: '/book' }, openGraph: { title, description, url: '/book' } };
}

/** `?slots=12,13` — a selection carried back through Google sign-in. */
function parseSlots(raw: string | string[] | undefined, count: number): number[] {
  if (typeof raw !== 'string' || !raw) return [];
  const seen = new Set<number>();
  for (const part of raw.split(',')) {
    const n = Number(part);
    if (Number.isInteger(n) && n >= 0 && n < count) seen.add(n);
  }
  return [...seen].sort((a, b) => a - b).slice(0, MAX_SLOTS_PER_BOOKING);
}

export default async function BookPage({ searchParams }: PageProps<'/book'>) {
  const sp = await searchParams;
  const [turf, user] = await Promise.all([getTurf(), currentUser()]);

  if (!turf) {
    return (
      <Section tone="white" className="pt-32">
        <H2>Booking is not open yet</H2>
        <Lead>
          Online booking for this turf is being set up. Please call {placeholder.phone} and we will reserve your slot
          over the phone.
        </Lead>
      </Section>
    );
  }

  const now = new Date();
  const dateKeys = visibleDateKeys(now, VISIBLE_DAYS);
  const days: DayOption[] = dateKeys.map((key, i) => {
    const [weekday, day, month] = formatDateKey(key).split(' ');
    return { key, weekday: i === 0 ? 'Today' : i === 1 ? 'Tmrw' : weekday, day, month };
  });

  // ?reschedule=<id> turns the picker into "move this booking".
  const moveId = typeof sp.reschedule === 'string' && /^[a-z0-9]{20,32}$/i.test(sp.reschedule) ? sp.reschedule : null;

  if (moveId && !user) {
    return (
      <Section tone="white" className="pb-20 pt-32 sm:pt-40">
        <Eyebrow>{account.reschedule.eyebrow}</Eyebrow>
        <H2 className="mt-3">{account.signedOut.title}</H2>
        <Lead>{account.signedOut.body}</Lead>
        <form action={signInWithGoogle.bind(null, `/book?reschedule=${moveId}`)} className="mt-8">
          <Button type="submit" size="lg" className="w-full sm:w-auto">
            {account.signedOut.cta}
          </Button>
        </form>
      </Section>
    );
  }

  const basis = moveId && user ? await getRescheduleBasis(moveId, user.id, now) : null;

  // Asked to move something that cannot be moved — say so plainly rather than
  // silently dropping them into a fresh booking they did not ask for.
  if (moveId && !basis) {
    return (
      <Section tone="white" className="pb-20 pt-32 sm:pt-40">
        <Eyebrow>{account.reschedule.eyebrow}</Eyebrow>
        <H2 className="mt-3">This booking cannot be moved</H2>
        <Lead>{fill(account.hints.tooLate, { phone: turf.phone })}</Lead>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/my-bookings" size="lg" className="w-full sm:w-auto">
            Back to my bookings
          </ButtonLink>
          <ButtonLink href={`tel:${turf.phone}`} variant="outline" size="lg" className="w-full sm:w-auto">
            Call {turf.phone}
          </ButtonLink>
        </div>
      </Section>
    );
  }

  // A move opens on its own day with its own times already picked, so the
  // starting point is exactly the booking as it stands.
  const ownDate = basis ? businessDateKeyOf(new Date(basis.startsAt), turf.openHour) : null;
  const date =
    ownDate && dateKeys.includes(ownDate)
      ? ownDate
      : typeof sp.date === 'string' && dateKeys.includes(sp.date)
        ? sp.date
        : dateKeys[0];
  const slots = await getSlotStates(turf, date, now);

  const own = new Set(basis?.slotStarts ?? []);
  let initialSelected: number[];
  let initialPeople: number;

  if (basis) {
    initialSelected = slots.filter((s) => own.has(s.start)).map((s) => s.index);
    initialPeople = Math.min(turf.maxPeople, Math.max(turf.minPeople, basis.numPeople));
  } else {
    // A restored selection only survives if those times are still genuinely free.
    const requested = parseSlots(sp.slots, slots.length);
    initialSelected = slots.filter((s) => requested.includes(s.index) && s.state === 'free').map((s) => s.index);
    const askedPeople = Number(typeof sp.people === 'string' ? sp.people : NaN);
    initialPeople = Number.isInteger(askedPeople)
      ? Math.min(turf.maxPeople, Math.max(turf.minPeople, askedPeople))
      : turf.minPeople;
  }

  const reschedule: RescheduleMode | null = basis
    ? {
        bookingId: basis.bookingId,
        minPeople: basis.numPeople,
        minSlots: basis.slotCount,
        creditApplied: basis.creditApplied,
        ownSlotStarts: basis.slotStarts,
      }
    : null;

  const phone = user
    ? ((await prisma.user.findUnique({ where: { id: user.id }, select: { phone: true } }))?.phone ?? null)
    : null;

  const vars = {
    turf: turf.name,
    city: site.city,
    area: site.area,
    min: turf.minPeople,
    max: turf.maxPeople,
    price: turf.pricePerPersonPerSlot,
    hold: HOLD_MINUTES,
  };
  const t = (s: string) => fill(s, vars);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${site.url}/` },
        { '@type': 'ListItem', position: 2, name: 'Book a slot', item: `${site.url}/book` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: c.faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: t(f.a) },
      })),
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ═══════════════════════ HEADER ═══════════════════════ */}
      <Section tone="arena" className="pb-10 pt-28 sm:pb-12 sm:pt-36">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs font-bold uppercase tracking-[0.14em] text-muted">
          <Link href="/" className="inline-flex min-h-11 items-center hover:text-ink">
            Home
          </Link>
          <span aria-hidden className="mx-2">
            /
          </span>
          <span className="text-ink">Book a slot</span>
        </nav>

        <Eyebrow>
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-green" />
          {c.page.eyebrow}
        </Eyebrow>
        <h1 className="mt-3 text-[2.4rem] font-black uppercase leading-[0.95] tracking-tight sm:text-6xl">
          {c.page.h1} <span className="text-gradient">at {turf.name}</span>
        </h1>
        <Lead>{c.page.sub}</Lead>
        <ul className="mt-5 flex flex-wrap gap-2">
          {c.page.chips.map((chip) => (
            <li
              key={chip}
              className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-soft inset-ring-1 inset-ring-ink/[0.08]"
            >
              {t(chip)}
            </li>
          ))}
        </ul>
      </Section>

      {/* ═══════════════════════ PICKER ═══════════════════════ */}
      <Section tone="white" className="py-10 sm:py-14">
        <BookingFlow
          turf={{
            id: turf.id,
            name: turf.name,
            phone: turf.phone,
            pricePerPersonPerSlot: turf.pricePerPersonPerSlot,
            minPeople: turf.minPeople,
            maxPeople: turf.maxPeople,
            openHour: turf.openHour,
            closeHour: turf.closeHour,
          }}
          days={days}
          initialDate={date}
          initialSlots={slots}
          initialSelected={initialSelected}
          initialPeople={initialPeople}
          signedIn={Boolean(user)}
          phone={phone}
          reschedule={reschedule}
        />
      </Section>

      {/* ═══════════════════════ HOW IT WORKS ═══════════════════════ */}
      <Section tone="green" className="py-14 sm:py-20">
        <H2>How booking works</H2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {c.steps.map((s) => (
            <div key={s.n} className="min-w-0 rounded-3xl bg-white p-6 inset-ring-1 inset-ring-ink/[0.06]">
              <span className="text-gradient text-2xl font-black">{s.n}</span>
              <h3 className="mt-2 text-lg font-black uppercase tracking-tight">{s.title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{t(s.body)}</p>
            </div>
          ))}
        </div>

        <dl className="mt-8 grid gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
          {c.facts.map((f) => (
            <div key={f.label} className="min-w-0 rounded-2xl bg-white/70 px-4 py-3 inset-ring-1 inset-ring-ink/[0.06]">
              <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{f.label}</dt>
              <dd className="mt-1 text-base font-black">{t(f.value)}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* ═══════════════════════ FAQ + SEO ═══════════════════════ */}
      <Section tone="white" className="py-14 sm:py-20">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-14">
          <div className="min-w-0">
            <H2>Booking questions</H2>
            <div className="mt-6 divide-y divide-ink/10 border-y border-ink/10">
              {c.faq.map((f) => (
                <details key={f.q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-base font-bold [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span
                      aria-hidden
                      className="mt-0.5 shrink-0 text-xl leading-none text-green-deep transition-transform duration-300 group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-7 text-ink-soft">{t(f.a)}</p>
                </details>
              ))}
            </div>
          </div>

          <div className="mt-10 min-w-0 lg:mt-0">
            <div className="rounded-3xl bg-soft-blue p-6 inset-ring-1 inset-ring-ink/[0.06]">
              <h2 className="text-lg font-black uppercase tracking-tight">Rather talk to us?</h2>
              <p className="mt-2 text-sm leading-6 text-ink-soft">
                Planning a tournament, a corporate box cricket night or a longer session? Call the turf and we will
                block it for you.
              </p>
              <div className="mt-5 flex flex-col gap-3">
                <ButtonLink href={`tel:${turf.phone}`} variant="dark" className="w-full">
                  Call {turf.phone}
                </ButtonLink>
                <ButtonLink
                  href={whatsappLink(turf.phone, `Hi ${turf.name}, I want to book a slot.`)}
                  variant="outline"
                  className="w-full"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  WhatsApp us
                </ButtonLink>
              </div>
            </div>

            <div className="mt-6 space-y-4 text-sm leading-7 text-ink-soft">
              {c.seo.map((p) => (
                <p key={p.slice(0, 24)}>{t(p)}</p>
              ))}
              <p>
                By continuing you agree to our{' '}
                <Link href="/terms" className="font-semibold text-green-deep underline underline-offset-4">
                  Terms &amp; Conditions
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="font-semibold text-green-deep underline underline-offset-4">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
