// Every word on /owner and /owner/book. Copy lives here, never in JSX.
// `{turf}`, `{name}`, `{when}`, `{players}`, `{amount}` are filled at render.
//
// House style: say what happened in the words the turf would use at the gate.
// No gateway jargon — an owner should never have to know what "GATEWAY" or
// "capture" means to send someone their money back.

export const desk = {
  /** The name of this page in the navbar, the drawer and its own heading. */
  name: 'Owner desk',
  eyebrow: 'Owner desk',
  h1: 'Every booking',
  lead: 'Everything {turf} has ever taken — who booked, when they play, what they paid. Search it, filter it by date, download it.',
  freeBooking: 'Free booking',
  download: 'Download',
  downloadHint: 'Downloads exactly what this filter shows, as a spreadsheet.',
};

export const stats = {
  entries: 'Bookings',
  players: 'Players',
  collected: 'Collected',
  refunded: 'Refunded',
  income: 'Income',
  incomeHint: 'Money in, minus refunds sent',
  blocked: 'Blocked',
  blockedSub: '{count} booked by the turf, free',
  ofTotal: '{count} in this view',
};

export const filters = {
  searchLabel: 'Search',
  searchPlaceholder: 'Name, phone, email or reference',
  searchHint: 'Press / to jump here',
  clearSearch: 'Clear the search',
  anyDate: 'Any date',
  clearDates: 'Any date',
  dateHint: 'Dates filter by the day they play. Everything is listed newest booking first.',
  quick: {
    today: 'Today',
    week: 'Next 7',
    last7: 'Last 7',
    month: 'This month',
    lastMonth: 'Last month',
    last30: 'Last 30',
  },
  apply: 'Apply',
  clear: 'Clear all',
  loading: 'Fetching…',
  showing: 'Showing',
  perPage: 'Per page',
  presets: [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This week' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'played', label: 'Past' },
    { key: 'cancelled', label: 'Cancelled' },
    { key: 'all', label: 'Everything' },
  ],
  /** Words for the little removable chips that describe the live filter. */
  chip: {
    search: 'Matching “{value}”',
    on: 'On {value}',
    range: '{from} → {to}',
    from: 'From {value}',
    to: 'Until {value}',
    status: {
      upcoming: 'Upcoming only',
      confirmed: 'Confirmed only',
      pending: 'Awaiting payment',
      played: 'Already played',
      cancelled: 'Cancelled only',
    } as Record<string, string>,
    remove: 'Remove this filter',
  },
};

export const table = {
  when: 'When',
  customer: 'Customer',
  players: 'Players',
  amount: 'Amount',
  paid: 'Paid by',
  status: 'Status',
  actions: '',
  booked: 'Booked',
  reference: 'Ref',
  transaction: 'Transaction',
  order: 'Order',
  refund: 'Refund',
  cancelled: 'Cancelled',
  covered: '{paid} paid · {covered} covered by the turf',
  /** What a block the turf made says under its amount — held, not taken. */
  ownerBlock: 'Owner block · not paid',
  free: 'No charge',
  refundFailed: 'Refund failed',
  movedFrom: 'Moved from an earlier booking',
  movedTo: 'Moved to a later booking',
};

export const status: Record<string, { label: string; tone: 'green' | 'amber' | 'rose' | 'grey' }> = {
  CONFIRMED: { label: 'Confirmed', tone: 'green' },
  PENDING: { label: 'Awaiting payment', tone: 'amber' },
  CANCELLED: { label: 'Cancelled', tone: 'rose' },
  PLAYED: { label: 'Played', tone: 'grey' },
};

export const methods: Record<string, string> = {
  upi: 'UPI',
  card: 'Card',
  netbanking: 'Netbanking',
  wallet: 'Wallet',
  emi: 'EMI',
  paylater: 'Pay later',
};

export const cancelReasons: Record<string, string> = {
  CUSTOMER_CANCELLED: 'Cancelled by the customer',
  RESCHEDULED: 'Moved to another time',
  RESCHEDULE_REPLACED: 'Replaced by another attempt',
  HOLD_EXPIRED: 'Payment never completed',
  PAYMENT_FAILED: 'Payment failed',
  PAYMENT_UNAVAILABLE: 'Payment could not be started',
};

export const empty = {
  title: 'Nothing here',
  body: 'No booking matches this filter. Try a wider date range, or clear the filter and start again.',
  cta: 'Clear all filters',
  none: {
    title: 'No bookings yet',
    body: 'The moment someone books a slot, they show up here with their times, their phone number and what they paid.',
    cta: 'Make a free booking',
  },
};

export const actions = {
  move: 'Move',
  cancel: 'Cancel',
  working: 'Working…',
  cancelling: 'Cancelling…',
  details: 'Details',
  hide: 'Hide',
  prev: 'Previous',
  next: 'Next',
  pageOf: 'Page {page} of {pages}',
};

