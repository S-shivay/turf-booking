// Every word on /my-bookings and in the navbar's account menu.
// `{turf}`, `{phone}`, `{hours}`, `{min}`, `{max}` are replaced at render time.
//
// Note what this copy never says: that a move cannot cost less than the
// original. The picker simply starts at the booking's own size and will not
// go below it, which is the rule expressed as a control rather than a lecture.

export const menu = {
  signIn: 'Log in',
  signInLong: 'Log in with Google',
  signedInAs: 'Signed in as',
  bookings: 'My bookings',
  signOut: 'Log out',
  open: 'Your account',
};

export const page = {
  eyebrow: 'Your account',
  h1: 'My bookings',
  lead: 'Every game you have booked at {turf}, with what you paid and how. Change plans up to {notice} hours before you play.',
  greeting: 'Signed in as {name}',
};

export const empty = {
  title: 'No bookings yet',
  body: 'When you book a slot it shows up here, with your times, your players and your payment reference.',
  cta: 'Book your first slot',
};

export const signedOut = {
  title: 'Log in to see your bookings',
  body: 'Your bookings are tied to your Google account. Log in and they will all be here.',
  cta: 'Log in with Google',
};

/** Column labels on a booking card. Everything the customer paid for, in their words. */
export const labels = {
  when: 'Date',
  times: 'Times',
  duration: 'Session',
  players: 'Players',
  paid: 'Amount paid',
  due: 'Still to pay',
  method: 'Paid by',
  transaction: 'Transaction ID',
  order: 'Order ID',
  booked: 'Booked on',
  reference: 'Booking reference',
  refund: 'Refund',
  cancelledOn: 'Cancelled on',
  /** Shown only when the turf moved a booking and covered the difference. */
  covered: '{paid} paid · {covered} covered by the turf',
  movedTo: 'Moved to a new time',
  movedFrom: 'Moved from an earlier booking',
};

export const status: Record<string, { label: string; note: string }> = {
  CONFIRMED: { label: 'Confirmed', note: 'Your slot is booked. Just turn up and play.' },
  PENDING: { label: 'Awaiting payment', note: 'We are holding these times while your payment goes through.' },
  CANCELLED: { label: 'Cancelled', note: 'This booking is no longer active.' },
  PAST: { label: 'Played', note: 'This game has already happened.' },
};

/** How the money came in, in words rather than gateway codes. */
export const methods: Record<string, string> = {
  upi: 'UPI',
  card: 'Card',
  netbanking: 'Net banking',
  wallet: 'Wallet',
  emi: 'EMI',
  paylater: 'Pay later',
};

export const actions = {
  cancel: 'Cancel booking',
  reschedule: 'Reschedule',
  pay: 'Complete payment',
  view: 'View details',
  cancelling: 'Cancelling…',
  /** Shown instead of the buttons once the window has closed. */
  locked: 'Within {notice} hours of your game — call {phone} and we will help.',
};

export const confirm = {
  title: 'Cancel this booking?',
  bodyRefund: 'Your {amount} goes back to the account you paid from, usually within a few working days. The times go back on the board straight away.',
  bodyNoRefund: 'Nothing was charged for this booking, so there is nothing to refund. The times go back on the board straight away.',
  keep: 'Keep my booking',
  go: 'Yes, cancel it',
};

export const hints = {
  cancelled: 'Booking cancelled. {refund}',
  refundOnWay: 'Your refund is on its way back to the account you paid from.',
  refundNone: 'Nothing was charged, so there is nothing to refund.',
  tooLate: 'This game is too close to its start time to change online. Call {phone} and we will help.',
  generic: 'Something went wrong. Please try again.',
  signedOut: 'Please log in again.',
};

/** The reschedule banner shown at the top of /book when moving a booking. */
export const reschedule = {
  eyebrow: 'Moving a booking',
  title: 'Pick your new time',
  // Phrased as what the booking *is*, not as a limit being imposed.
  body: 'Your booking is {players} players across {times}. Choose when you would like to play instead.',
  keepNote: 'Your current times stay yours until the move is complete.',
  cta: 'Move my booking',
  ctaPay: 'Pay the difference',
  working: 'Moving…',
  cancel: 'Keep my original booking',
  /** Prompt while the selection is still smaller than the booking being moved. */
  needMore: 'Pick {count} times to move this booking.',
  needMoreOne: 'Pick 1 more time to move this booking.',
  sameTimes: 'Those are already your times — pick a different slot.',
  moved: 'Your booking has been moved.',
};

/** Reasons written by the system, translated for the customer. */
export const cancelReasons: Record<string, string> = {
  CUSTOMER_CANCELLED: 'You cancelled this booking.',
  RESCHEDULED: 'You moved this booking to a new time.',
  HOLD_EXPIRED: 'The hold ran out before payment was completed.',
  PAYMENT_FAILED: 'The payment did not go through.',
  PAID_AFTER_EXPIRY: 'Payment arrived after the hold had ended, so it was refunded in full.',
};
