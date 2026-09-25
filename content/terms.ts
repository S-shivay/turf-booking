// Every word on /terms. `{turf}`, `{city}`, `{area}`, `{phone}`,
// `{email}`, `{address}`, `{min}`, `{max}`, `{price}`, `{hold}` are replaced at
// render time from the Turf row and lib/site.ts.
//
// These describe what the booking system actually does — a {hold}-minute hold,
// a payment that only the gateway can confirm, a failed payment that returns
// the slot immediately, and cancellation handled by the turf rather than a
// button on the site. Change the rules in the code and change this page in the
// same commit, or customers are agreeing to something that is not true.

import type { LegalSection } from '@/lib/types';

/** Shown as "Last updated" and in the page metadata. */
/** The penalty for smoking, alcohol or tobacco on site, in rupees. */
export const FINE_RUPEES = 2000;

export const updated = '19 September 2026';
export const updatedISO = '2026-09-19';

export const page = {
  eyebrow: 'Terms & conditions',
  h1: 'Terms of use',
  lead: 'The agreement between you and {turf} when you book a slot — what you are paying for, what we owe you, and what we ask of you on the ground.',
  updatedLabel: 'Last updated',
  tocTitle: 'On this page',
};

/** The rules people actually need at the gate, above the long text. */
export const summary = {
  title: 'The short version',
  points: [
    'A booking covers {min} to {max} players for the times you chose, on that date only.',
    'Children under 10 play free and do not count towards your player numbers — bring proof of age.',
    'Non-marking sports shoes only. Metal spikes and studs damage the surface and are not allowed.',
    'No smoking, alcohol, tobacco or pan masala anywhere on the premises — a ₹{fine} fine applies.',
    'Cancel or reschedule at least 24 hours before your time for a full refund. Inside 24 hours, the slot is charged.',
    'Cancel or move a booking yourself from My bookings up to 24 hours before you play. Closer than that, call {phone}.',
  ],
};