/** The cancel panel. Every word an owner reads before money moves. */
export const cancel = {
  title: 'Cancel this booking',
  /** Real numbers, never a generic "are you sure" — owners tap by accident. */
  confirmRefund: 'Cancel {when}, {players} players, and send {amount} back to {name}?',
  confirmManual: 'Cancel {when}, {players} players? You are sending {amount} to {name} yourself.',
  confirmNone: 'Cancel {when}, {players} players, and keep {amount}?',
  confirmFree: 'Cancel {when}, {players} players? Nothing was charged, so there is nothing to send back.',
  reasonLabel: 'Why is it being cancelled?',
  reasonPlaceholder: 'A line for your own records',
  reasonPresets: ['Rain', 'Ground unusable', 'Customer asked', 'No-show', 'Double booked', 'Turf closed'],
  refundLabel: 'What happens to the money?',
  methods: {
    GATEWAY: { label: 'Back the way they paid', help: 'Sent to {name} through the payment they made. Takes a few working days.' },
    MANUAL: { label: "I'll send it myself", help: 'UPI or cash. Put the UTR or a note below so there is a record.' },
    NONE: { label: 'No refund', help: 'Nothing goes back. Say why — it stays on the booking.' },
  } as Record<string, { label: string; help: string }>,
  noGateway: 'Nothing was paid online for this booking, so there is nothing to send back through the gateway.',
  amountLabel: 'Amount to send back',
  amountHelp: 'Up to {max} — what was actually paid.',
  referenceLabel: 'UTR or reference',
  referencePlaceholder: 'e.g. 402912345678',
  noteLabel: 'Note',
  notePlaceholder: 'Why no refund is being made',
  /** Recorded on a booking that never took any money, so nothing is owed. */
  nothingCharged: 'nothing was charged for this booking',
  needReason: 'Put a reason down first — it stays on the booking.',
  needReference: 'Add the UTR or a reference so the payment can be traced later.',
  needNote: 'Say why no refund is being made.',
  go: 'Cancel booking',
  keep: 'Keep it',
  done: 'Cancelled. {refund}',
  refundSent: 'The refund is on its way back to them.',
  refundManual: 'Remember to send the money yourself.',
  refundNone: 'Nothing was sent back.',
};

export const hints = {
  generic: 'That did not go through. Try again in a moment.',
  signedOut: 'Your session ended. Log in again to carry on.',
  started: 'This game has already started, so it can no longer be cancelled here.',
};

/**
 * The picker, in owner mode. These override the customer's wording wherever
 * it would be wrong for the turf: it sees 30 days, not 7, and nothing is ever
 * held or paid for.
 */
export const book = {
  dayHelp: 'The next 30 days are yours to block.',
  summaryLabel: 'This booking',
  footNote: 'Confirmed the moment you press the button — no hold, no payment.',
  moveFootNote: 'The old times go back on the board as soon as the move lands.',
  eyebrow: 'Owner booking',
  h1: 'Block a slot',
  lead: 'Anything up to 30 days ahead, any length, no payment. Use it for walk-ins, maintenance or a regular team.',
  noCharge: 'No charge',
  noChargeNote: 'Booked by the turf — nothing is collected and no payment screen opens.',
  cta: 'Block it',
  working: 'Booking…',
  back: 'Back to the desk',
};

/** The picker, moving somebody else's booking. */
export const move = {
  eyebrow: 'Moving a booking',
  title: "Moving {name}'s booking",
  body: 'They are on {times}, {players} players. Pick any free time — the size is yours to change and nothing is charged or refunded.',
  keepNote: 'Their booking stays exactly as it is until you confirm the move.',
  cancel: 'Leave it alone',
  cta: 'Move it',
  working: 'Moving…',
  tooLate: 'This booking has already started, so it can no longer be moved.',
};

/**
 * The downloaded workbook. None of this is on screen — it is read in Excel,
 * often printed, and often forwarded to an accountant, so it says the whole
 * thing rather than leaning on the page around it.
 */
export const sheet = {
  tab: 'Bookings',
  title: '{turf}',
  subtitle: 'Bookings export',
  /** The one line under the title that says exactly what this download is. */
  meta: {
    dates: 'Dates',
    filter: 'Filter',
    search: 'Search',
    generated: 'Generated',
    all: 'Everything',
    none: 'None',
    allDates: 'All dates',
    on: '{value}',
    range: '{from} to {to}',
    from: '{value} onwards',
    to: 'Up to {value}',
  },
  /** The six boxes across the top, the same figures the desk shows. */
  kpi: {
    entries: 'Bookings',
    players: 'Players',
    collected: 'Collected',
    refunded: 'Refunded',
    income: 'Income',
    blocked: 'Blocked',
  },
  columns: {
    Date: 'Date',
    Times: 'Times',
    Players: 'Players',
    Customer: 'Customer',
    Phone: 'Phone',
    Email: 'Email',
    Amount: 'Amount',
    Collected: 'Collected',
    Refunded: 'Refunded',
    Method: 'Paid by',
    Status: 'Status',
    Transaction: 'Transaction ID',
    Order: 'Order ID',
    Reference: 'Reference',
    Booked: 'Booked on',
    Cancelled: 'Cancelled on',
    Reason: 'Reason',
    MovedFrom: 'Moved from',
    MovedTo: 'Moved to',
  },
  total: 'TOTAL',
  totalCount: '{count} bookings',
  income: 'INCOME',
  incomeHint: 'Money in, minus refunds sent',
  blocked: 'BLOCKED',
  blockedHint: '{count} booked by the turf, free',
  ownerBlock: 'owner block',
  capped: 'Stopped at {limit} rows — narrow the dates and download again.',
};
