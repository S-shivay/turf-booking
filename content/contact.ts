// Every word on /contact. `{turf}`, `{city}`, `{area}`, `{min}`, `{max}`,
// `{hours}` are replaced at render time. Edit copy here, not in JSX.

export const page = {
  eyebrow: 'Contact us',
  h1: 'Contact {turf}',
  lead: 'Questions about the ground, a booking you have already made, or a big group booking? Call or message us — someone at the turf picks up.',
};

export const actions = {
  call: 'Call the turf',
  whatsapp: 'WhatsApp us',
  note: 'Fastest on WhatsApp during game hours, when the ground is busy.',
};

export const details = {
  title: 'Where to find us',
  rows: {
    phone: 'Phone',
    email: 'Email',
    address: 'Address',
    hours: 'Open',
    owner: 'Ask for',
  },
  hoursValue: '{hours}, every day',
  directions: 'Open in Google Maps',
};

export const topics = {
  title: 'What people usually ask',
  items: [
    {
      title: 'A booking you already made',
      text: 'Have your booking reference ready — the six characters on your confirmation screen. It lets us find your slot straight away.',
    },
    {
      title: 'Large groups and tournaments',
      text: 'One booking covers {min} to {max} players. For a full day, a league or back-to-back times for several teams, call us and we will plan it with you.',
    },
    {
      title: 'A refund or a payment that looks wrong',
      text: 'Call with your booking reference. Refunds go back to the account you paid from and usually land within 5–7 working days.',
    },
    {
      title: 'Lost something at the turf',
      text: 'The site is under camera surveillance and anything found is kept at the counter. Call the same day if you can.',
    },
  ],
};

export const seo = [
  '{turf} is in {area}, {city}, open {hours} every day for cricket, football and badminton. Call or WhatsApp for directions, group bookings and anything about a booking you have already made.',
  'Looking to play rather than talk? Online turf booking takes under a minute — check live availability for the next week, choose your time and pay securely for instant confirmation.',
];

export const cta = {
  title: 'Or just book and show up.',
  text: 'Most questions answer themselves on the booking page: what is free, what it costs, and when you can play.',
  primary: 'Check slot availability',
};
