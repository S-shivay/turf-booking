import type { Metadata } from 'next';
import Link from 'next/link';
import { getTurf } from '@/lib/bookings';
import { placeholder, site } from '@/lib/site';
import { HOLD_MINUTES } from '@/lib/slots';
import { fill } from '@/content/home';
import * as c from '@/content/cancellation';
import { LegalBody, LegalToc } from '@/components/legal';
import { ButtonLink, Eyebrow, H2, Lead, Section } from '@/components/ui';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const turf = await getTurf();
  const name = turf?.name ?? placeholder.turf;
  const title = `Cancellation Policy — ${name}`;
  const description = `Cancellation and refund policy for ${name} in ${site.area}, ${site.city}: ${c.NOTICE_HOURS} hours notice for a full refund or a free reschedule, how to cancel, and how long refunds take.`;
  return {
    title,
    description,
    alternates: { canonical: '/cancellation' },
    openGraph: { title, description, url: '/cancellation' },
  };
}

export default async function CancellationPage() {
  const turf = await getTurf();
  const name = turf?.name ?? placeholder.turf;
  const phone = turf?.phone || placeholder.phone;
  const email = turf?.email || placeholder.email;
  const address = turf?.address || placeholder.address;

  const vars = {
    turf: name,
    city: site.city,
    area: site.area,
    phone,
    email,
    address,
    notice: c.NOTICE_HOURS,
    hold: HOLD_MINUTES,
  };
  const t = (s: string) => fill(s, vars);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${site.url}/` },
        { '@type': 'ListItem', position: 2, name: 'Cancellation Policy', item: `${site.url}/cancellation` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `Cancellation Policy — ${name}`,
      url: `${site.url}/cancellation`,
      dateModified: c.updatedISO,
      publisher: { '@type': 'Organization', name, email, telephone: phone },
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
          <span className="text-ink">Cancellation</span>
        </nav>

        <Eyebrow>{c.page.eyebrow}</Eyebrow>
        <h1 className="mt-3 text-[2.2rem] font-black uppercase leading-[0.95] tracking-tight sm:text-6xl">
          {c.page.h1}
        </h1>
        <Lead>{t(c.page.lead)}</Lead>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-muted">
          {c.page.updatedLabel} · <time dateTime={c.updatedISO}>{c.updated}</time>
        </p>
      </Section>

      {/* ═══════════════════════ SUMMARY + CONTENTS ═══════════════════════ */}
      <Section tone="white" className="py-12 sm:py-16">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)] lg:gap-14">
          <div className="min-w-0 rounded-3xl bg-soft-green p-6 inset-ring-1 inset-ring-green/20 sm:p-8">
            <h2 className="text-lg font-black uppercase tracking-tight">{c.summary.title}</h2>
            <ul className="mt-5 space-y-3">
              {c.summary.points.map((p) => (
                <li key={p.slice(0, 24)} className="flex gap-3 text-[15px] leading-7">
                  <span aria-hidden className="mt-2 h-2 w-2 shrink-0 rounded-full bg-green" />
                  <span>{t(p)}</span>
                </li>
              ))}
            </ul>
          </div>

          <LegalToc sections={c.sections} title={c.page.tocTitle} className="mt-8 min-w-0 lg:mt-0" />
        </div>
      </Section>

      {/* ═══════════════════════ THE POLICY ═══════════════════════ */}
      <Section tone="white" className="pt-0">
        <LegalBody sections={c.sections} t={t} />
      </Section>

      {/* ═══════════════════════ CONTACT ═══════════════════════ */}
      <Section tone="green">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-14">
          <div className="min-w-0">
            <H2>{c.contact.title}</H2>
            <Lead>{t(c.contact.body)}</Lead>
            <dl className="mt-8 space-y-5 text-[15px]">
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{c.contact.phoneLabel}</dt>
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
                <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{c.contact.emailLabel}</dt>
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
                  {c.contact.addressLabel}
                </dt>
                <dd className="mt-1">
                  <address className="not-italic font-semibold leading-7">{address}</address>
                </dd>
              </div>
            </dl>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/contact" size="lg" className="w-full sm:w-auto">
                {c.contact.cta}
              </ButtonLink>
              <ButtonLink href="/book" variant="outline" size="lg" className="w-full sm:w-auto">
                {c.contact.book}
              </ButtonLink>
            </div>
          </div>

          <div className="mt-10 min-w-0 space-y-4 text-sm leading-7 text-ink-soft lg:mt-0">
            {c.seo.map((p) => (
              <p key={p.slice(0, 24)}>{t(p)}</p>
            ))}
            <p>
              <Link
                href="/terms"
                className="inline-flex min-h-11 items-center font-semibold text-green-deep underline underline-offset-4"
              >
                {c.contact.terms}
              </Link>
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
