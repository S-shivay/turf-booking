// Every word on the homepage. `{turf}`, `{city}`, `{area}` are replaced at
// render time from the Turf row and lib/site.ts. Edit copy here, not in JSX.

/**
 * Site navigation — real routes only, never `#hash` anchors. A hash is not a
 * destination: from any page but the homepage it goes nowhere, and on the
 * homepage it dirties the URL without taking anyone anywhere they asked to be.
 * Used by the navbar, the mobile drawer and the footer's Explore list, so all
 * three stay in step.
 */
export const nav = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About Us' },
  { href: '/contact', label: 'Contact Us' },
] as const;

export const legal = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms & Conditions' },
  { href: '/cancellation', label: 'Cancellation Policy' },
] as const;

export const hero = {
  eyebrow: 'Cricket • Football • Badminton',
  h1a: 'Play more.',
  h1b: 'Book smarter.',
  sub: 'Your next game is just a few taps away. Discover a premium space for cricket, football and badminton, choose your perfect time and get ready to play.',
  seo: '{turf} is a modern sports turf in {area}, {city} designed for players, friends, teams and sports lovers looking for a convenient place to play, practice and compete.',
  cta: 'Book your slot',
  secondary: 'Explore the experience',
  micro: 'Cricket • Football • Badminton • {min}–{max} players per booking',
  trust: [
    { title: 'Easy booking', text: 'Pick a time, pay, play.' },
    { title: 'Multiple sports', text: 'One turf, three games, {min}–{max} players.' },
    { title: 'Player-friendly', text: 'Gear, café, parking, seating.' },
  ],
};

export const quick = {
  title: "What's your game?",
  items: [
    { id: 'cricket', title: 'Cricket', text: 'Box cricket, practice sessions & team games' },
    { id: 'football', title: 'Football', text: 'Fast-paced games with your squad' },
    { id: 'badminton', title: 'Badminton', text: 'Rallies, matches & casual play' },
  ],
};

export const intro = {
  title: 'A place built around the game.',
  paragraphs: [
    'Some evenings need more than a screen. {turf} is where a group chat turns into a real match — a place to meet your friends, pick teams on the spot and play the kind of game you talk about for the rest of the week.',
    'Come to practise with intent or just to knock a ball around. Run a competitive fixture between two offices, or a casual Sunday session where nobody keeps score. The turf is ready either way, with the lights on, the surface fresh and the kit waiting.',
    'Everything that usually gets in the way of a good game — finding a ground, calling around, hoping it is free — is handled in a few taps. You choose the time. We make sure the rest just works.',
  ],
};

export const sports = {
  title: 'One space. Three ways to play.',
  intro: 'Every sport gets the same premium surface, the same lights and the same simple booking.',
  cards: [
    {
      id: 'cricket',
      name: 'Cricket',
      headline: 'Bring your game.',
      text: 'From friendly matches to serious practice sessions, step onto the turf and make every over count.',
      cta: 'Explore cricket',
    },
    {
      id: 'football',
      name: 'Football',
      headline: 'Own the pitch.',
      text: 'Gather your team, find your rhythm and turn an ordinary day into a competitive game.',
      cta: 'Play football',
    },
    {
      id: 'badminton',
      name: 'Badminton',
      headline: 'Rally. Smash. Repeat.',
      text: 'A space for quick rallies, friendly matches and competitive badminton sessions.',
      cta: 'Play badminton',
    },
  ],
};

export const midCta = {
  title: 'Your game. Your time. Your turf.',
  text: "Whether you're organizing an evening cricket game, getting your football team together or planning a badminton session, choose a convenient time and turn the plan into game time.",
  cta: 'Check available slots',
};

export const benefits = {
  title: 'More than just a turf',
  text: 'A great sports session should be about enjoying the game — not worrying about equipment, getting there, or what happens before and after you play. {turf} is designed to make the whole visit comfortable and easy: arrive, play, refresh, relax, and spend proper time with your group. The details are taken care of so the only thing on your mind is the next ball.',
};

export const facilities = {
  title: 'Everything you need, already here',
  items: [
    { icon: 'goal', title: 'Free football goal net', text: 'Goal net available for football sessions.' },
    { icon: 'bat', title: 'Plastic & wooden bats', text: 'Plastic and wooden cricket bats available for players.' },
    { icon: 'wicket', title: 'Free wickets', text: 'Cricket wickets available without additional equipment charges.' },
    { icon: 'net', title: 'Badminton net', text: 'Badminton net provided for the game.' },
    { icon: 'parking', title: 'Parking available', text: 'Convenient parking for visitors.' },
    { icon: 'bath', title: 'Bathroom facilities', text: 'Bathrooms available at the facility.' },
    { icon: 'cafe', title: 'Mini café', text: 'A small café for refreshments and food.' },
    { icon: 'food', title: 'Refreshments', text: 'Food, refreshments and beverages available.' },
    { icon: 'drink', title: 'Energy drinks', text: 'Energy drinks and other beverage options available.' },
    { icon: 'seat', title: 'Seating area', text: 'A comfortable area for players and spectators to sit and relax.' },
    {
      icon: 'cctv',
      title: 'Full surveillance',
      text: 'The facility is equipped with full surveillance and security monitoring.',
    },
  ],
};

