import { initTRPC, TRPCError } from '@trpc/server';
import type { Context } from './context';

// Single tRPC initialization for the whole app. `.context<Context>()` binds the
// context type, so every procedure gets a fully-typed `ctx` (ctx.prisma, ctx.user).
const t = initTRPC.context<Context>().create();

export const router = t.router;

// Open to anyone (e.g. auth.register / auth.login / auth.me).
export const publicProcedure = t.procedure;

// Requires a logged-in user. The middleware rejects unauthenticated requests
// AND narrows the type: inside a protectedProcedure, `ctx.user` is non-null, so
// downstream code can safely use ctx.user.id without extra checks.
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to do that.',
    });
  }
  return next({ ctx: { user: ctx.user } });
});
