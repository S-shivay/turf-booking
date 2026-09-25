import type { Metadata } from 'next';
import Link from 'next/link';
import { getTurf } from '@/lib/bookings';
import { placeholder, site, whatsappLink } from '@/lib/site';
import { formatOpeningHours } from '@/lib/slots';
import { fill } from '@/content/home';
import * as c from '@/content/contact';
import { ButtonLink, Card, Eyebrow, H2, Lead, Section } from '@/components/ui';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const turf = await getTurf();
  const name = turf?.name ?? placeholder.turf;
  const title = `Contact ${name} — Sports Turf in ${site.area}, ${site.city}`;
  const description = `Phone, WhatsApp, email, address and opening hours for ${name} in ${site.area}, ${site.city}. Get directions, ask about a booking or plan a group session.`;
  return {
    title,
    description,
    alternates: { canonical: '/contact' },
    openGraph: { title, description, url: '/contact' },
  };
}

export default async function ContactPage() {
  const turf = await getTurf();
  const name = turf?.name ?? placeholder.turf;
  const phone = turf?.phone || placeholder.phone;
  const email = turf?.email || placeholder.email;
  const address = turf?.address || placeholder.address;
  const hours = formatOpeningHours(turf?.openHour, turf?.closeHour);

  const vars = {
    turf: name,
    city: site.city,
    area: site.area,
    min: turf?.minPeople ?? 2,
    max: turf?.maxPeople ?? 14,
    hours,
  };
  const t = (s: string) => fill(s, vars);

  // Real coordinates only: an unseeded turf would otherwise drop a pin in the sea.
  const hasGeo = Boolean(turf && (turf.lat !== 0 || turf.lng !== 0));
  const coords = hasGeo ? `${turf!.lat},${turf!.lng}` : '';
  const mapsHref = hasGeo
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coords)}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address}`)}`;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${site.url}/` },
        { '@type': 'ListItem', position: 2, name: 'Contact Us', item: `${site.url}/contact` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: `Contact ${name}`,
      url: `${site.url}/contact`,
      mainEntity: {
        '@type': 'SportsActivityLocation',
        name,
        url: site.url,
        telephone: phone,
        email,
        address: {
          '@type': 'PostalAddress',
          streetAddress: address,
          addressLocality: site.city,
          addressRegion: site.state || undefined,
          addressCountry: 'IN',
        },
        ...(hasGeo ? { geo: { '@type': 'GeoCoordinates', latitude: turf!.lat, longitude: turf!.lng } } : {}),
        openingHours: `Mo-Su ${String(turf?.openHour ?? 6).padStart(2, '0')}:00-${String((turf?.closeHour ?? 25) % 24).padStart(2, '0')}:00`,
      },
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ═══════════════════════ HEADER + ACTIONS ═══════════════════════ */}
      <Section tone="arena" className="pb-12 pt-28 sm:pb-16 sm:pt-36">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs font-bold uppercase tracking-[0.14em] text-muted">
          <Link href="/" className="inline-flex min-h-11 items-center hover:text-ink">
            Home
          </Link>
          <span aria-hidden className="mx-2">
            /
          </span>
          <span className="text-ink">Contact us</span>
        </nav>

        <Eyebrow>{c.page.eyebrow}</Eyebrow>
        <h1 className="mt-3 text-[2.4rem] font-black uppercase leading-[0.95] tracking-tight sm:text-6xl">
          {t(c.page.h1)}
        </h1>
        <Lead>{t(c.page.lead)}</Lead>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href={`tel:${phone}`} size="lg" className="w-full sm:w-auto">
            {c.actions.call}
          </ButtonLink>
          <ButtonLink
            href={whatsappLink(phone, `Hi ${name}, I have a question about the turf.`)}
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
            target="_blank"
            rel="noopener noreferrer"
          >
            {c.actions.whatsapp}
          </ButtonLink>
        </div>
        <p className="mt-3 text-sm text-muted">{c.actions.note}</p>
      </Section>

      {/* ═══════════════════════ DETAILS + MAP ═══════════════════════ */}
      <Section tone="white">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-14">
          <div className="min-w-0">
            <H2>{c.details.title}</H2>
            <dl className="mt-8 space-y-6 text-[15px]">
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{c.details.rows.phone}</dt>
                <dd className="mt-1">
                  <a
                    href={`tel:${phone}`}
                    className="inline-flex min-h-11 items-center font-bold hover:text-green-deep"
                  >
                    {phone}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{c.details.rows.email}</dt>
                <dd className="mt-1 break-words">
                  <a
                    href={`mailto:${email}`}
                    className="inline-flex min-h-11 items-center font-bold hover:text-green-deep"
                  >
                    {email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                  {c.details.rows.address}
                </dt>
                <dd className="mt-1">
                  <address className="not-italic font-semibold leading-7">{address}</address>
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{c.details.rows.hours}</dt>
                <dd className="mt-1 font-bold">{t(c.details.hoursValue)}</dd>
              </div>
              {turf?.ownerName && (
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                    {c.details.rows.owner}
                  </dt>
                  <dd className="mt-1 font-bold">{turf.ownerName}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="mt-10 min-w-0 lg:mt-0">
            <div className="overflow-hidden rounded-3xl inset-ring-1 inset-ring-ink/[0.06]">
              {hasGeo ? (
                <iframe
                  title={`Map showing ${name}, ${address}`}
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(coords)}&z=16&output=embed`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="aspect-[4/3] w-full border-0 sm:aspect-video"
                />
              ) : (
                <div className="grid aspect-[4/3] place-items-center bg-linear-to-br from-soft-green via-white to-soft-blue p-6 text-center sm:aspect-video">
                  <p className="text-sm font-semibold leading-6 text-ink-soft">
                    The map appears here once the turf&rsquo;s location is set.
                  </p>
                </div>
              )}
            </div>
            <ButtonLink
              href={mapsHref}
              variant="outline"
              className="mt-4 w-full sm:w-auto"
              target="_blank"
              rel="noopener noreferrer"
            >
              {c.details.directions} <span aria-hidden>↗</span>
            </ButtonLink>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════ WHAT PEOPLE ASK ═══════════════════════ */}
      <Section tone="green">
        <H2>{c.topics.title}</H2>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {c.topics.items.map((item) => (
            <li key={item.title} className="min-w-0">
              <Card className="h-full">
                <h3 className="text-base font-black uppercase tracking-tight">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-soft">{t(item.text)}</p>
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
            <ButtonLink href="/book" size="lg" className="mt-8 w-full sm:w-auto">
              {c.cta.primary} <span aria-hidden>→</span>
            </ButtonLink>
          </div>
          <div className="mt-10 min-w-0 space-y-4 text-sm leading-7 text-ink-soft lg:mt-0">
            {c.seo.map((p) => (
              <p key={p.slice(0, 24)}>{t(p)}</p>
            ))}
            <p>
              <Link
                href="/about"
                className="inline-flex min-h-11 items-center font-semibold text-green-deep underline underline-offset-4"
              >
                More about the ground
              </Link>
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