export const sections: LegalSection[] = [
  {
    id: 'agreement',
    title: 'Who we are and what you are agreeing to',
    paras: [
      'These terms are the agreement between you and {turf}, the sports turf at {address}. They cover this website and any time you spend on the ground.',
      'By booking a slot — online or over the phone — you accept these terms on behalf of everyone in your group. Please make sure the people you bring know the rules in the "On the ground" and "What is not allowed" sections, because you are the person we will speak to if they are broken.',
      'If you do not accept these terms, please do not book. Nothing here takes away rights you have under Indian consumer law.',
    ],
  },
  {
    id: 'eligibility',
    title: 'Who can book',
    paras: [
      'You must be 18 or older to make a booking and to pay for it. The booking is in your name and you are responsible for it.',
      'Players under 18 are very welcome on the turf, but they must be part of a booking made by an adult, and that adult is responsible for them while they are here. We do not create accounts for under-18s.',
    ],
  },
  {
    id: 'account',
    title: 'Your account',
    paras: [
      'Booking online means signing in with your Google account. We never see your Google password — Google confirms who you are and passes us your name and email address.',
      'You give us a phone number when you book, so the turf can reach you about your own booking. Please keep it correct and current; a wrong number is the usual reason a customer misses a message about their slot.',
      'Keep your Google account secure. Bookings made from your account are treated as yours, so tell us straight away if you think someone else has used it.',
    ],
  },
  {
    id: 'booking',
    title: 'Booking, prices and payment',
    bullets: [
      {
        label: 'What a booking covers',
        text: 'The exact times you selected, on that date, for {min} to {max} players. It is not transferable to another date or time without arranging it with us first.',
      },
      {
        label: 'The price',
        text: '₹{price} per player for each time you book. The total appears on screen before you pay, and that total is what is charged — our server works the amount out itself rather than trusting anything sent from your browser.',
      },
      {
        label: 'The hold',
        text: 'Choosing your times holds them for {hold} minutes while you pay. If the payment is not completed in that window, the hold ends and the times go back on the board for everyone else.',
      },
      {
        label: 'What confirms a booking',
        text: 'Only a payment confirmed by the payment gateway. Until you see the confirmation screen, the slot is not yours — closing the browser mid-payment does not book anything.',
      },
      {
        label: 'A failed payment',
        text: 'If your payment fails, nothing is charged and the times are released immediately for other players. You are welcome to try again, though those times may be gone by then.',
      },
      {
        label: 'Booking without the website',
        text: 'Prefer to arrange it with a person? Call or WhatsApp {phone}, or come to the turf office, and we will book it for you.',
      },
    ],
  },
  {
    id: 'children',
    title: 'Children under 10 play free',
    paras: [
      'Children under the age of 10 are not charged and do not count towards the {min} to {max} players your booking covers. Bring your kids along at no extra cost.',
      'We do ask for proof of age at the gate — an Aadhaar card, passport, birth certificate or school ID showing the child’s date of birth. Without proof we have to count the child as a player at the usual rate, which is simply fairness to everyone paying for their group.',
      'Every child remains the responsibility of the adult who made the booking, and must be supervised on and around the playing area at all times.',
    ],
  },
  {
    id: 'ground-rules',
    title: 'On the ground',
    bullets: [
      {
        label: 'Arrive on time',
        text: 'Your booking starts and ends at the times you chose. Arriving late does not extend it — the group after you booked their time too — and arriving very late may cost you the slot without a refund.',
      },
      {
        label: 'Shoes',
        text: 'Non-marking sports shoes only. Metal spikes and studded boots tear the surface and are strictly not allowed; you will be asked to change them or leave the playing area.',
      },
      {
        label: 'Equipment',
        text: 'Bats, wickets, nets and the goal net are provided free and shared with everyone. Please treat them properly and leave them for the next game.',
      },
      {
        label: 'Damage',
        text: 'You are responsible for damage to the surface, nets, lights, equipment or any part of the premises caused by your group during your booking, beyond ordinary wear from playing. We will work out what the repair or replacement costs and charge that to you, payable at the time, and we may end your session immediately without a refund. Serious or deliberate damage means we may also refuse you future bookings.',
      },
      {
        label: 'Staff instructions',
        text: 'Please follow what the staff on duty ask. They are usually managing safety, the floodlights, or the handover to the next booking.',
      },
      {
        label: 'Your belongings',
        text: 'Keep an eye on your things. The site is covered by cameras, but we cannot take responsibility for personal belongings left unattended.',
      },
    ],
  },
  {
    id: 'not-allowed',
    title: 'What is not allowed',
    paras: ['These apply anywhere on the premises, not only on the playing area:'],
    bullets: [
      {
        text: 'Smoking, alcohol, tobacco, gutkha and pan masala, and spitting anywhere on site. This is a family ground and juniors play here, so we charge a ₹{fine} fine for it.',
      },
      { text: 'Metal spikes and studded footwear on the turf.' },
      { text: 'Anything illegal, or anything that puts another player, a spectator or a member of staff at risk.' },
      { text: 'Abusive, threatening or disruptive behaviour, including towards other groups waiting their turn.' },
      { text: 'Selling, subletting or handing your booking to someone else for money without asking us first.' },
      {
        text: 'Commercial use — coaching for a fee, filming for broadcast, sponsored events — unless you have agreed it with us beforehand.',
      },
      { text: 'Pets on the playing surface.' },
    ],
    after: [
      'Smoking, alcohol, tobacco or pan masala anywhere on the premises carries a ₹{fine} fine, payable on the spot, whoever in your group is responsible for it. Breaking any of these rules can also end your session immediately without a refund, and a further charge may follow for cleaning or repair where there is a mess or damage to put right.',
    ],
  },
  {
    // Keep this id: the footer used to deep-link `/terms#cancellation`, and
    // anyone who bookmarked it still lands on the pointer to the real policy.
    id: 'cancellation',
    title: 'Cancellations and refunds',
    paras: [
      'How much notice we need, how to cancel or move a booking, what happens if we have to call off a game, and how refunds are paid back are all set out in our cancellation policy, which forms part of these terms.',
      'In short: more than 24 hours before your time you can cancel for a full refund, or move the booking to another time, yourself from My bookings. A move carries what you have paid across to the new time and may add to it, never reduce it. Inside 24 hours the slot is charged in full — call or WhatsApp {phone} and a person at the turf will help.',
    ],
  },
  {
    id: 'liability',
    title: 'Playing is at your own risk',
    paras: [
      'Sport carries a risk of injury, and by playing here you accept that risk for yourself and everyone in your group. Please play within your ability, warm up, and stop if you are hurt.',
      'We maintain the surface, the lights and the equipment properly and take safety seriously. Except where the law does not allow us to limit it — and nothing here limits liability for death or personal injury caused by our own negligence — our responsibility to you is capped at the amount you paid for the booking in question.',
    ],
  },
  {
    id: 'suspension',
    title: 'Refusing or ending a booking',
    paras: [
      'We may refuse entry, end a session, or close an account where someone breaks these terms, behaves unsafely, damages the ground, or does something unlawful. In those cases the booking is not refunded.',
      'We may also cancel bookings that look abusive — for instance an account holding slots it has no intention of paying for and blocking real players from booking.',
    ],
  },
  {
    id: 'changes',
    title: 'Changes to these terms',
    paras: [
      'We may update these terms as the turf changes. The current version is always on this page with the date it last changed at the top, and a booking is governed by the terms in force when you made it.',
    ],
  },
  {
    id: 'privacy',
    title: 'Your information',
    paras: [
      'What we collect when you book, who processes it and how to have it deleted is set out in our privacy policy, which forms part of these terms.',
    ],
  },
  {
    id: 'law',
    title: 'Governing law',
    paras: [
      'These terms are governed by the laws of India, and the courts at {city} have exclusive jurisdiction over any dispute arising from them or from your use of the turf.',
      'If any part of these terms turns out to be unenforceable, the rest of them continue to apply.',
    ],
  },
  {
    id: 'contact',
    title: 'Talk to us',
    paras: [
      'A question about these terms, a booking, or a complaint — a person at the turf will answer. Email is best for anything you want a record of.',
    ],
  },
];

export const contact = {
  title: 'Questions about any of this?',
  body: 'Bookings, cancellations, large groups or a complaint — call, message or email us and someone at {turf} will get back to you.',
  emailLabel: 'Email',
  phoneLabel: 'Phone & WhatsApp',
  addressLabel: 'Address',
  operatorLabel: 'Operated by',
  cta: 'Contact us',
  book: 'Book a slot',
  privacy: 'Read our privacy policy',
  cancellation: 'Read our cancellation policy',
};

export const seo = [
  'These terms and conditions cover booking a cricket, football or badminton slot at {turf}, a sports turf in {area}, {city} — prices, the booking process, ground rules, the 24-hour cancellation and refund policy, and free entry for children under 10.',
];
