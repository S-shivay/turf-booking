import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/**
 * The one Turf row. Everything on the site reads from it — the homepage, the
 * contact page, the legal pages, every email and the JSON-LD Google indexes.
 *
 * Fill these in before seeding production; whatever is here becomes what
 * customers read. They can also be changed later in `npx prisma studio`.
 */
const TURF = {
  name: 'Your Turf Name',
  description: 'Box cricket turf in Kanpur',
  address: 'Full address, Kanpur, Uttar Pradesh',
  phone: '9xxxxxxxxx',
  email: 'you@gmail.com',
  // Used by the map on /contact. Right-click the spot in Google Maps to copy them.
  lat: 26.4499,
  lng: 80.3319,
  images: [],
  ownerName: 'Your Name',
  ownerPhone: '9xxxxxxxxx',
};

/**
 * Safe to run twice. `getTurf()` reads the first active Turf, so a second row
 * would be invisible and confusing rather than obviously wrong — which makes
 * an accidental re-seed expensive to notice. So: create only if none exists.
 */
async function main() {
  const existing = await prisma.turf.findFirst({ where: { isActive: true } });
  if (existing) {
    console.log(`Turf already exists: ${existing.name} (${existing.id}) — nothing to do.`);
    console.log('Change its details with: npx prisma studio');
    return;
  }

  const turf = await prisma.turf.create({ data: TURF });
  console.log(`Created turf: ${turf.name} (${turf.id})`);
  if (turf.name === 'Your Turf Name') {
    console.warn('\n⚠  These are placeholders. Customers will see them on every page.');
    console.warn('   Put the real details in with: npx prisma studio');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
