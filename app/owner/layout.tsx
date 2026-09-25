import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireOwner } from '@/lib/auth';

// Live data, personal data, and never for a crawler. `/owner` is also
// disallowed in robots.txt and redirected by proxy.ts when there is no
// session cookie at all — neither of which is an authorisation check. This is.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { default: 'Owner desk', template: '%s · Owner desk' },
  robots: { index: false, follow: false },
};

/**
 * The gate for every owner screen.
 *
 * `requireOwner()` re-reads the role from the database rather than trusting
 * the session token, so taking an address out of OWNER_EMAILS locks it out on
 * the next request instead of the next sign-in.
 *
 * A signed-in customer gets a 404, not a 403: the site should not confirm
 * that an owner area exists to someone who has no business in it.
 */
export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const owner = await requireOwner();
  if (!owner) notFound();
  return children;
}
