import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import type { PrismaClient } from '@prisma/client';
import { prisma } from '../db/prisma';

// The tRPC context is built for every request and handed to every procedure.
// It exposes the singleton Prisma client as `ctx.prisma`, so all procedures
// share one connection pool. `opts.req` / `opts.res` are available here for
// later phases (e.g. reading an auth token from the request headers).
export function createContext(_opts: CreateExpressContextOptions): Context {
  return { prisma };
}

export type Context = {
  prisma: PrismaClient;
};
