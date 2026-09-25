import * as c from '@/content/owner';
import { fill } from '@/content/home';
import type { OwnerTotals } from '@/lib/types';
import { cn, formatRupees } from '@/lib/utils';

/**
 * The four numbers that describe the **whole** filter, not the page you are
 * looking at — totals that shifted as you paged would be worse than none.
 *
 * Collected, refunded and income are shown separately rather than netted into
 * one figure: an owner reconciling against a bank statement needs to see the
 * money that went back out, not have it quietly subtracted.
 */
export function StatStrip({ totals }: { totals: OwnerTotals }) {
  const refunded = totals.refunded > 0;
  const blocked = totals.blockedCount > 0;

  return (
    <dl className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
      <Tile label={c.stats.entries} value={totals.entries.toLocaleString('en-IN')} sub={`${totals.players.toLocaleString('en-IN')} ${c.stats.players.toLowerCase()}`} />
      <Tile
        label={c.stats.collected}
        value={formatRupees(totals.collected)}
        sub={refunded ? `${formatRupees(totals.refunded)} ${c.stats.refunded.toLowerCase()}` : undefined}
        subTone={refunded ? 'rose' : undefined}
      />
      <Tile
        label={c.stats.income}
        value={formatRupees(totals.income)}
        sub={c.stats.incomeHint}
        tone="income"
        className={cn('col-span-2', blocked ? 'lg:col-span-1' : 'lg:col-span-2')}
      />
      {/* Only when the turf has actually blocked something in this view —
          a permanent ₹0 tile is noise, not information. */}
      {blocked && (
        <Tile
          label={c.stats.blocked}
          value={formatRupees(totals.blocked)}
          sub={fill(c.stats.blockedSub, { count: totals.blockedCount })}
          tone="blocked"
          className="col-span-2 lg:col-span-1"
        />
      )}
    </dl>
  );
}

function Tile({
  label,
  value,
  sub,
  subTone,
  tone = 'plain',
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  subTone?: 'rose';
  tone?: 'plain' | 'income' | 'blocked';
  className?: string;
}) {
  const income = tone === 'income';
  const block = tone === 'blocked';
  return (
    <div
      className={cn(
        'min-w-0 rounded-3xl p-4 inset-ring-1 transition-shadow duration-300 sm:p-5',
        income
          ? 'bg-linear-to-br from-soft-green via-white to-soft-blue inset-ring-green/25 shadow-[0_24px_50px_-40px_rgba(34,197,94,.9)]'
          : block
            ? 'bg-soft-blue/60 inset-ring-blue/25'
            : 'bg-white inset-ring-ink/[0.07]',
        className,
      )}
    >
      <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted sm:text-[11px]">{label}</dt>
      <dd
        className={cn(
          'mt-1.5 truncate text-[26px] font-black leading-none tabular-nums tracking-tight sm:text-4xl',
          income && 'text-gradient',
          block && 'text-blue-deep',
        )}
      >
        {value}
      </dd>
      {sub && (
        <p className={cn('mt-1.5 truncate text-[11px] font-semibold sm:text-xs', subTone === 'rose' ? 'text-rose-600' : 'text-muted')}>
          {sub}
        </p>
      )}
    </div>
  );
}
