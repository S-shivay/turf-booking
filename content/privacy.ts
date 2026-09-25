// Every word on /privacy. `{turf}`, `{city}`, `{area}`, `{email}`, `{phone}`,
// `{address}` are replaced at render time from the Turf row and lib/site.ts.
//
// This describes what the application actually does — Google sign-in, a phone
// number on the booking form, Razorpay for payment, Resend for confirmation
// email, and no analytics or advertising of any kind. If the data the app
// handles changes, change this page in the same commit.

import type { LegalSection } from '@/lib/types';

/** Shown as "Last updated" and in the page metadata. */
export const updated = '19 September 2026';

export const page = {
  eyebrow: 'Privacy policy',
  h1: 'Your privacy at {turf}',
  lead: 'What we collect when you book a slot, why we need it, who else sees it, and how to get it removed. In plain language, because a policy nobody can read protects nobody.',
  updatedLabel: 'Last updated',
  tocTitle: 'On this page',
};

/** The short version, in a highlighted card above the detail. */
export const summary = {
  title: 'The short version',
  points: [
    'We ask for your name, email, phone number and the times you want to play. That is all a booking needs.',
    'We never see your card or UPI details. Razorpay handles payment and only tells us that it succeeded.',
    'We do not sell or rent your information, and we run no advertising or analytics trackers on this site.',
    'We only email you about your own bookings — never marketing.',
    'Want your data removed? Email {email} and we will do it.',
  ],
};

