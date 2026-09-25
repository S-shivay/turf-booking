'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Sticky bottom "Book a slot" on phones. Appears once the hero has
 * scrolled away, and hides again while the final CTA or footer is on
 * screen so it never covers a booking button or contact details.
 */
export function MobileCTA({ label = 'Book a slot' }: { label?: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hero = document.getElementById('home');
    const blockers = ['final-cta', 'site-footer'].map((id) => document.getElementById(id)).filter(Boolean) as Element[];
    let heroVisible = true;
    let blocked = false;
    const update = () => setShow(!heroVisible && !blocked);

    const ioHero = new IntersectionObserver(
      ([e]) => {
        heroVisible = e.isIntersecting;
        update();
      },
      { threshold: 0.15 },
    );
    const ioBlock = new IntersectionObserver(
      () => {
        // Recompute from the live rects so several targets never leave stale state.
        blocked = blockers.some((el) => {
          const r = el.getBoundingClientRect();
          return r.top < window.innerHeight && r.bottom > 0;
        });
        update();
      },
      { threshold: 0.05 },
    );

    if (hero) ioHero.observe(hero);
    blockers.forEach((el) => ioBlock.observe(el));
    return () => {
      ioHero.disconnect();
      ioBlock.disconnect();
    };
  }, []);

  return (
    <div
      aria-hidden={!show}
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 px-4 pb-3 transition-[transform,opacity] duration-300 ease-out md:hidden',
        show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0',
      )}
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
    >
      <Link
        href="/book"
        tabIndex={show ? 0 : -1}
        className="btn-gradient flex h-14 w-full items-center justify-center gap-2 rounded-full text-base font-bold uppercase tracking-wide text-white shadow-[0_14px_36px_-12px_rgba(34,197,94,.65)]"
      >
        {label}
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}
