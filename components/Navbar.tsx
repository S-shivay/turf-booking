import Image from 'next/image';
import Link from 'next/link';
import { currentUser } from '@/lib/auth';
import { getTurf } from '@/lib/bookings';
import { placeholder, site, whatsappLink } from '@/lib/site';
import { MenuDrawer } from '@/components/MenuDrawer';
import { NavLinks } from '@/components/NavLinks';
import { UserMenu } from '@/components/UserMenu';
import { ButtonLink } from '@/components/ui';

/**
 * Floating glass navbar. Desktop: logo · centre links · BOOK A SLOT.
 * Mobile: logo · BOOK · hamburger (drawer). Sits in a fixed wrapper so it
 * floats over the hero; the wrapper is pointer-events-none so the gutters
 * stay clickable.
 */
export async function Navbar() {
  const [turf, user] = await Promise.all([getTurf(), currentUser()]);
  const name = turf?.name ?? placeholder.turf;
  const phone = turf?.phone ?? '';

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-30 px-3 pt-3 sm:px-5 sm:pt-4"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
    >
      <header className="glass pointer-events-auto mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 rounded-full pl-2 pr-2 shadow-[0_12px_40px_-20px_rgba(16,24,23,.35)] sm:h-16 sm:pl-3 sm:pr-3">
        <Link href="/" className="flex min-h-11 min-w-0 items-center gap-2.5" aria-label={`${name} — home`}>
          <span className="btn-gradient relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full text-white ring-2 ring-white/70">
            {site.logoSrc ? (
              <Image src={site.logoSrc} alt="" fill sizes="40px" className="object-cover" />
            ) : (
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M5 19l8-8" />
                <rect
                  x="11"
                  y="3"
                  width="6"
                  height="11"
                  rx="2.5"
                  transform="rotate(45 14 8.5)"
                  fill="currentColor"
                  stroke="none"
                />
                <circle cx="18.5" cy="18" r="2.2" fill="currentColor" stroke="none" />
              </svg>
            )}
          </span>
          <span className="truncate text-[15px] font-black uppercase tracking-tight text-ink sm:text-base">{name}</span>
        </Link>

        <nav aria-label="Primary" className="hidden lg:block">
          <NavLinks
            className="flex items-center gap-1"
            itemClassName="relative block rounded-full px-4 py-2 text-[13px] font-bold uppercase tracking-wider text-ink/80 transition-colors hover:bg-ink/5 hover:text-ink"
            activeClassName="bg-soft-green text-ink"
          />
        </nav>

        <div className="flex shrink-0 items-center gap-1">
          <UserMenu name={user?.name ?? null} email={user?.email ?? null} isOwner={user?.role === 'OWNER'} />
          <ButtonLink href="/book" size="sm" className="h-11 px-4 sm:px-5">
            <span className="sm:hidden">Book</span>
            <span className="hidden sm:inline">Book a slot</span>
          </ButtonLink>
          <MenuDrawer
            turfName={name}
            phone={phone}
            whatsapp={whatsappLink(phone, `Hi, I want to book a slot at ${name}`)}
            user={user ? { name: user.name, email: user.email, isOwner: user.role === 'OWNER' } : null}
          />
        </div>
      </header>
    </div>
  );
}
