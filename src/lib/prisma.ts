import { PrismaClient } from '@prisma/client';
import { Pool } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prismaClient: PrismaClient;

if (globalForPrisma.prisma) {
  prismaClient = globalForPrisma.prisma;
} else {
  // Use Neon serverless driver with Pool for Cloudflare edge worker compatibility
  const connectionString = process.env.DATABASE_URL || 'postgres://u:p@localhost:5432/d';
  const pool = new Pool({ connectionString });
  // Cast as any to bypass internal definition discrepancies in current adapter package version
  const adapter = new PrismaNeon(pool as any);
  prismaClient = new PrismaClient({ adapter });
}

export const prisma = prismaClient;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
