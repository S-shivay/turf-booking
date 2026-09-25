import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { getTurf } from '@/lib/bookings';
import { placeholder, site } from '@/lib/site';
import * as c from '@/content/home';
import { ButtonLink, Card, Eyebrow, H2, Lead, Photo, Section } from '@/components/ui';
import { Motion } from '@/components/home/Motion';
import {
  CommunityIcon,
  ExperienceArt,
  FacilityIcon,
  HeroScene,
  Silhouettes,
  SportArt,
  SportIcon,
} from '@/components/home/art';

export const dynamic = 'force-dynamic';

const delay = (ms: number) => ({ ['--reveal-delay' as string]: `${ms}ms` }) as CSSProperties;

export async function generateMetadata(): Promise<Metadata> {
  const turf = await getTurf();
  const name = turf?.name ?? placeholder.turf;
  const title = `${name} — Sports Turf in ${site.city} | Cricket, Football & Badminton`;
  const description = `Book ${name}, a modern sports turf in ${site.area}, ${site.city}. Cricket turf, football turf and badminton court with online slot booking, free equipment, café, parking and full security.`;
  return {
    title,
    description,
    alternates: { canonical: '/' },
    openGraph: { title, description, url: '/' },
  };
}

export default async function Home() {
  const turf = await getTurf();
  const name = turf?.name ?? placeholder.turf;
  const vars = { turf: name, city: site.city, area: site.area, min: turf?.minPeople ?? 2, max: turf?.maxPeople ?? 14 };
  const t = (s: string) => c.fill(s, vars);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'SportsActivityLocation',
      name,
      description: t(c.hero.seo),
      url: site.url,
      telephone: turf?.phone || placeholder.phone,
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
      amenityFeature: c.facilities.items.map((f) => ({
        '@type': 'LocationFeatureSpecification',
        name: f.title,
        value: true,
      })),
      potentialAction: { '@type': 'ReserveAction', target: `${site.url}/book`, name: 'Book your slot' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: c.faq.items.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ];

  return (
    <>
      <Motion />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ═══════════════════════ HERO ═══════════════════════ */}
      <section id="home" className="bg-arena-soft relative overflow-hidden pt-24 sm:pt-32">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 top-24 h-80 w-80 rounded-full bg-mint/60 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 top-64 h-96 w-96 rounded-full bg-sky/60 blur-3xl"
        />

        <div className="mx-auto grid w-full max-w-6xl items-center gap-8 px-5 pb-14 sm:px-8 sm:pb-20 lg:grid-cols-[1.05fr_1fr] lg:gap-6 lg:pb-28">
          <div className="relative">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-ink inset-ring-1 inset-ring-ink/10 sm:text-[11px] sm:tracking-[0.18em]">
              <span className="h-1.5 w-1.5 rounded-full bg-green" />
              {c.hero.eyebrow}
            </p>
            <h1 className="mt-5 text-[2.9rem] font-black uppercase leading-[0.92] tracking-[-0.02em] sm:text-7xl lg:text-[5.2rem]">
              <span className="block">{c.hero.h1a}</span>
              <span className="text-gradient block">{c.hero.h1b}</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-ink-soft sm:text-lg sm:leading-8">{c.hero.sub}</p>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted">{t(c.hero.seo)}</p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/book" size="lg" className="w-full sm:w-auto">
                {c.hero.cta} <span aria-hidden>→</span>
              </ButtonLink>
              <ButtonLink href="#experience" variant="outline" size="lg" className="w-full sm:w-auto">
                {c.hero.secondary}
              </ButtonLink>
            </div>
            <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.2em] text-muted">{t(c.hero.micro)}</p>

            {/* compact scene on phones, between CTA and trust row */}
            <div className="mx-auto mt-4 w-full max-w-sm lg:hidden">
              <HeroScene compact />
            </div>

            <ul className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
              {c.hero.trust.map((tr, i) => (
                <li
                  key={tr.title}
                  data-reveal
                  style={delay(i * 90)}
                  className="rounded-2xl bg-white/80 px-3 py-3 inset-ring-1 inset-ring-ink/[0.06]"
                >
                  <p className="text-[12px] font-bold uppercase tracking-wide sm:text-[13px]">{tr.title}</p>
                  <p className="mt-0.5 hidden text-xs text-muted sm:block">{t(tr.text)}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative hidden lg:block" data-reveal="scale">
            <HeroScene />
          </div>
        </div>
      </section>

      {/* ═══════════════════ QUICK SPORTS STRIP ═══════════════════ */}
      <section aria-labelledby="quick-title" className="relative z-10 -mt-6 px-5 sm:px-8">
        <div
          className="glass mx-auto max-w-6xl rounded-3xl p-3 shadow-[0_30px_80px_-40px_rgba(16,24,23,.35)] sm:p-4"
          data-reveal
        >
          <h2
            id="quick-title"
            className="px-2 pb-2 pt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-muted sm:px-3"
          >
            {c.quick.title}
          </h2>
          <ul className="grid gap-2 sm:grid-cols-3">
            {c.quick.items.map((q) => (
              <li key={q.id}>
                <a
                  href={`#${q.id}`}
                  className="group flex items-center gap-4 rounded-2xl bg-white px-4 py-4 inset-ring-1 inset-ring-ink/[0.06] transition-all duration-300 hover:-translate-y-0.5 hover:inset-ring-green hover:shadow-[0_18px_40px_-24px_rgba(34,197,94,.6)] active:translate-y-0"
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-soft-green text-green-deep transition-all duration-300 group-hover:rotate-12 group-hover:scale-110 group-hover:bg-green group-hover:text-white group-active:rotate-12 group-active:bg-green group-active:text-white">
                    <SportIcon id={q.id} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-base font-black uppercase tracking-wide">{q.title}</span>
                    <span className="block text-sm text-muted">{q.text}</span>
                  </span>
                  <span
                    aria-hidden
                    className="ml-auto text-ink/30 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-green-deep"
                  >
                    →
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ═══════════════════════ INTRO ═══════════════════════ */}
      <Section tone="white" className="pt-24 sm:pt-32">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
          <div data-reveal>
            <Eyebrow>The experience</Eyebrow>
            <H2 className="mt-3">{c.intro.title}</H2>
            <div className="mt-6 flex gap-2">
              <span className="h-1.5 w-14 rounded-full bg-green" />
              <span className="h-1.5 w-6 rounded-full bg-blue" />
            </div>
          </div>
          <div className="space-y-5 text-base leading-7 text-ink-soft sm:text-lg sm:leading-8">
            {c.intro.paragraphs.map((p, i) => (
              <p key={i} data-reveal style={delay(i * 120)}>
                {t(p)}
              </p>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════════════ SPORTS ═══════════════════════ */}
      <Section tone="green" id="sports" inner="!px-0">
        <div className="px-5 sm:px-8" data-reveal>
          <Eyebrow>Sports</Eyebrow>
          <H2 className="mt-3">{c.sports.title}</H2>
          <Lead>{c.sports.intro}</Lead>
        </div>
        <ul className="snap-strip mt-10 sm:px-8 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:px-8">
          {c.sports.cards.map((s, i) => (
            <li
              key={s.id}
              id={s.id}
              className="w-[78vw] max-w-sm md:w-auto md:max-w-none"
              data-reveal
              style={delay(i * 120)}
            >
              <article className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white inset-ring-1 inset-ring-ink/[0.06] shadow-[0_20px_50px_-30px_rgba(16,24,23,.25)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1.5 hover:shadow-[0_34px_70px_-30px_rgba(16,24,23,.35)]">
                <div className="relative aspect-[3/2] bg-linear-to-br from-soft-green via-white to-soft-blue p-4">
                  <SportArt id={s.id} />
                  <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-ink inset-ring-1 inset-ring-ink/10">
                    <SportIcon id={s.id} className="h-3.5 w-3.5" /> {s.name}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-2xl font-black uppercase leading-none tracking-tight">{s.headline}</h3>
                  <p className="mt-3 flex-1 text-sm leading-6 text-ink-soft sm:text-[15px]">{s.text}</p>
                  <a
                    href="/book"
                    className="mt-3 inline-flex min-h-11 items-center gap-2 text-[13px] font-bold uppercase tracking-wider text-green-deep transition-colors hover:text-ink"
                  >
                    {s.cta}
                    <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                      →
                    </span>
                  </a>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </Section>

      {/* ═══════════════════ MID CTA (#2) ═══════════════════ */}
      <section aria-labelledby="mid-title" className="bg-arena relative overflow-hidden py-20 sm:py-28">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="animate-float absolute -left-10 top-10 h-40 w-40 rounded-full border-[10px] border-white/50" />
          <div className="football-drift absolute right-[8%] top-[18%] h-24 w-24 rounded-full bg-white shadow-[inset_-8px_-8px_0_rgba(16,24,23,.08)] sm:h-32 sm:w-32">
            <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
              <polygon points="50,28 68,41 61,62 39,62 32,41" fill="#101817" fillOpacity="0.85" />
              <path
                d="M50 28V10M68 41l18-6M61 62l12 16M39 62 27 78M32 41 14 35"
                stroke="#101817"
                strokeOpacity="0.6"
                strokeWidth="2.5"
                fill="none"
              />
            </svg>
          </div>
          <div className="animate-float absolute bottom-[-4rem] left-[12%] h-56 w-56 rounded-full bg-white/40 blur-2xl" />
          <div
            className="absolute bottom-8 right-[20%] h-10 w-10 rounded-full bg-[#e11d48] shadow-[0_10px_30px_-8px_rgba(225,29,72,.6)] animate-float"
            style={{ animationDelay: '1.2s' }}
          />
        </div>
        <div className="relative mx-auto max-w-4xl px-5 text-center sm:px-8" data-reveal>
          <h2 id="mid-title" className="text-[2.2rem] font-black uppercase leading-[0.95] tracking-tight sm:text-6xl">
            {c.midCta.title}
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-ink-soft sm:text-lg sm:leading-8">
            {c.midCta.text}
          </p>
          <ButtonLink href="/book" variant="dark" size="xl" className="mt-9 w-full sm:w-auto">
            {c.midCta.cta} <span aria-hidden>→</span>
          </ButtonLink>
        </div>
      </section>

      {/* ═══════════════ BENEFITS + FACILITIES ═══════════════ */}
      <Section tone="white" id="facilities">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-16" data-reveal>
          <div>
            <Eyebrow>Facilities</Eyebrow>
            <H2 className="mt-3">{c.benefits.title}</H2>
          </div>
          <p className="text-base leading-7 text-ink-soft sm:text-lg sm:leading-8">{t(c.benefits.text)}</p>
        </div>

        <h3 className="mt-14 text-[11px] font-bold uppercase tracking-[0.2em] text-muted">{c.facilities.title}</h3>
        <ul className="mt-5 grid gap-3 min-[340px]:grid-cols-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {c.facilities.items.map((f, i) => (
            <li key={f.title} data-reveal style={delay((i % 4) * 80)}>
              <div className="group h-full rounded-2xl bg-white p-4 inset-ring-1 inset-ring-ink/[0.07] transition-all duration-300 hover:-translate-y-1 hover:inset-ring-green hover:shadow-[0_22px_44px_-28px_rgba(34,197,94,.6)] sm:p-5">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-soft-blue text-ink transition-all duration-300 group-hover:bg-green group-hover:text-white group-hover:[transform:rotate(-6deg)_scale(1.08)]">
                  <FacilityIcon name={f.icon} />
                </span>
                <h4 className="mt-4 text-[13px] font-black uppercase leading-snug tracking-wide sm:text-sm">
                  {f.title}
                </h4>
                <p className="mt-1.5 text-[13px] leading-5 text-muted">{f.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      {/* ═══════════════ PLAY / REFRESH / RELAX ═══════════════ */}
      <Section tone="blue" id="experience">
        <div data-reveal>
          <Eyebrow>Why play here</Eyebrow>
          <H2 className="mt-3 max-w-3xl">{c.experience.title}</H2>
        </div>
        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          {c.experience.items.map((e, i) => (
            <li key={e.id} data-reveal style={delay(i * 140)}>
              <Card className="h-full p-0">
                <div className="aspect-[4/3] p-6">
                  <ExperienceArt id={e.id} />
                </div>
                <div className="px-6 pb-7">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-deep">0{i + 1}</p>
                  <h3 className="mt-1 text-3xl font-black uppercase tracking-tight">{e.title}</h3>
                  <p className="mt-2 text-[15px] leading-6 text-ink-soft">{e.text}</p>
                </div>
              </Card>
            </li>
          ))}
        </ol>
      </Section>

      {/* ═══════════════════ LIVE GALLERY ═══════════════════ */}
      <Section tone="white" id="gallery">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between" data-reveal>
          <div>
            <Eyebrow>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green opacity-70 motion-reduce:hidden" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green" />
              </span>
              {c.gallery.eyebrow}
            </Eyebrow>
            <H2 className="mt-3 max-w-2xl">{c.gallery.title}</H2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-ink-soft">{c.gallery.text}</p>
        </div>
        <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {c.gallery.slots.map((cap, i) => (
            <li key={cap} data-reveal style={delay((i % 4) * 80)} className={i === 0 ? 'col-span-2 row-span-2' : ''}>
              <Photo
                src={turf?.images[i]}
                alt={`${cap} at ${name}, ${site.city}`}
                caption={cap}
                ratio={i === 0 ? '1/1' : '4/3'}
                sizes={i === 0 ? '(max-width: 768px) 100vw, 50vw' : '(max-width: 768px) 50vw, 25vw'}
                className="h-full"
              />
            </li>
          ))}
        </ul>
      </Section>

      {/* ═══════════════════ 3-STEP PROCESS ═══════════════════ */}
      <Section tone="white">
        <div data-reveal className="text-center">
          <Eyebrow className="justify-center">How it works</Eyebrow>
          <H2 className="mx-auto mt-3 max-w-3xl">{c.steps.title}</H2>
        </div>
        <div className="relative mt-14" data-reveal>
          {/* connecting line — horizontal on desktop */}
          <svg
            aria-hidden
            className="absolute left-0 right-0 top-9 hidden h-2 w-full md:block"
            viewBox="0 0 1000 8"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="steps-g" gradientUnits="userSpaceOnUse" x1="160" y1="4" x2="840" y2="4">
                <stop offset="0" stopColor="#22c55e" />
                <stop offset="1" stopColor="#38bdf8" />
              </linearGradient>
            </defs>
            <path
              className="steps-line"
              d="M 160 4 H 840"
              stroke="url(#steps-g)"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
          {/* vertical on mobile */}
          <div
            aria-hidden
            className="absolute bottom-10 left-9 top-10 w-1 rounded-full bg-linear-to-b from-green to-blue md:hidden"
          />

          <ol className="relative grid gap-8 md:grid-cols-3 md:gap-6">
            {c.steps.items.map((s, i) => (
              <li key={s.n} className="flex gap-5 md:flex-col md:items-center md:text-center">
                <span
                  className="step-num btn-gradient grid h-[4.5rem] w-[4.5rem] shrink-0 place-items-center rounded-full text-xl font-black text-white shadow-[0_16px_36px_-14px_rgba(34,197,94,.8)] ring-4 ring-white"
                  style={{ ['--i' as string]: i } as CSSProperties}
                >
                  {s.n}
                </span>
                <div className="pt-3 md:pt-0">
                  <h3 className="text-2xl font-black uppercase tracking-tight">{s.title}</h3>
                  <p className="mt-2 max-w-xs text-[15px] leading-6 text-ink-soft">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* ═══════════════════ COMMUNITY ═══════════════════ */}
      <Section tone="white">
        <div data-reveal>
          <Eyebrow>Community</Eyebrow>
          <H2 className="mt-3">{c.community.title}</H2>
        </div>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {c.community.items.map((k, i) => (
            <li key={k.id} data-reveal style={delay(i * 100)}>
              <div className="group relative h-full overflow-hidden rounded-3xl bg-linear-to-br from-soft-green to-soft-blue p-6 inset-ring-1 inset-ring-ink/[0.06] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_60px_-30px_rgba(16,24,23,.3)]">
                <span
                  aria-hidden
                  className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/60 transition-transform duration-500 group-hover:scale-150"
                />
                <span className="relative grid h-14 w-14 place-items-center rounded-2xl bg-white text-ink shadow-sm transition-colors duration-300 group-hover:bg-ink group-hover:text-white">
                  <CommunityIcon id={k.id} />
                </span>
                <h3 className="relative mt-5 text-xl font-black uppercase tracking-tight">{k.title}</h3>
                <p className="relative mt-2 text-sm leading-6 text-ink-soft">{k.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      {/* ═══════════════════ SEO CONTENT ═══════════════════ */}
      <Section tone="blue">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.3fr] lg:gap-16">
          <div data-reveal>
            <Eyebrow>About the turf</Eyebrow>
            <H2 className="mt-3">{c.seo.title}</H2>
            <div className="mt-8 hidden rounded-3xl bg-white p-6 inset-ring-1 inset-ring-ink/[0.06] lg:block">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">At a glance</p>
              <dl className="mt-3 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Sports</dt>
                  <dd className="font-bold">Cricket · Football · Badminton</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Players</dt>
                  <dd className="font-bold">
                    {vars.min}–{vars.max} per booking
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Booking</dt>
                  <dd className="font-bold">Online, instant</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Location</dt>
                  <dd className="font-bold">
                    {site.area}, {site.city}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
          <div className="space-y-5 text-base leading-7 text-ink-soft sm:text-[17px] sm:leading-8">
            {c.seo.paragraphs.map((p, i) => (
              <p key={i} data-reveal style={delay(i * 100)}>
                {t(p)}
              </p>
            ))}
          </div>
        </div>

        <div className="mt-14 rounded-3xl bg-white p-6 inset-ring-1 inset-ring-ink/[0.06] sm:p-10" data-reveal>
          <h3 className="text-2xl font-black uppercase leading-tight tracking-tight sm:text-3xl">{t(c.local.title)}</h3>
          <p className="mt-4 text-base leading-7 text-ink-soft sm:text-[17px] sm:leading-8">{t(c.local.text)}</p>
        </div>
      </Section>

      {/* ═══════════════════ TESTIMONIALS ═══════════════════ */}
      <Section tone="white" inner="!px-0">
        <div className="px-5 sm:px-8" data-reveal>
          <Eyebrow>Players</Eyebrow>
          <H2 className="mt-3">{c.testimonials.title}</H2>
        </div>
        <ul className="snap-strip mt-10 sm:px-8 lg:grid lg:grid-cols-4 lg:gap-5 lg:overflow-visible lg:px-8">
          {c.testimonials.items.map((r, i) => (
            <li key={i} className="w-[80vw] max-w-sm lg:w-auto lg:max-w-none" data-reveal style={delay(i * 100)}>
              <figure className="flex h-full flex-col rounded-3xl bg-soft-green p-6 inset-ring-1 inset-ring-ink/[0.05]">
                <span aria-hidden className="text-gradient text-5xl font-black leading-none">
                  “
                </span>
                <blockquote className="mt-2 flex-1 text-[15px] leading-7 text-ink">{r.quote}</blockquote>
                <figcaption className="mt-5 flex items-center justify-between text-xs">
                  <span className="font-bold uppercase tracking-wider">— {r.who}</span>
                  <span className="rounded-full bg-white px-2.5 py-1 font-bold uppercase tracking-wider text-green-deep">
                    {r.tag}
                  </span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </Section>

      {/* ═══════════════════════ FAQ ═══════════════════════ */}
      <Section tone="green" id="faq">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.4fr] lg:gap-16">
          <div data-reveal>
            <Eyebrow>FAQ</Eyebrow>
            <H2 className="mt-3">{c.faq.title}</H2>
            <p className="mt-4 text-sm text-muted">Something else? Call or WhatsApp — details in the footer.</p>
          </div>
          <div className="space-y-3">
            {c.faq.items.map((f, i) => (
              <details
                key={f.q}
                data-reveal
                style={delay(i * 50)}
                className="group rounded-2xl bg-white inset-ring-1 inset-ring-ink/[0.06] transition-shadow open:shadow-[0_20px_50px_-30px_rgba(16,24,23,.3)]"
              >
                <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-4 px-5 py-4 text-[15px] font-bold sm:text-base">
                  {f.q}
                  <span
                    aria-hidden
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-soft-green text-green-deep transition-all duration-300 group-open:rotate-45 group-open:bg-ink group-open:text-white"
                  >
                    +
                  </span>
                </summary>
                <p className="faq-body px-5 pb-5 text-[15px] leading-7 text-ink-soft">{t(f.a)}</p>
              </details>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════════ FINAL CTA (#3) ═══════════════════ */}
      <section id="final-cta" aria-labelledby="final-title" className="relative overflow-hidden bg-ink text-white">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(60rem_30rem_at_20%_-10%,rgba(34,197,94,.35),transparent_60%),radial-gradient(50rem_30rem_at_90%_110%,rgba(56,189,248,.35),transparent_60%)]"
        />
        <Silhouettes />
        <div className="relative mx-auto max-w-4xl px-5 py-24 text-center sm:px-8 sm:py-36" data-reveal>
          <h2
            id="final-title"
            className="text-[3rem] font-black uppercase leading-[0.9] tracking-[-0.02em] sm:text-7xl lg:text-8xl"
          >
            <span className="block">{c.finalCta.h1}</span>
            <span className="text-gradient block">{c.finalCta.h2}</span>
          </h2>
          <p className="mx-auto mt-7 max-w-xl text-base leading-7 text-white/75 sm:text-lg">{c.finalCta.text}</p>
          <ButtonLink href="/book" variant="white" size="xl" className="mt-10 w-full sm:w-auto">
            {c.finalCta.cta} <span aria-hidden>→</span>
          </ButtonLink>
          <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">
            Cricket • Football • Badminton
          </p>
        </div>
      </section>
    </>
  );
}
