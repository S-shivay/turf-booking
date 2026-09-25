// Every word on /cancellation. `{turf}`, `{city}`, `{area}`, `{phone}`,
// `{email}`, `{address}`, `{notice}`, `{hold}` are replaced at render time from
// the Turf row and lib/site.ts.
//
// This page is the cancellation policy that /terms incorporates by reference,
// so it is part of the contract, not marketing. It describes what the booking
// system actually does — a {hold}-minute hold that expires on its own, a failed
// payment that returns the slot immediately, and cancellation handled by a
// person at the turf rather than a button on the site. Change those rules in
// the code and change this page in the same commit.

import type { LegalSection } from '@/lib/types';

/** Hours of notice needed for a free cancellation or reschedule. */
export const NOTICE_HOURS = 24;

/** Shown as "Last updated" and in the page metadata. */
export const updated = '19 September 2026';
export const updatedISO = '2026-09-19';

export const page = {
  eyebrow: 'Cancellation policy',
  h1: 'Cancellations & refunds',
  lead: 'Plans change. Here is exactly how much notice we need, how to tell us, and when your money comes back — whether you call off a game or we have to.',
  updatedLabel: 'Last updated',
  tocTitle: 'On this page',
};

/** The rules people actually need, above the long text. */
export const summary = {
  title: 'The short version',
  points: [
    'More than {notice} hours before your time: cancel for a full refund, or move to another slot free of charge.',
    'Within {notice} hours of your time: the slot is charged in full and cannot be moved.',
    'Nobody turns up: the booking counts as used and is not refunded.',
    'Cancel or move a booking yourself from My bookings. Closer than {notice} hours, call {phone} and we will help.',
    'Refunds go back to the account you paid from, usually within a few working days.',
    'If we call off a game — weather, lights, an emergency — you get a full refund or another time, your choice.',
  ],
};