export const sections: LegalSection[] = [
  {
    id: 'who-we-are',
    title: 'Who this policy covers',
    paras: [
      'This policy applies to {turf}, the sports turf at {address}, and to this website, where you can check availability and book cricket, football and badminton slots online.',
      'It covers the information we hold about you as a customer. If you only browse the site without signing in, we hold nothing about you beyond the ordinary server records described below.',
      'By booking a slot you accept this policy. If you disagree with any part of it, please book over the phone instead — call us on {phone} and we will take your booking without creating an account.',
    ],
  },
  {
    id: 'what-we-collect',
    title: 'What we collect',
    paras: ['We collect the least we can get away with and still run a booking. Specifically:'],
    bullets: [
      {
        label: 'Your account',
        text: 'You sign in with Google. Google passes us your name, email address and profile picture, and nothing else — we never see or receive your Google password.',
      },
      {
        label: 'Your phone number',
        text: 'Asked once on the booking form, so the turf can reach you if something changes about your slot. It is saved to your account so you do not have to type it again.',
      },
      {
        label: 'Your bookings',
        text: 'The date and times you booked, how many players, the amount, and whether the booking was confirmed, expired or cancelled. Refund details are recorded here too when one applies.',
      },
      {
        label: 'Payment references',
        text: 'The order and payment reference numbers Razorpay gives us, the amount, and the method you used as a single word — "upi", "card", "netbanking" or "wallet". We do not receive and cannot store your card number, CVV, UPI PIN or bank login.',
      },
      {
        label: 'Ordinary server records',
        text: 'Like every website, our hosting provider records requests as they arrive, which includes IP addresses, for security and fault-finding. We do not store IP addresses in our own database or tie them to your account.',
      },
    ],
    after: [
      'We do not ask for your date of birth, your address, your ID, or anything else a turf booking does not need.',
    ],
  },
  {
    id: 'why',
    title: 'Why we need it',
    bullets: [
      {
        label: 'To hold and confirm your slot',
        text: 'Your booking cannot exist without a name, a time and an amount.',
      },
      {
        label: 'To take payment',
        text: 'Passed to Razorpay so the transaction can be completed and, if needed, refunded.',
      },
      {
        label: 'To contact you about your booking',
        text: 'A confirmation on screen, and a call or message from the turf if a slot is affected.',
      },
      {
        label: 'To stop abuse',
        text: 'We limit how many holds one account can place at a time, so nobody can lock up the board and stop real players from booking.',
      },
      {
        label: 'To keep our books',
        text: 'Payments and refunds are financial records, and Indian tax law requires us to keep them.',
      },
    ],
    after: [
      'That is the full list. We do not build a profile of you, score you, or use your information to decide anything about you automatically.',
    ],
  },
  {
    id: 'what-we-dont',
    title: 'What we do not do',
    bullets: [
      { text: 'We do not sell, rent or trade your personal information to anyone, for any price.' },
      {
        text: 'We do not run advertising, and we carry no advertising or analytics trackers — no Google Analytics, no Meta pixel, no third-party tags of any kind.',
      },
      { text: 'We do not send marketing or promotional email. Every email we send is about a booking you made.' },
      {
        text: 'We do not store card numbers, UPI IDs, CVVs or bank credentials, because they never reach our servers.',
      },
    ],
  },
  {
    id: 'payments',
    title: 'Payments',
    paras: [
      'Payments are handled by Razorpay, an RBI-authorised payment aggregator. When you pay, Razorpay collects your payment details directly on its own secure checkout — those details do not pass through this website.',
      'Razorpay tells our server whether the payment succeeded and gives us a reference number. That is the only thing that confirms a booking: we never take the browser’s word for it. If a payment fails, the slot goes straight back on the board and nothing is charged.',
      'Razorpay processes your payment information under its own privacy policy, which you should read at razorpay.com if payment data matters to you.',
    ],
  },
  {
    id: 'cookies',
    title: 'Cookies',
    paras: [
      'This site sets one cookie, and only after you sign in: a session cookie that keeps you signed in for up to 30 days so you are not asked to log in on every visit. It carries no advertising identifier and follows you nowhere else.',
      'There are no analytics, advertising or tracking cookies on this site — so there is no cookie banner, because there is nothing to consent to.',
      'The map on our contact page is embedded from Google Maps. Loading it means your browser contacts Google, which may set its own cookies and can see your IP address. That part is governed by Google’s privacy policy, not ours.',
      'You can block or delete cookies in your browser settings. Blocking our session cookie means you will not be able to stay signed in, and so will not be able to book online.',
    ],
  },
  {
    id: 'security',
    title: 'How we protect it',
    bullets: [
      {
        text: 'The whole site is served over an encrypted connection, and our database is encrypted and reachable only by our servers.',
      },
      {
        text: 'Payment confirmations are accepted only when they carry a valid cryptographic signature from Razorpay, or when our own server asks Razorpay directly. A message from a browser can never confirm a booking.',
      },
      {
        text: 'Only the turf owner’s own email addresses get owner access, and that permission is checked against the database on every single request rather than trusted from your browser.',
      },
      {
        text: 'Our availability grid shows only which times are free or taken. It never carries names, phone numbers or booking references, so nobody can learn who is playing when.',
      },
    ],
    after: [
      'No system is perfectly secure, and we will not pretend otherwise. If a breach ever affects your information, we will tell you and the authorities as the law requires.',
    ],
  },
  {
    id: 'retention',
    title: 'How long we keep it',
    bullets: [
      {
        label: 'Booking and payment records',
        text: 'Kept for as long as Indian tax and accounting rules require us to hold financial records — several years after the transaction.',
      },
      {
        label: 'Your account',
        text: 'Kept while you use it. Ask us to delete it and we will, apart from the financial records above.',
      },
      {
        label: 'Expired holds',
        text: 'A slot you started booking but did not pay for is released automatically within minutes and carries no personal information once released.',
      },
    ],
  },
  {
    id: 'your-rights',
    title: 'Your rights',
    paras: ['Under India’s Digital Personal Data Protection Act, 2023, and as a matter of plain fairness, you can:'],
    bullets: [
      { label: 'See what we hold', text: 'Ask for a copy of your information and what we have done with it.' },
      { label: 'Correct it', text: 'Tell us if a name, phone number or email is wrong and we will fix it.' },
      {
        label: 'Have it deleted',
        text: 'Ask us to erase your account and personal details. We must keep financial records of completed payments, but everything else goes.',
      },
      { label: 'Withdraw consent', text: 'Stop using the site at any time and ask us to close your account.' },
      {
        label: 'Complain',
        text: 'Raise a grievance with us using the details below, and escalate to the Data Protection Board of India if we do not resolve it.',
      },
    ],
    after: [
      'Email {email} from the address you booked with and we will act on any of these within 30 days. We may ask a question or two first, to be sure we are talking to the right person — handing someone else’s booking history to the wrong person would be its own privacy failure.',
    ],
  },
  {
    id: 'children',
    title: 'Children',
    paras: [
      'Online booking is for adults. Children are very welcome on the turf, but the booking and the payment must be made by a parent or guardian, and we do not knowingly create accounts for anyone under 18. If you believe a child has created an account, tell us and we will remove it.',
    ],
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    paras: [
      'We will update this page when the way we handle your information changes, and the date at the top will always tell you when it last changed. Material changes will be announced on the site before they take effect.',
    ],
  },
];

export const contact = {
  title: 'Questions, or want your data removed?',
  body: 'Write to us and a person at the turf will answer. For anything about your personal information — access, correction, deletion or a complaint — email is best, so there is a record.',
  emailLabel: 'Email',
  phoneLabel: 'Phone',
  addressLabel: 'Address',
  cta: 'Contact us',
  book: 'Book a slot',
};

export const seo = [
  'This privacy policy explains how {turf}, a sports turf in {area}, {city}, handles the personal information of people who book cricket, football and badminton slots online — what we collect, why, who processes it, and how to have it deleted.',
];
