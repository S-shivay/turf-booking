'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createContext, useContext, useMemo, useTransition, type ReactNode } from 'react';
import * as c from '@/content/owner';
import { cn } from '@/lib/utils';

/**
 * Every navigation on the desk — searching, a date range, a preset, a page,
 * a page size — goes through one transition, so one place knows whether the
 * desk is waiting on the server and everything can say so.
 *
 * Why this exists rather than the keyed `<Suspense>` alone: React
 * deliberately does **not** show a Suspense fallback for content that is
 * already on screen when the update is inside a transition. That is usually
 * the right call — no layout flash — but it left the table looking frozen
 * while a filter was being applied. So the boundary handles the first paint,
 * and this handles every change after it.
 */
const LedgerNavContext = createContext<{ pending: boolean; go: (href: string) => void } | null>(null);

export function LedgerNavProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const value = useMemo(
    () => ({ pending, go: (href: string) => startTransition(() => router.push(href)) }),
    [pending, router],
  );
  return <LedgerNavContext.Provider value={value}>{children}</LedgerNavContext.Provider>;
}

export function useLedgerNav() {
  const ctx = useContext(LedgerNavContext);
  if (!ctx) throw new Error('useLedgerNav outside LedgerNavProvider');
  return ctx;
}

/**
 * A real link — right-click, middle-click and "open in new tab" all work —
 * that routes through the shared transition on a plain left click, so the
 * desk shows that it is working.
 */
export function NavLink({
  href,
  className,
  children,
  ...rest
}: { href: string; className?: string; children: ReactNode } & Omit<
  React.ComponentPropsWithoutRef<typeof Link>,
  'href' | 'className' | 'children'
>) {
  const { go } = useLedgerNav();
  return (
    <Link
      href={href}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        go(href);
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}

/**
 * Dims the rows and totals while the next page is on its way, rather than
 * replacing them: the numbers you were reading stay legible underneath, the
 * page does not jump, and the veil makes it obvious that they are stale.
 * The content is made inert so a tap cannot land on a row that is about to
 * be replaced.
 */
export function PendingVeil({ children }: { children: ReactNode }) {
  const { pending } = useLedgerNav();
  return (
    <div className="relative min-w-0" aria-busy={pending}>
      <div
        inert={pending}
        className={cn(
          'transition-[opacity,filter] duration-200',
          pending && 'pointer-events-none opacity-45 blur-[1px]',
        )}
      >
        {children}
      </div>

      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 top-24 flex justify-center transition-opacity duration-200',
          pending ? 'opacity-100' : 'opacity-0',
        )}
      >
        <p
          role="status"
          className="inline-flex items-center gap-2.5 rounded-full bg-white px-5 py-3 text-[13px] font-bold uppercase tracking-wide text-ink shadow-[0_18px_40px_-16px_rgba(16,24,23,.45)] inset-ring-1 inset-ring-ink/10"
        >
          <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" className="animate-spin text-green-deep">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity=".25" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          {pending ? c.filters.loading : ''}
        </p>
      </div>
    </div>
  );
}
