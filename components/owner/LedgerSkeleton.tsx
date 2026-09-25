import { cn } from '@/lib/utils';

/**
 * What the desk shows while a page of the ledger is on its way — which is on
 * every search, date, preset, page and page-size change, because the filter
 * lives in the URL and each change is a navigation.
 *
 * It is the finished layout greyed out, not a spinner: the page does not jump
 * when the rows land, and the eye stays where it already was. The shimmer
 * runs left to right so it reads as "loading" rather than "broken".
 */
export function LedgerSkeleton({ rows = 6, withStats = true }: { rows?: number; withStats?: boolean }) {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading bookings…</span>

      {withStats && (
        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
          <Bar className="h-[104px] rounded-3xl" />
          <Bar className="h-[104px] rounded-3xl" delay={80} />
          <Bar className="col-span-2 h-[104px] rounded-3xl" delay={160} />
        </div>
      )}

      <div className="mt-6 space-y-3 lg:hidden">
        {Array.from({ length: rows }, (_, i) => (
          <Bar key={i} className="h-[168px] rounded-3xl" delay={i * 70} />
        ))}
      </div>

      <div className="mt-6 hidden overflow-hidden rounded-3xl bg-white inset-ring-1 inset-ring-ink/[0.07] lg:block">
        <div className="h-11 border-b border-ink/10 bg-soft-green/30" />
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-6 border-b border-ink/[0.05] px-5 py-4 last:border-0">
            <Bar className="h-9 w-32 rounded-lg" delay={i * 60} />
            <Bar className="h-9 flex-1 rounded-lg" delay={i * 60 + 30} />
            <Bar className="h-9 w-16 rounded-lg" delay={i * 60 + 60} />
            <Bar className="h-9 w-24 rounded-lg" delay={i * 60 + 90} />
            <Bar className="h-9 w-28 rounded-full" delay={i * 60 + 120} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Bar({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <div
      className={cn('animate-pulse bg-ink/[0.055] motion-reduce:animate-none', className)}
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}
