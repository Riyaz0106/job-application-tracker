import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';

const interviewCreateInput = z.object({
  applicationId: z.string(),
  round: z.string().min(1),
  date: z.coerce.date(),
  notes: z.string().optional(),
});

// Interviews belong to an application, which belongs to a user. Every procedure
// scopes through the parent application's userId, so a user can only see/touch
// interviews on their own applications.
export const interviewsRouter = router({
  // Interviews for one of the user's applications, earliest first. The relation
  // filter (application.userId) means a non-owned applicationId returns [].
  listByApplication: protectedProcedure
    .input(z.object({ applicationId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.prisma.interview.findMany({
        where: {
          applicationId: input.applicationId,
          application: { userId: ctx.user.id },
        },
        orderBy: { date: 'asc' },
      }),
    ),

  create: protectedProcedure
    .input(interviewCreateInput)
    .mutation(async ({ ctx, input }) => {
      // Only allow adding an interview to an application the user owns.
      const ownsApplication = await ctx.prisma.application.findFirst({
        where: { id: input.applicationId, userId: ctx.user.id },
        select: { id: true },
      });
      if (!ownsApplication) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Application not found',
        });
      }
      return ctx.prisma.interview.create({ data: input });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        // applicationId can't be changed via update — an interview stays with
        // its application.
        data: interviewCreateInput.omit({ applicationId: true }).partial(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const owned = await ctx.prisma.interview.findFirst({
        where: { id: input.id, application: { userId: ctx.user.id } },
        select: { id: true },
      });
      if (!owned) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Interview not found',
        });
      }
      return ctx.prisma.interview.update({
        where: { id: input.id },
        data: input.data,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const owned = await ctx.prisma.interview.findFirst({
        where: { id: input.id, application: { userId: ctx.user.id } },
        select: { id: true },
      });
      if (!owned) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Interview not found',
        });
      }
      return ctx.prisma.interview.delete({ where: { id: input.id } });
    }),
});
