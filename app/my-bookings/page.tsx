import type { Metadata } from 'next';
import Link from 'next/link';
import { signInWithGoogle } from '@/app/actions/auth';
import { currentUser } from '@/lib/auth';
import { getTurf, listMyBookings } from '@/lib/bookings';
import { placeholder } from '@/lib/site';
import { CHANGE_WINDOW_HOURS } from '@/lib/slots';
import { fill } from '@/content/home';
import * as c from '@/content/account';
import { BookingList } from '@/components/account/BookingList';
import { Button, ButtonLink, Eyebrow, H2, Lead, Section } from '@/components/ui';

// Personal, live, and never for a crawler.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My bookings',
  description: 'Your bookings, payments and refunds.',
  robots: { index: false, follow: false },
};

export default async function MyBookingsPage() {
  const [turf, user] = await Promise.all([getTurf(), currentUser()]);
  const turfName = turf?.name ?? placeholder.turf;
  const turfPhone = turf?.phone || placeholder.phone;

  if (!user) {
    return (
      <Section tone="white" className="pb-20 pt-32 sm:pt-40">
        <Eyebrow>{c.page.eyebrow}</Eyebrow>
        <H2 className="mt-3">{c.signedOut.title}</H2>
        <Lead>{c.signedOut.body}</Lead>
        <form action={signInWithGoogle.bind(null, '/my-bookings')} className="mt-8">
          <Button type="submit" size="lg" className="w-full sm:w-auto">
            {c.signedOut.cta}
          </Button>
        </form>
      </Section>
    );
  }

  const now = new Date();
  const bookings = await listMyBookings(user.id, now);
  const displayName = user.name?.trim() || user.email.split('@')[0];

  return (
    <>
      <Section tone="arena" className="pb-10 pt-28 sm:pb-12 sm:pt-36">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs font-bold uppercase tracking-[0.14em] text-muted">
          <Link href="/" className="inline-flex min-h-11 items-center hover:text-ink">
            Home
          </Link>
          <span aria-hidden className="mx-2">
            /
          </span>
          <span className="text-ink">My bookings</span>
        </nav>

        <Eyebrow>{c.page.eyebrow}</Eyebrow>
        <h1 className="mt-3 text-[2.4rem] font-black uppercase leading-[0.95] tracking-tight sm:text-6xl">
          {c.page.h1}
        </h1>
        <Lead>{fill(c.page.lead, { turf: turfName, notice: CHANGE_WINDOW_HOURS })}</Lead>
        <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-ink inset-ring-1 inset-ring-ink/[0.08]">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-soft-green text-xs font-black text-green-deep">
            {displayName.charAt(0).toUpperCase()}
          </span>
          {fill(c.page.greeting, { name: displayName })}
        </p>
      </Section>

      <Section tone="white" className="py-10 sm:py-14">
        {bookings.length === 0 ? (
          <div className="max-w-xl rounded-3xl bg-soft-green p-8 inset-ring-1 inset-ring-green/20">
            <h2 className="text-xl font-black uppercase tracking-tight">{c.empty.title}</h2>
            <p className="mt-3 text-[15px] leading-7 text-ink-soft">{c.empty.body}</p>
            <ButtonLink href="/book" size="lg" className="mt-6 w-full sm:w-auto">
              {c.empty.cta}
            </ButtonLink>
          </div>
        ) : (
          <BookingList bookings={bookings} serverNow={now.toISOString()} turfPhone={turfPhone} />
        )}
      </Section>
    </>
  );
}
