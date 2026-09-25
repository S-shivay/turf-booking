// Every word on /about. `{turf}`, `{city}`, `{area}`, `{min}`, `{max}`,
// `{price}`, `{hours}` are replaced at render time from the Turf row and
// lib/site.ts. Edit copy here, not in JSX.

export const page = {
  eyebrow: 'About us',
  h1: 'About {turf}',
  lead: 'A sports turf in {area}, {city} for cricket, football and badminton — built so that getting a game together is the easy part of your week.',
};

export const story = {
  title: 'Why this ground exists',
  paragraphs: [
    'Every group has the same evening: someone suggests a game, ten messages later nobody knows which ground is free, and the plan quietly dies. {turf} started from that frustration — one well-kept surface, honest timings and a booking you can finish on your phone before the conversation moves on.',
    'The ground is set up for three sports and takes them equally seriously. Cricket gets a true surface and proper wickets. Football gets a full goal net and room to run. Badminton gets a net and enough height overhead to actually smash. Nothing is an afterthought bolted on to fill a gap in the schedule.',
    'Around the playing area, the things that decide whether an evening is good or merely fine: floodlights that let you play long after work, a mini café for the break, seating for whoever is waiting their turn, parking at the gate and cameras covering the site. Come to practise with intent or just to knock a ball around — the turf is ready either way.',
  ],
};

export const ground = {
  title: 'The ground, in plain numbers',
  text: 'No surprises on arrival. This is exactly what you are booking.',
  rows: [
    { label: 'Sports', value: 'Cricket, football and badminton' },
    { label: 'Players per booking', value: '{min} to {max}' },
    { label: 'Price', value: '₹{price} per player' },
    { label: 'Open', value: '{hours}, every day' },
    { label: 'Lighting', value: 'Full floodlights for night games' },
    { label: 'Equipment', value: 'Bats, wickets, nets and goal net included' },
    { label: 'On site', value: 'Mini café, seating, bathrooms, parking' },
    { label: 'Security', value: 'Full camera surveillance' },
    { label: 'Where', value: '{area}, {city}' },
  ],
};

export const gallery = {
  eyebrow: 'The ground',
  title: 'See it before you book it.',
  text: 'Photos from the turf — the pitch, the lights, the seating. Updated as the ground goes live.',
  slots: [
    'Main pitch',
    'Under the floodlights',
    'Football goal & net',
    'Badminton court',
    'Seating & café',
    'Parking & entrance',
  ],
};

export const rules = {
  title: 'House rules',
  text: 'Short, and all of them exist so the next group gets the ground in the same condition you did.',
  items: [
    {
      title: 'Non-marking shoes only',
      text: 'Studs and street shoes tear the surface. Non-marking sports shoes keep it playable for everyone.',
    },
    {
      title: 'Your time is your time',
      text: 'Arrive a few minutes early so your game starts on the clock. The group after you booked their time too.',
    },
    {
      title: 'Between {min} and {max} players',
      text: 'One booking covers a group of {min} to {max}. Bigger plans are welcome — book the next time as well.',
    },
    {
      title: 'Equipment stays on the ground',
      text: 'Bats, wickets and nets are shared and free to use. Please leave them for the next game.',
    },
    {
      title: 'No smoking or alcohol',
      text: 'The turf is a family space and often has juniors playing. Keep it that way.',
    },
    {
      title: 'Look after each other',
      text: 'Play hard, play fair. Anything that puts another player at risk ends the session.',
    },
  ],
};

export const seo = [
  '{turf} is a sports turf in {area}, {city} for players who would rather be playing than planning. Whether you are looking for a cricket turf for a box cricket match, a football turf for a fast five-a-side or a badminton court for a few evening rallies, the same ground and the same online turf booking cover all three.',
  'Every booking is for {min} to {max} players at ₹{price} per player, so a quick hit after work and a full weekend session are equally easy to arrange. Check live availability, pick your time, pay securely and get an instant confirmation — from your phone, in under a minute.',
];

export const cta = {
  title: 'Seen enough? Get on the turf.',
  text: 'Check what is free over the next week and lock in your time.',
  primary: 'Check slot availability',
  secondary: 'Talk to us first',
};
