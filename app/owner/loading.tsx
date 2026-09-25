import { LedgerSkeleton } from '@/components/owner/LedgerSkeleton';
import { Section } from '@/components/ui';

/**
 * The first arrival at the desk. Filter changes after that are handled by the
 * keyed Suspense boundary inside the page, which shows the same skeleton —
 * one component, so the two never drift apart.
 */
export default function LoadingDesk() {
  return (
    <Section tone="white" className="pb-10 pt-28 sm:pt-36">
      <div className="h-14 w-64 animate-pulse rounded-2xl bg-ink/[0.06]" />
      <div className="mt-6 h-[84px] animate-pulse rounded-3xl bg-ink/[0.05]" />
      <LedgerSkeleton />
    </Section>
  );
}
