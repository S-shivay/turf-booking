/** Tiny className joiner — no runtime dependency needed. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** paise → "₹1,600" */
export function formatRupees(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: paise % 100 === 0 ? 0 : 2,
  }).format(paise / 100);
}

/**
 * A variable that is present but empty is not a value (27 Sep 2026, hit on the
 * first Vercel deploy). Hosting dashboards offer every key they find in
 * `.env.example` and create blank rows for the ones you skip — and `??` only
 * catches `undefined`, so an empty string sails through: `new URL('')` throws
 * during the build, `Number('')` is a pool size of zero, and an empty auth
 * secret is accepted in silence. Trim, then fall back.
 *
 * Keep the `process.env.NEXT_PUBLIC_*` member expression at the call site:
 * Next replaces it textually at build time, so a dynamic lookup would never
 * reach the browser.
 */
export function envOr(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export function ownerEmails(): string[] {
  return (process.env.OWNER_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
