import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

function createPrismaClient() {
  // Reuse the Pool across hot-reloads in dev so the connection is never torn down
  // between requests. When PrismaPg receives an external Pool it never calls
  // pool.end() on disconnect, which prevents the "Connection closed." error.
  const pool = globalForPrisma.pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL! });

  if (process.env.NODE_ENV !== 'production') globalForPrisma.pgPool = pool;

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export type PrismaTransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
