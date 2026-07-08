import { PrismaClient } from '@prisma/client';
// Importing env runs dotenv, so process.env.DATABASE_URL is populated before we
// construct the client below. Prisma reads DATABASE_URL from the datasource
// (env("DATABASE_URL") in schema.prisma) when the client is constructed.
import { env } from '../config/env';

// Fail fast with a clear message instead of a cryptic Prisma error later.
if (!env.databaseUrl) {
  throw new Error(
    'DATABASE_URL is not set. Copy server/.env.example to server/.env and fill in your local Postgres credentials.',
  );
}

// Singleton. Under `tsx watch`, the module graph re-executes on every file save.
// Without caching, each reload would build a NEW PrismaClient (and a new
// connection pool) while old ones linger, quickly exhausting Postgres
// connections ("sorry, too many clients already"). Caching the instance on
// globalThis reuses one client across reloads. In production there's no
// hot-reload, so we just create it once.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (env.nodeEnv !== 'production') {
  globalForPrisma.prisma = prisma;
}
