import 'server-only';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { envOr } from '@/lib/utils';

// One bounded pool per server instance. Serverless instances are small and
// short-lived, so keep `max` modest — Neon's pooler multiplexes behind it.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  // The || also catches a non-numeric value, which Number() makes NaN.
  max: Number(envOr(process.env.DB_POOL_MAX, '10')) || 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
