import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { hashPassword, verifyPassword } from '../../auth/password';
import { signToken } from '../../auth/jwt';

const credentialsInput = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const authRouter = router({
  // Create a new user with a hashed password, then return a signed token.
  register: publicProcedure
    .input(credentialsInput)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.user.findUnique({
        where: { email: input.email },
        select: { id: true },
      });
      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'That email is already registered.',
        });
      }
      const passwordHash = await hashPassword(input.password);
      const user = await ctx.prisma.user.create({
        data: { email: input.email, passwordHash },
        select: { id: true, email: true }, // never return the hash
      });
      return { token: signToken(user.id), user };
    }),

  // Verify credentials, then return a signed token.
  login: publicProcedure
    .input(credentialsInput)
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });
      // One generic error for "no such email" and "wrong password" so an
      // attacker can't tell which emails are registered (user enumeration).
      if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password.',
        });
      }
      return {
        token: signToken(user.id),
        user: { id: user.id, email: user.email },
      };
    }),

  // The current user (from the verified token), or null if not logged in.
  me: publicProcedure.query(({ ctx }) => ctx.user),
});
