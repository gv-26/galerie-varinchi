import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prismaClient: PrismaClient;

if (globalForPrisma.prisma) {
  prismaClient = globalForPrisma.prisma;
} else {
  // Prisma 7 requires explicit driver adapter outside of its own runner
  const dbUrl = typeof process.env.DATABASE_URL === 'string' ? process.env.DATABASE_URL : 'file:./dev.db';
  const adapter = new PrismaBetterSqlite3({ url: dbUrl });
  prismaClient = new PrismaClient({ adapter });
}

export const prisma = prismaClient;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