export const experience = {
  title: 'Come for the game. Stay for the experience.',
  items: [
    { id: 'play', title: 'Play', text: 'Get on the turf and make the most of your time.' },
    { id: 'refresh', title: 'Refresh', text: 'Take a break, grab refreshments and recharge.' },
    { id: 'relax', title: 'Relax', text: 'Sit back with your teammates and enjoy the atmosphere.' },
  ],
};

export const steps = {
  title: 'From "let\'s play" to game on.',
  items: [
    { n: '01', title: 'Choose', text: 'Pick your sport. Cricket, football or badminton.' },
    { n: '02', title: 'Book', text: 'Select your date and an available slot.' },
    { n: '03', title: 'Play', text: 'Show up and enjoy the game.' },
  ],
};

export const gallery = {
  eyebrow: 'Live from the turf',
  title: 'See the ground as it is right now.',
  text: 'Fresh photos from the turf — the pitch, the lights, the games in progress. Updated as the ground goes live.',
  slots: [
    'Main pitch',
    'Under the floodlights',
    'Match in progress',
    'Football goal & net',
    'Badminton court',
    'Seating & café',
    'Practice nets',
    'Parking & entrance',
  ],
};

export const community = {
  title: "Who's ready to play?",
  items: [
    { id: 'friends', title: 'Friends', text: 'Weekend and evening games with your group.' },
    { id: 'teams', title: 'Teams', text: 'Practice sessions and team matches.' },
    { id: 'corporate', title: 'Corporate groups', text: 'An active way to spend time with colleagues.' },
    { id: 'lovers', title: 'Sports lovers', text: 'Regular practice, casual games and competitive sessions.' },
  ],
};

export const seo = {
  title: 'Your next sports session starts here',
  paragraphs: [
    '{turf} is a sports turf in {area}, {city} built for people who would rather be playing than planning. Whether you are searching for a cricket turf for a box cricket match, a football turf for a fast five-a-side, or a badminton court for a few evening rallies, the same space and the same simple online turf booking cover all three.',
    'Cricket practice sessions get a true surface and proper wickets. Football games get a full goal net and room to run. Badminton sessions get a net and enough height to smash. Every booking is for {min} to {max} players, so a quick hit after work and a full tournament afternoon are equally easy to arrange.',
    'Turf booking should not mean phone calls and guesswork. Check live availability, choose your date and slot, pay securely and receive instant confirmation — from your phone, in under a minute. Then just show up and play.',
    'If you are looking for a sports facility that treats players like guests — with refreshments, seating, parking and full security — {turf} is designed around exactly that.',
  ],
};

export const local = {
  title: 'Looking for a sports turf in {city}?',
  text: 'Players in {city} choose {turf} for the simple reasons that matter: convenient online booking, three sports under one roof, and a space that works just as well for a {max}-player group game as for a {min}-person practice. Cricket, football and badminton each get proper equipment and a well-kept surface, while the café, seating and parking make the whole visit comfortable. Pick a time that suits your group, book in a few taps, and spend your energy on the game instead of the logistics.',
};

export const testimonials = {
  title: 'What players say',
  items: [
    {
      quote: 'The booking experience is simple and the whole place makes it easy to plan an evening game with friends.',
      who: 'Verified player',
      tag: 'Cricket',
    },
    {
      quote:
        'We run our office five-a-side here every Thursday. Goal net is up, lights are great, nobody has to organise anything.',
      who: 'Verified player',
      tag: 'Football',
    },
    {
      quote:
        'Net was up and the court was ready the moment we walked in. Played an hour, had a cold drink after. Exactly what a weekday evening should be.',
      who: 'Verified player',
      tag: 'Badminton',
    },
    {
      quote:
        'Booked from my phone at lunch, confirmed instantly, played at seven. This is how it should work everywhere.',
      who: 'Verified player',
      tag: 'Cricket',
    },
  ],
};

export const faq = {
  title: 'Questions before game time?',
  items: [
    { q: 'What sports are available?', a: 'Cricket, football and badminton.' },
    { q: 'How many players are allowed?', a: 'A booking is for a minimum of {min} and a maximum of {max} players.' },
    {
      q: 'Can I book a turf online?',
      a: 'Yes. Select your sport, date and an available slot, pay securely and you are confirmed instantly.',
    },
    { q: 'Are bats available?', a: 'Plastic and wooden cricket bats are available at the turf.' },
    { q: 'Are wickets provided?', a: 'Yes, wickets are available at no extra charge.' },
    { q: 'Is parking available?', a: 'Yes, convenient parking is available for visitors.' },
    { q: 'Are bathrooms available?', a: 'Yes, bathroom facilities are available on site.' },
    { q: 'Is there a café?', a: 'Yes, a small café provides refreshments, food and drinks.' },
    { q: 'Is surveillance available?', a: 'Yes, the facility has full surveillance and security monitoring.' },
  ],
};

export const finalCta = {
  h1: 'Stop planning.',
  h2: 'Start playing.',
  text: 'Your next game is closer than you think. Pick your sport, choose your time and get on the turf.',
  cta: 'Reserve your game',
};

export const footer = {
  blurb:
    'A modern sports destination for cricket, football and badminton — built for players, teams, friends and sports lovers.',
  tagline: 'Made for the love of the game.',
};

export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `[${k.toUpperCase()}]`));
}