export const sections: LegalSection[] = [
  {
    id: 'notice',
    title: 'How much notice we need',
    paras: [
      'A slot you cancel early can go to another group. A slot you cancel an hour before it starts almost never does, which is the whole reason the cut-off exists.',
    ],
    bullets: [
      {
        label: 'More than {notice} hours before your time',
        text: 'Cancel for a full refund of what you paid, or move your booking to another time free of charge, subject to what is available.',
      },
      {
        label: 'Within {notice} hours of your time',
        text: 'The slot is charged in full and cannot be moved. At that point it is too late for us to offer the time to anyone else.',
      },
      {
        label: 'Not turning up',
        text: 'A booking nobody arrives for is treated as used, and is not refunded. If you are running late, call us — the slot still ends when it was booked to end, but we would rather know.',
      },
      {
        label: 'Arriving very late',
        text: 'If most of your booking has already passed and we have not heard from you, we may release the ground to whoever is waiting. Nothing is refunded in that case.',
      },
    ],
    after: [
      'The {notice} hours are counted back from the start of the first slot in your booking, using the time shown on your confirmation.',
    ],
  },
  {
    id: 'how',
    title: 'How to cancel or reschedule',
    paras: [
      'More than {notice} hours before your game you can do both yourself, in a few taps. Closer than that a person at the turf takes over, because by then the slot can no longer be offered to anyone else and the decision is ours to make rather than a button to press.',
    ],
    bullets: [
      {
        label: 'Do it yourself, online',
        text: 'Log in, open My bookings, and every game far enough ahead carries a Cancel and a Reschedule button. Cancelling starts your refund immediately and puts the times straight back on the board.',
      },
      {
        label: 'Call or WhatsApp us',
        text: 'On {phone}. Use this when your game is close, or when anything about a booking does not look right.',
      },
      {
        label: 'Have your reference ready',
        text: 'The six characters shown on your confirmation screen and on the booking in My bookings. The name and phone number on the booking work too if you cannot find it.',
      },
      {
        label: 'Email for anything less urgent',
        text: 'Write to {email}. Please do not rely on email inside the {notice}-hour window — it is the time your message reaches us that counts, not the time you sent it.',
      },
    ],
  },
  {
    id: 'reschedule',
    title: 'Moving your booking instead',
    paras: [
      'If you would rather play another day than get your money back, move the booking rather than cancelling it. With more than {notice} hours notice you can do it yourself from My bookings, to any time that is still free.',
      'A move carries everything you have already paid straight over to the new time. Add players or add times and you pay the difference at the new time; there is nothing more to pay if the booking stays the same size. A move cannot make a booking smaller than the one it replaces, so a move never produces a refund — if you want a smaller booking, cancel this one for a full refund and book the size you want.',
      'Your original times stay yours until the new ones are confirmed. If you change your mind halfway through a move, or a payment never completes, the booking you started with is exactly as it was.',
    ],
  },
  {
    id: 'refunds',
    title: 'How refunds come back',
    bullets: [
      {
        label: 'The same way you paid',
        text: 'A refund is sent back through the payment gateway to the card, UPI ID or account the payment came from. We cannot redirect it somewhere else.',
      },
      {
        label: 'How long it takes',
        text: 'A cancellation you make yourself starts the refund the moment you confirm it. The money usually lands within a few working days, depending on your bank — that last part is out of our hands.',
      },
      {
        label: 'How much',
        text: 'The full amount you paid, unless the {notice}-hour rule means the slot is charged. We do not take a handling fee out of a refund we owe you.',
      },
      {
        label: 'If the gateway cannot send it',
        text: 'Occasionally a refund cannot go back the original way — a closed card, for instance. We will contact you, arrange a direct transfer, and give you the reference for it.',
      },
      {
        label: 'Free bookings',
        text: 'A slot the turf booked for you without a payment has nothing to refund. Just tell us if you cannot make it, so the ground is not left standing empty.',
      },
    ],
  },
  {
    id: 'unpaid',
    title: 'Slots you did not finish paying for',
    paras: [
      'Choosing your times holds them for {hold} minutes while you pay. Nothing is charged during the hold and nothing needs cancelling — if the payment is not completed in that window, the hold ends on its own and the times go back on the board.',
      'If a payment fails, the times are released immediately and you are not charged. You are welcome to try again, though those times may be gone by then.',
      'If money did leave your account for a booking that had already expired, we do not keep it. The payment is refunded automatically and we email you to say so.',
    ],
  },
  {
    id: 'our-cancellation',
    title: 'If we have to call off a game',
    paras: [
      'Occasionally we have to cancel a booking ourselves — unsafe weather, a floodlight or surface failure, or an emergency on site.',
      'When that happens you get your money back in full, or another time of your choosing, whichever you prefer. The {notice}-hour rule is ours to keep, not yours to lose: a full refund is yours however short the notice was.',
      'We will contact you on the number attached to your booking as early as we can. Beyond refunding what you paid, we are not able to cover other costs of a game that could not go ahead.',
    ],
  },
  {
    id: 'ended-sessions',
    title: 'Sessions we end early',
    paras: [
      'Breaking the ground rules can end your session on the spot — unsafe play, abuse towards another group or our staff, smoking, alcohol, tobacco or pan masala on the premises, or damage to the turf. A session ended that way is not refunded, and any fine or repair cost is payable at the time.',
      'Those rules, and what they cost, are set out in our terms of use.',
    ],
  },
  {
    id: 'contact',
    title: 'Talk to us',
    paras: [
      'If something about a cancellation or a refund does not look right, tell us. A person at the turf will look at your booking and answer you. Email is best for anything you want a record of.',
    ],
  },
];

export const contact = {
  title: 'Need to cancel or move a booking?',
  body: 'Call or message us with your booking reference and someone at {turf} will sort it out, including any refund due.',
  emailLabel: 'Email',
  phoneLabel: 'Phone & WhatsApp',
  addressLabel: 'Address',
  cta: 'Contact us',
  book: 'Book a slot',
  terms: 'Read our terms & conditions',
};

export const seo = [
  'This cancellation policy covers cricket, football and badminton bookings at {turf}, a sports turf in {area}, {city} — how much notice a free cancellation needs, how to reschedule a slot, when a booking is charged in full, and how refunds are paid back.',
];
