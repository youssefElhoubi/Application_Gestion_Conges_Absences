import 'dotenv/config';
import { PrismaClient } from '@/src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';

declare global {
  // eslint-disable-next-line no-var
  var globalPrisma: PrismaClient | undefined;
}

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/leave_management';
const adapter = new PrismaPg(connectionString);

const globalForPrisma = globalThis as unknown as { globalPrisma?: PrismaClient };

export const prisma =
  globalForPrisma.globalPrisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.globalPrisma = prisma;
}
