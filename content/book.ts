// Every word on /book. Edit copy here, never in the JSX.
// `{turf} {city} {area} {min} {max} {price} {hold}` are filled by `fill()`
// from content/home.ts. House rule: never mention how long a slot is.

export const page = {
  eyebrow: 'Live availability',
  h1: 'Book your turf slot',
  sub: 'Pick a day, tap the times you want, tell us how many are playing and pay online. Your slots are confirmed the moment the payment goes through.',
  chips: ['Instant online confirmation', 'UPI, card, netbanking', '{min}–{max} players per booking'],
  seoLine:
    'Book cricket turf, box cricket, football turf and badminton court slots online at {turf} in {area}, {city} — live availability, no phone calls, no waiting.',
};

export const picker = {
  dayLabel: 'Choose a day',
  dayHelp: 'Bookings open for the next 7 days.',
  timeLabel: 'Choose your times',
  timeHelp: 'Tap a green time to add it. Tap again to remove it.',
  legend: [
    { key: 'free', label: 'Free' },
    { key: 'selected', label: 'Selected' },
    { key: 'held', label: 'Being booked' },
    { key: 'booked', label: 'Booked' },
    { key: 'past', label: 'Gone' },
  ],
  periods: [
    { label: 'Morning', from: 6, to: 12 },
    { label: 'Afternoon', from: 12, to: 17 },
    { label: 'Evening', from: 17, to: 21 },
    { label: 'Night', from: 21, to: 25 },
  ],
  empty: 'No times left on this day. Try tomorrow.',
  peopleLabel: 'How many players?',
  peopleHelp: 'Minimum {min}, maximum {max} per booking.',
  phoneLabel: 'Mobile number',
  phoneHelp: 'So we can reach you about this booking. We never share it.',
  summaryLabel: 'Your booking',
  nothingPicked: 'Pick at least one time to see the price.',
  holdNote: 'Once you continue, your times are held for {hold} minutes while you pay.',
  payCta: 'Proceed to pay',
  signInCta: 'Sign in with Google to continue',
  signInNote: 'We keep your selection — you come straight back here.',
  working: 'Opening payment…',
};

export const hints = {
  held: '{times} is being booked by someone else right now. It frees up in a few minutes if they do not pay.',
  booked: '{times} is already booked. Try another time or another day.',
  past: 'That time has already passed today.',
  maxSlots: 'You can book up to {max} times in one go. Call us for a longer session.',
  taken: '{times} was just booked by someone else, so we removed it. The rest of your selection is still yours.',
  allTaken: '{times} was just booked by someone else. Please pick another time.',
  removed: 'Removed {times} — it is no longer free.',
  phone: 'Please enter a valid 10-digit mobile number.',
  none: 'Pick at least one time first.',
  signedOut: 'Please sign in again to finish this booking.',
  tooManyHolds:
    'You already have bookings waiting for payment. Finish paying for those first, or wait a few minutes for them to free up.',
  rateLimited: 'That was a lot of tries in a row. Please wait a minute and try again.',
  paymentDown: 'Payments are not responding right now. Please try again in a moment, or call us at {phone}.',
  generic: 'Something went wrong on our side. Please try again.',
};

/** The post-checkout screen. One entry per thing that can have happened. */
export const status = {
  ref: 'Booking {ref}',
  confirmed: {
    title: "You're on the turf",
    body: 'Payment received. Show this screen at the gate — we have your booking on our side too.',
  },
  waiting: {
    title: 'Waiting for your payment',
    body: 'Your times are held for you. If the payment is already done, this page updates by itself in a few seconds.',
    held: 'Held for {clock}',
    checking: 'Checking your payment…',
    pay: 'Pay now',
    paying: 'Opening payment…',
  },
  failed: {
    title: 'Payment failed',
    body: 'Your payment did not go through, so nothing was charged and we put those times back on the board for everyone else. Pick your times again — it only takes a minute.',
    cta: 'Pick your times again',
  },
  expired: {
    title: 'This hold has ended',
    body: 'The payment was not completed in time, so the times went back on the board. If money did leave your account it is refunded automatically — call us if you do not see it.',
    cta: 'Pick new times',
  },
  cancelled: {
    title: 'Booking cancelled',
    cta: 'Pick new times',
  },
  rows: { when: 'When', players: 'Players', amount: 'Amount', where: 'Where' },
  again: 'Book another slot',
  call: 'Call the turf',
  paymentDown: 'Payments are not responding right now. Please try again, or call us at {phone}.',
};

/**
 * The one line under the burst animation that plays when a booking settles.
 * Everything else is on the page behind it — this names what happened while
 * the animation does the talking, then both get out of the way.
 */
export const announce = {
  confirmed: "You're on the turf!",
  waiting: 'Waiting for your payment',
  failed: 'Payment failed',
  expired: 'That hold has ended',
  cancelled: 'Booking cancelled',
};

export const steps = [
  { n: '01', title: 'Pick day and time', body: 'Live availability for the next 7 days. Green means free.' },
  { n: '02', title: 'Add your players', body: '{min} to {max} players per booking. The price updates as you go.' },
  { n: '03', title: 'Pay and play', body: 'Pay by UPI, card or netbanking. Show the confirmation at the gate.' },
];

export const facts = [
  { label: 'Open every day', value: '6:00 AM – 1:00 AM' },
  { label: 'Price', value: '₹{price} per player, per slot' },
  { label: 'Players per booking', value: '{min} – {max}' },
  { label: 'Payment', value: 'UPI · Card · Netbanking' },
];

export const faq = [
  {
    q: 'How do I book a cricket turf slot online?',
    a: 'Choose a day, tap the times you want on the grid above, set the number of players and pay online. You get a confirmation as soon as the payment succeeds — no phone call needed.',
  },
  {
    q: 'How far ahead can I book?',
    a: 'Bookings are open for the next 7 days. For a tournament, a league night or a longer block, call the turf and we will set it up for you.',
  },
  {
    q: 'What happens if I do not pay in time?',
    a: 'Your times are held for {hold} minutes while you pay. If the payment is not completed in that window the times go back on the board for everyone else.',
  },
  {
    q: 'Can I book more than one time in a row?',
    a: 'Yes. Tap as many free times as you need — they can be back to back or spread across the day. The total updates as you pick.',
  },
  {
    q: 'How many players can play?',
    a: 'Between {min} and {max} players per booking. The price is per player, so you only pay for who turns up to play.',
  },
  {
    q: 'Can I cancel or reschedule?',
    a: 'Yes. Log in and open My bookings: more than 24 hours before your game you can cancel it for a full refund, or move it to another time. Closer than that, call or WhatsApp us and we will help. The full rules are in our Cancellation Policy.',
  },
];

export const seo = [
  'Looking to play cricket tonight? {turf} makes turf booking in {area}, {city} simple: check live availability, pick your time and pay online in under a minute. The board above is updated in real time, so what you see free is genuinely free.',
  'The same grid books box cricket, football and badminton. Whether it is a friendly match, weekend box cricket with the office team, practice under lights or a full evening on the ground, you can reserve it here without a single phone call.',
];
