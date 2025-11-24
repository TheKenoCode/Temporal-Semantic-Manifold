import { PrismaClient } from '@prisma/client';

// Prisma requires the connection string to be available at runtime, so grab it up front.
const datasourceUrl = process.env.DATABASE_URL;

if (!datasourceUrl) {
  throw new Error(
    'DATABASE_URL is not set. Copy env.sample to .env and update the credentials before starting the app.',
  );
}

// Prevent multiple PrismaClient instances in Next.js dev mode hot reloads.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl,
    log: ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

