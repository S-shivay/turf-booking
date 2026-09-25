import Link from 'next/link';
import { getTurf } from '@/lib/bookings';
import { placeholder } from '@/lib/site';
import { footer, legal, nav } from '@/content/home';

export async function Footer() {
  const turf = await getTurf();
  const name = turf?.name ?? placeholder.turf;
  const phone = turf?.phone || placeholder.phone;
  const email = turf?.email || placeholder.email;
  const address = turf?.address || placeholder.address;
  const year = new Date().getFullYear();

  return (
    <footer id="site-footer" className="bg-white text-ink" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <p className="text-2xl font-black uppercase tracking-tight">{name}</p>
            <p className="mt-3 max-w-sm text-sm leading-6 text-ink-soft">{footer.blurb}</p>
            <div className="mt-5 flex gap-2">
              <span className="h-1.5 w-10 rounded-full bg-green" />
              <span className="h-1.5 w-10 rounded-full bg-blue" />
            </div>
          </div>

          <nav aria-label="Footer">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">Explore</p>
            <ul className="mt-3 space-y-1">
              {[...nav, { href: '/book', label: 'Book a slot' }].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-11 items-center text-sm font-bold uppercase tracking-wide hover:text-green-deep"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">Contact</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a
                  href={`tel:${phone}`}
                  className="inline-flex min-h-11 items-center font-semibold hover:text-green-deep"
                >
                  {phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${email}`}
                  className="inline-flex min-h-11 items-center font-semibold hover:text-green-deep"
                >
                  {email}
                </a>
              </li>
              <li>
                <address className="not-italic leading-6 text-ink-soft">{address}</address>
              </li>
            </ul>
            <ul className="mt-5 space-y-1">
              {legal.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="inline-flex min-h-11 items-center text-xs font-semibold text-muted hover:text-ink"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-ink/10 pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {name}. All rights reserved.
          </p>
          <p className="font-semibold text-ink">{footer.tagline}</p>
        </div>
      </div>
    </footer>
  );
}
