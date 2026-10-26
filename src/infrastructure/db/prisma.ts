import 'dotenv/config';
import { PrismaClient } from '@/src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

declare global {
  var globalPrisma: PrismaClient | undefined;
}

const isProduction = process.env.NODE_ENV === 'production';

function createPrismaClient(): PrismaClient {
  const connectionString =
    process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/leave_management';

  // Serverless functions on Vercel scale out horizontally. Setting max connection pool size to 1
  // in production prevents function instances from exhausting connections on Neon PgBouncer.
  // In development, a larger pool accommodates fast concurrent local requests.
  const pool = new Pool({
    connectionString,
    max: isProduction ? 1 : 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  // Attach error handler to prevent unhandled EventEmitter exceptions on dropped idle connections
  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client:', err.message);
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
  });
}

const globalForPrisma = globalThis as unknown as { globalPrisma?: PrismaClient };

// Safe singleton pattern for Next.js App Router:
// Reuses the existing client in development (surviving hot reload) and within warm serverless function instances.
// Cold starts on separate function instances will initialize their own single-connection client without leak.
export const prisma = globalForPrisma.globalPrisma ?? createPrismaClient();

globalForPrisma.globalPrisma = prisma;

