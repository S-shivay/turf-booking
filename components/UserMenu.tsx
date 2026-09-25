'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { signInWithGoogle, signOutAction } from '@/app/actions/auth';
import { menu } from '@/content/account';
import * as owner from '@/content/owner';
import { cn } from '@/lib/utils';

/**
 * The account control in the navbar: a Log in button when signed out, and the
 * customer's name with My bookings / Log out when signed in.
 *
 * Sign-in and sign-out are server actions submitted by real `<form>`s, so
 * they work without JS and cannot be triggered cross-site. The only thing
 * client-side here is opening the menu.
 *
 * Desktop only — on phones the same entries live in the drawer, where there
 * is room for them.
 */
export function UserMenu({
  name,
  email,
  isOwner = false,
}: {
  name: string | null;
  email: string | null;
  /** Owners get one extra entry: the desk where the turf is actually run. */
  isOwner?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const pathname = usePathname();

  // Signing in should bring you back to the page you were reading.
  const returnTo = pathname && pathname.startsWith('/') ? pathname : '/';

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  if (!email) {
    return (
      <form action={signInWithGoogle.bind(null, returnTo)} className="hidden lg:block">
        <button
          type="submit"
          className="flex h-11 items-center rounded-full px-4 text-[13px] font-bold uppercase tracking-wider text-ink/80 transition-colors hover:bg-ink/5 hover:text-ink"
        >
          {menu.signIn}
        </button>
      </form>
    );
  }

  const display = name?.trim() || email.split('@')[0];
  const initial = display.charAt(0).toUpperCase();

  return (
    <div ref={wrapRef} className="relative hidden lg:block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
        aria-label={menu.open}
        className="flex h-11 max-w-[190px] items-center gap-2 rounded-full pl-1.5 pr-3 transition-colors hover:bg-ink/5"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-soft-green text-sm font-black text-green-deep inset-ring-1 inset-ring-green/25">
          {initial}
        </span>
        <span className="truncate text-[13px] font-bold text-ink">{display}</span>
        <svg
          aria-hidden
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn('shrink-0 text-muted transition-transform duration-200', open && 'rotate-180')}
        >
          <path d="M5 9l7 7 7-7" />
        </svg>
      </button>

      <div
        id={id}
        className={cn(
          'absolute right-0 top-[calc(100%+10px)] w-64 origin-top-right rounded-2xl bg-white p-2 shadow-[0_24px_60px_-24px_rgba(16,24,23,.45)] inset-ring-1 inset-ring-ink/10 transition-[opacity,transform] duration-150',
          open ? 'visible opacity-100' : 'invisible -translate-y-1 opacity-0',
        )}
      >
        <div className="border-b border-ink/10 px-3 pb-3 pt-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{menu.signedInAs}</p>
          <p className="mt-0.5 truncate text-sm font-bold text-ink">{display}</p>
          <p className="truncate text-xs text-muted">{email}</p>
        </div>

        {isOwner && (
          <Link
            href="/owner"
            onClick={() => setOpen(false)}
            className="mt-1 flex min-h-11 items-center gap-2.5 rounded-xl bg-soft-green/70 px-3 text-sm font-bold text-ink hover:bg-mint"
          >
            <DeskIcon />
            {owner.desk.name}
          </Link>
        )}

        <Link
          href="/my-bookings"
          onClick={() => setOpen(false)}
          className="mt-1 flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-bold text-ink hover:bg-soft-green"
        >
          <CalendarIcon />
          {menu.bookings}
        </Link>

        <form action={signOutAction}>
          <button
            type="submit"
            className="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-bold text-ink hover:bg-soft-blue"
          >
            <ExitIcon />
            {menu.signOut}
          </button>
        </form>
      </div>
    </div>
  );
}

function DeskIcon() {
  return (
    <svg
      aria-hidden
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-green-deep"
    >
      <path d="M4 20V9m16 11V9M3 9h18l-2-4H5L3 9Z" />
      <path d="M9 20v-5h6v5" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      aria-hidden
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="shrink-0 text-green-deep"
    >
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}

function ExitIcon() {
  return (
    <svg
      aria-hidden
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-muted"
    >
      <path d="M15 17l5-5-5-5M20 12H9M12 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6" />
    </svg>
  );
}
