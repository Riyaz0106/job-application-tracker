import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import type { PrismaClient } from '@prisma/client';
import { prisma } from '../db/prisma';
import { verifyToken } from '../auth/jwt';

// The authenticated user attached to a request. Never includes passwordHash.
export type AuthUser = { id: string; email: string };

// Built for every request. Reads the Bearer token, verifies it, and looks the
// user up so `ctx.user` is either a real (still-existing) user or null.
// `ctx.prisma` is the shared singleton so all procedures use one pool.
export async function createContext({
  req,
}: CreateExpressContextOptions): Promise<Context> {
  const user = await getUserFromAuthHeader(req.headers.authorization);
  return { prisma, user };
}

async function getUserFromAuthHeader(
  authorization: string | undefined,
): Promise<AuthUser | null> {
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }
  const token = authorization.slice('Bearer '.length);
  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }
  // Look the user up so a token for a deleted user resolves to null. We only
  // select id/email — the password hash never enters the context.
  return prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true },
  });
}

export type Context = {
  prisma: PrismaClient;
  user: AuthUser | null;
};
