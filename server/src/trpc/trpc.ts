import { initTRPC } from '@trpc/server';
import type { Context } from './context';

// Single tRPC initialization for the whole app. `.context<Context>()` binds the
// context type, so every procedure gets a fully-typed `ctx` (e.g. ctx.prisma).
const t = initTRPC.context<Context>().create();

// Reusable building blocks used by the routers.
// `router` groups procedures; `publicProcedure` is the base for open procedures.
// A later phase adds `protectedProcedure` = publicProcedure + an auth middleware.
export const router = t.router;
export const publicProcedure = t.procedure;
