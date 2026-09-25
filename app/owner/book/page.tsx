import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BookingFlow, type DayOption, type RescheduleMode } from '@/components/book/BookingFlow';
import { ButtonLink, Eyebrow, H2, Lead, Section } from '@/components/ui';
import { fill } from '@/content/home';
import * as c from '@/content/owner';
import { currentUser } from '@/lib/auth';
import { getOwnerRescheduleBasis, getSlotStates, getTurf } from '@/lib/bookings';
import { OWNER_VISIBLE_DAYS, businessDateKeyOf, formatDateKey, visibleDateKeys } from '@/lib/slots';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Block a slot',
  robots: { index: false, follow: false },
};

/**
 * The picker, run by the turf: 30 days instead of 7, any number of times, no
 * phone number, no price and no payment screen — an owner booking is free and
 * confirmed the moment it is made.
 *
 * `?reschedule=<id>` turns it into "move this booking", with none of the
 * customer's floors: any free time, any size, and nothing charged or refunded
 * whichever way the price would have gone.
 */
export default async function OwnerBookPage({ searchParams }: PageProps<'/owner/book'>) {
  const sp = await searchParams;
  const [turf, user] = await Promise.all([getTurf(), currentUser()]);
  if (!turf || !user) notFound();

  const now = new Date();
  const dateKeys = visibleDateKeys(now, OWNER_VISIBLE_DAYS);
  const days: DayOption[] = dateKeys.map((key, i) => {
    const [weekday, day, month] = formatDateKey(key).split(' ');
    return { key, weekday: i === 0 ? 'Today' : i === 1 ? 'Tmrw' : weekday, day, month };
  });

  const moveId = typeof sp.reschedule === 'string' && /^[a-z0-9]{20,32}$/i.test(sp.reschedule) ? sp.reschedule : null;
  const basis = moveId ? await getOwnerRescheduleBasis(turf, moveId, now) : null;

  // Asked to move something that cannot be moved — say so plainly rather than
  // dropping the owner into a fresh booking they did not ask for.
  if (moveId && !basis) {
    return (
      <Section tone="white" className="pb-20 pt-32 sm:pt-40">
        <Eyebrow>{c.move.eyebrow}</Eyebrow>
        <H2 className="mt-3">{c.move.tooLate}</H2>
        <Lead>Cancel it instead if it needs to come off the board.</Lead>
        <ButtonLink href="/owner" size="lg" className="mt-8 w-full sm:w-auto">
          {c.book.back}
        </ButtonLink>
      </Section>
    );
  }

  // A move opens on the booking's own day with its own times already picked,
  // so the starting point is the booking exactly as it stands.
  const ownDate = basis ? businessDateKeyOf(new Date(basis.startsAt), turf.openHour) : null;
  const date =
    ownDate && dateKeys.includes(ownDate)
      ? ownDate
      : typeof sp.date === 'string' && dateKeys.includes(sp.date)
        ? sp.date
        : dateKeys[0];
  const slots = await getSlotStates(turf, date, now);

  const own = new Set(basis?.slotStarts ?? []);
  const initialSelected = basis ? slots.filter((s) => own.has(s.start)).map((s) => s.index) : [];
  const initialPeople = basis ? basis.numPeople : turf.minPeople;

  const reschedule: RescheduleMode | null = basis
    ? {
        bookingId: basis.bookingId,
        // No floors for the turf: any size, in either direction.
        minPeople: turf.minPeople,
        minSlots: 1,
        creditApplied: 0,
        ownSlotStarts: basis.slotStarts,
      }
    : null;

  return (
    <>
      <Section tone="arena" className="pb-8 pt-28 sm:pb-10 sm:pt-36">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs font-bold uppercase tracking-[0.14em] text-muted">
          <Link href="/owner" className="inline-flex min-h-11 items-center hover:text-ink">
            {c.desk.name}
          </Link>
          <span aria-hidden className="mx-2">
            /
          </span>
          <span className="text-ink">{basis ? c.move.eyebrow : c.book.eyebrow}</span>
        </nav>

        <Eyebrow>{basis ? c.move.eyebrow : c.book.eyebrow}</Eyebrow>
        <h1 className="mt-3 text-[2.4rem] font-black uppercase leading-[0.95] tracking-tight sm:text-6xl">
          {basis ? fill(c.move.title, { name: basis.customerName ?? 'this' }) : c.book.h1}
        </h1>
        {!basis && <Lead>{c.book.lead}</Lead>}
      </Section>

      <Section tone="white" className="py-8 sm:py-12">
        <BookingFlow
          turf={{
            id: turf.id,
            name: turf.name,
            phone: turf.phone,
            pricePerPersonPerSlot: turf.pricePerPersonPerSlot,
            minPeople: turf.minPeople,
            maxPeople: turf.maxPeople,
            openHour: turf.openHour,
            closeHour: turf.closeHour,
          }}
          days={days}
          initialDate={date}
          initialSlots={slots}
          initialSelected={initialSelected}
          initialPeople={initialPeople}
          signedIn
          phone={null}
          reschedule={reschedule}
          asOwner
        />
      </Section>
    </>
  );
}
