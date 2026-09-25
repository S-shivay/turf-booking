import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { signInWithGoogle } from '@/app/actions/auth';
import { BookingStatus } from '@/components/book/BookingStatus';
import { Button, Section } from '@/components/ui';
import { currentUser } from '@/lib/auth';
import { getBookingStatus, getTurf } from '@/lib/bookings';
import { placeholder } from '@/lib/site';

export const dynamic = 'force-dynamic';

// Personal data — never indexed, never shared.
export const metadata: Metadata = {
  title: 'Your booking',
  robots: { index: false, follow: false },
};

export default async function BookingPage({ params }: PageProps<'/booking/[id]'>) {
  const { id } = await params;
  const [user, turf] = await Promise.all([currentUser(), getTurf()]);

  if (!user) {
    return (
      <Section tone="arena" className="pt-28 sm:pt-36">
        <div className="mx-auto w-full max-w-md rounded-3xl bg-white p-6 text-center inset-ring-1 inset-ring-ink/[0.08] sm:p-8">
          <h1 className="text-2xl font-black uppercase tracking-tight">Sign in to see this booking</h1>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            Bookings are private. Sign in with the same Google account you booked with.
          </p>
          <form action={signInWithGoogle.bind(null, `/booking/${id}`)} className="mt-6">
            <Button type="submit" size="lg" className="w-full">
              Sign in with Google
            </Button>
          </form>
        </div>
      </Section>
    );
  }

  // Unknown ids and other people's bookings are indistinguishable: both 404.
  const booking = await getBookingStatus(id, { id: user.id, isOwner: user.role === 'OWNER' });
  if (!booking) notFound();

  return (
    <Section tone="arena" className="pb-20 pt-28 sm:pt-36">
      <BookingStatus
        initial={booking}
        turf={{
          name: turf?.name ?? placeholder.turf,
          address: turf?.address ?? placeholder.address,
          phone: turf?.phone ?? placeholder.phone,
        }}
      />
    </Section>
  );
}
