'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { signInWithGoogle, signOutAction } from '@/app/actions/auth';
import { menu } from '@/content/account';
import { legal } from '@/content/home';
import * as ownerCopy from '@/content/owner';
import { NavLinks } from '@/components/NavLinks';
import { cn } from '@/lib/utils';

export function MenuDrawer({
  turfName,
  phone,
  whatsapp,
  user,
}: {
  turfName: string;
  phone: string;
  whatsapp: string;
  /** Null when signed out — the drawer is where phones get the account menu. */
  user: { name: string | null; email: string; isOwner?: boolean } | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const returnTo = pathname && pathname.startsWith('/') ? pathname : '/';
  const panelRef = useRef<HTMLDivElement>(null);
  const id = useId();
  // Portal: the glass navbar's backdrop-filter would otherwise become the
  // containing block for the fixed panel.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector<HTMLElement>('a,button')?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="grid h-11 w-11 place-items-center rounded-full text-ink hover:bg-ink/5 active:bg-ink/10 lg:hidden"
      >
        <span className="relative block h-4 w-5" aria-hidden>
          <span
            className={cn(
              'absolute left-0 top-0 h-0.5 w-5 rounded bg-current transition-transform duration-200',
              open && 'translate-y-[7px] rotate-45',
            )}
          />
          <span
            className={cn(
              'absolute left-0 top-[7px] h-0.5 w-5 rounded bg-current transition-opacity duration-200',
              open && 'opacity-0',
            )}
          />
          <span
            className={cn(
              'absolute left-0 top-[14px] h-0.5 w-5 rounded bg-current transition-transform duration-200',
              open && '-translate-y-[7px] -rotate-45',
            )}
          />
        </span>
      </button>

      {mounted &&
        createPortal(
          <>
            <div
              onClick={() => setOpen(false)}
              aria-hidden
              className={cn(
                'fixed inset-0 z-40 bg-ink/40 backdrop-blur-[2px] transition-opacity duration-200',
                open ? 'opacity-100' : 'pointer-events-none opacity-0',
              )}
            />
            <div
              id={id}
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Site menu"
              className={cn(
                'fixed inset-y-0 right-0 z-50 flex w-[86vw] max-w-sm flex-col bg-white shadow-2xl transition-[transform,visibility] duration-300 ease-out motion-reduce:transition-none',
                open ? 'visible translate-x-0' : 'invisible translate-x-full',
              )}
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              <div className="flex h-16 items-center justify-between border-b border-ink/10 px-5">
                <span className="font-black uppercase tracking-tight text-ink">{turfName}</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="grid h-11 w-11 place-items-center rounded-full text-ink hover:bg-ink/5"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>

              <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4">
                <NavLinks
                  onNavigate={() => setOpen(false)}
                  className="space-y-1"
                  itemClassName="flex h-14 items-center rounded-2xl px-4 text-lg font-bold uppercase tracking-wide text-ink hover:bg-soft-green"
                  activeClassName="bg-soft-green"
                />

                {/* Account — the desktop UserMenu's entries, with room to breathe. */}
                {user ? (
                  <div className="mt-5 rounded-2xl bg-soft-green/60 p-3">
                    <p className="px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                      {menu.signedInAs}
                    </p>
                    <p className="mt-0.5 truncate px-1 text-sm font-black text-ink">
                      {user.name?.trim() || user.email.split('@')[0]}
                    </p>
                    <p className="truncate px-1 text-xs text-muted">{user.email}</p>
                    {user.isOwner && (
                      <Link
                        href="/owner"
                        onClick={() => setOpen(false)}
                        className="btn-gradient mt-3 flex h-12 items-center justify-center rounded-2xl text-sm font-bold uppercase tracking-wide text-white"
                      >
                        {ownerCopy.desk.name}
                      </Link>
                    )}
                    <Link
                      href="/my-bookings"
                      onClick={() => setOpen(false)}
                      className="mt-3 flex h-12 items-center justify-center rounded-2xl bg-white text-sm font-bold text-ink inset-ring-1 inset-ring-ink/10"
                    >
                      {menu.bookings}
                    </Link>
                    <form action={signOutAction} className="mt-2">
                      <button
                        type="submit"
                        className="flex h-12 w-full items-center justify-center rounded-2xl text-sm font-bold text-muted hover:text-ink"
                      >
                        {menu.signOut}
                      </button>
                    </form>
                  </div>
                ) : (
                  <form action={signInWithGoogle.bind(null, returnTo)} className="mt-5 px-1">
                    <button
                      type="submit"
                      className="flex h-12 w-full items-center justify-center rounded-2xl bg-soft-blue text-sm font-bold text-ink inset-ring-1 inset-ring-ink/10"
                    >
                      {menu.signInLong}
                    </button>
                  </form>
                )}

                <div className="mt-4 grid grid-cols-2 gap-2 px-1">
                  <a
                    href={`tel:${phone}`}
                    className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-soft-blue text-sm font-bold text-ink"
                  >
                    Call
                  </a>
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-soft-green text-sm font-bold text-ink"
                  >
                    WhatsApp
                  </a>
                </div>
                <ul className="mt-6 space-y-1 px-1">
                  {legal.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="flex min-h-11 items-center px-3 text-sm font-semibold text-muted hover:text-ink"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="border-t border-ink/10 p-4">
                <Link
                  href="/book"
                  onClick={() => setOpen(false)}
                  className="btn-gradient flex h-14 w-full items-center justify-center rounded-full text-base font-bold uppercase tracking-wide text-white"
                >
                  Book a slot
                </Link>
              </div>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
