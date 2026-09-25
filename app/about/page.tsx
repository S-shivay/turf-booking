import type { Metadata } from 'next';
import Link from 'next/link';
import { getTurf } from '@/lib/bookings';
import { placeholder, site, whatsappLink } from '@/lib/site';
import { formatOpeningHours } from '@/lib/slots';
import { facilities, fill } from '@/content/home';
import * as c from '@/content/about';
import { ButtonLink, Card, Eyebrow, H2, Lead, Photo, Section } from '@/components/ui';
import { FacilityIcon } from '@/components/home/art';

// Reads the live Turf row (name, hours, price) and the page is nonce-CSP'd.
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const turf = await getTurf();
  const name = turf?.name ?? placeholder.turf;
  const title = `About ${name} — Sports Turf in ${site.area}, ${site.city}`;
  const description = `Who we are and what the ground offers: cricket, football and badminton on one turf in ${site.area}, ${site.city}, with free equipment, floodlights, café, seating, parking and full security.`;
  return { title, description, alternates: { canonical: '/about' }, openGraph: { title, description, url: '/about' } };
}

export default async function AboutPage() {
  const turf = await getTurf();
  const name = turf?.name ?? placeholder.turf;
  const phone = turf?.phone || placeholder.phone;
  const hours = formatOpeningHours(turf?.openHour, turf?.closeHour);

  const vars = {
    turf: name,
    city: site.city,
    area: site.area,
    min: turf?.minPeople ?? 2,
    max: turf?.maxPeople ?? 14,
    price: turf?.pricePerPersonPerSlot ?? 50,
    hours,
  };
  const t = (s: string) => fill(s, vars);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${site.url}/` },
        { '@type': 'ListItem', position: 2, name: 'About Us', item: `${site.url}/about` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: `About ${name}`,
      url: `${site.url}/about`,
      mainEntity: {
        '@type': 'SportsActivityLocation',
        name,
        url: site.url,
        telephone: phone,
        email: turf?.email || placeholder.email,
        address: {
          '@type': 'PostalAddress',
          streetAddress: turf?.address || placeholder.address,
          addressLocality: site.city,
          addressRegion: site.state || undefined,
          addressCountry: 'IN',
        },
        ...(turf ? { geo: { '@type': 'GeoCoordinates', latitude: turf.lat, longitude: turf.lng } } : {}),
        sport: ['Cricket', 'Football', 'Badminton'],
        openingHours: `Mo-Su ${String(turf?.openHour ?? 6).padStart(2, '0')}:00-${String((turf?.closeHour ?? 25) % 24).padStart(2, '0')}:00`,
      },
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ═══════════════════════ HEADER ═══════════════════════ */}
      <Section tone="arena" className="pb-12 pt-28 sm:pb-16 sm:pt-36">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs font-bold uppercase tracking-[0.14em] text-muted">
          <Link href="/" className="inline-flex min-h-11 items-center hover:text-ink">
            Home
          </Link>
          <span aria-hidden className="mx-2">
            /
          </span>
          <span className="text-ink">About us</span>
        </nav>

        <Eyebrow>{c.page.eyebrow}</Eyebrow>
        <h1 className="mt-3 text-[2.4rem] font-black uppercase leading-[0.95] tracking-tight sm:text-6xl">
          {t(c.page.h1)}
        </h1>
        <Lead>{t(c.page.lead)}</Lead>
      </Section>

      {/* ═══════════════════════ STORY ═══════════════════════ */}
      <Section tone="white">
        <div className="lg:grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-14">
          <div className="min-w-0">
            <H2>{c.story.title}</H2>
            <div className="mt-6 space-y-5 text-[15px] leading-7 text-ink-soft sm:text-base sm:leading-8">
              {c.story.paragraphs.map((p) => (
                <p key={p.slice(0, 24)}>{t(p)}</p>
              ))}
            </div>
          </div>

          <div className="mt-10 min-w-0 lg:mt-0">
            <Photo
              src={turf?.images[0]}
              alt={`The main pitch at ${name}, ${site.city}`}
              caption="Main pitch"
              ratio="4/3"
              sizes="(max-width: 1024px) 100vw, 420px"
              priority
            />
          </div>
        </div>
      </Section>

      {/* ═══════════════════════ THE GROUND ═══════════════════════ */}
      <Section tone="green">
        <H2>{c.ground.title}</H2>
        <Lead>{c.ground.text}</Lead>
        <dl className="mt-10 grid gap-px overflow-hidden rounded-3xl bg-ink/10 sm:grid-cols-2 lg:grid-cols-3">
          {c.ground.rows.map((row) => (
            <div key={row.label} className="min-w-0 bg-white p-5">
              <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{row.label}</dt>
              <dd className="mt-1 text-[15px] font-bold leading-6">{t(row.value)}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* ═══════════════════════ FACILITIES ═══════════════════════ */}
      <Section tone="white">
        <H2>{facilities.title}</H2>
        <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {facilities.items.map((f) => (
            <li key={f.title} className="min-w-0">
              <Card className="h-full p-5">
                <FacilityIcon name={f.icon} />
                <h3 className="mt-3 text-sm font-black uppercase tracking-tight">{f.title}</h3>
                <p className="mt-1 text-[13px] leading-5 text-ink-soft">{f.text}</p>
              </Card>
            </li>
          ))}
        </ul>
      </Section>

      {/* ═══════════════════════ GALLERY ═══════════════════════ */}
      <Section tone="white" className="pt-0">
        <Eyebrow>{c.gallery.eyebrow}</Eyebrow>
        <H2 className="mt-3">{c.gallery.title}</H2>
        <Lead>{c.gallery.text}</Lead>
        <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          {c.gallery.slots.map((cap, i) => (
            <li key={cap} className="min-w-0">
              <Photo
                src={turf?.images[i]}
                alt={`${cap} at ${name}, ${site.city}`}
                caption={cap}
                ratio="4/3"
                sizes="(max-width: 768px) 50vw, 33vw"
              />
            </li>
          ))}
        </ul>
      </Section>

      {/* ═══════════════════════ HOUSE RULES ═══════════════════════ */}
      <Section tone="blue">
        <H2>{c.rules.title}</H2>
        <Lead>{c.rules.text}</Lead>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {c.rules.items.map((r) => (
            <li key={r.title} className="min-w-0">
              <Card className="h-full">
                <h3 className="text-base font-black uppercase tracking-tight">{t(r.title)}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-soft">{t(r.text)}</p>
              </Card>
            </li>
          ))}
        </ul>
      </Section>

      {/* ═══════════════════════ CTA + SEO ═══════════════════════ */}
      <Section tone="white">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-14">
          <div className="min-w-0">
            <H2>{c.cta.title}</H2>
            <Lead>{c.cta.text}</Lead>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/book" size="lg" className="w-full sm:w-auto">
                {c.cta.primary} <span aria-hidden>→</span>
              </ButtonLink>
              <ButtonLink href="/contact" variant="outline" size="lg" className="w-full sm:w-auto">
                {c.cta.secondary}
              </ButtonLink>
            </div>
          </div>

          <div className="mt-10 min-w-0 lg:mt-0">
            <div className="rounded-3xl bg-soft-green p-6 inset-ring-1 inset-ring-ink/[0.06]">
              <h2 className="text-lg font-black uppercase tracking-tight">Rather talk to someone?</h2>
              <p className="mt-2 text-sm leading-6 text-ink-soft">
                Tournaments, corporate nights and longer sessions are easiest over a call.
              </p>
              <div className="mt-5 flex flex-col gap-3">
                <ButtonLink href={`tel:${phone}`} variant="dark" className="w-full">
                  Call {phone}
                </ButtonLink>
                <ButtonLink
                  href={whatsappLink(phone, `Hi ${name}, I have a question about the turf.`)}
                  variant="outline"
                  className="w-full"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp us
                </ButtonLink>
              </div>
            </div>

            <div className="mt-6 space-y-4 text-sm leading-7 text-ink-soft">
              {c.seo.map((p) => (
                <p key={p.slice(0, 24)}>{t(p)}</p>
              ))}
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
