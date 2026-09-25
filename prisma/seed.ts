import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const turf = await prisma.turf.create({
    data: {
      name: 'Your Turf Name',
      description: 'Box cricket turf in Kanpur',
      address: 'Full address, Kanpur, Uttar Pradesh',
      phone: '9xxxxxxxxx',
      email: 'you@gmail.com',
      lat: 26.4499,
      lng: 80.3319,
      images: [],
      ownerName: 'Your Name',
      ownerPhone: '9xxxxxxxxx',
    },
  });
  console.log('Created turf:', turf.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());