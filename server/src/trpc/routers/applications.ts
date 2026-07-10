import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';

// Mirrors the Prisma `Status` enum. Kept explicit so invalid statuses are
// rejected at the network boundary before they reach the database.
const statusEnum = z.enum([
  'DRAFTING',
  'APPLIED',
  'PHONE_SCREEN',
  'TECHNICAL',
  'PANEL',
  'OFFER',
  'REJECTED',
  'ACCEPTED',
]);

// Fields a client may set when creating an application. There is no `userId` —
// it always comes from the authenticated user, never from client input.
const applicationCreateInput = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  jobDescription: z.string().min(1),
  status: statusEnum.optional(),
  appliedDate: z.coerce.date().optional(),
  matchScore: z.number().int().optional(),
  matchGaps: z.string().optional(),
  cvFileName: z.string().optional(),
  cvFileUrl: z.string().optional(),
  coverLetter: z.string().optional(),
  coverLetterUrl: z.string().optional(),
  salary: z.string().optional(),
  recruiter: z.string().optional(),
  notes: z.string().optional(),
});

// Every procedure below is `protectedProcedure` (login required) and every
// query/mutation is filtered by ctx.user.id, so a user can only ever see or
// touch their own applications.
export const applicationsRouter = router({
  // The current user's applications, newest first.
  list: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.application.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: 'desc' },
    }),
  ),

  // One of the user's applications, including its interviews. `findFirst` with
  // the userId filter means another user's id simply resolves to not-found.
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const application = await ctx.prisma.application.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        include: { interviews: true },
      });
      if (!application) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Application not found',
        });
      }
      return application;
    }),

  create: protectedProcedure
    .input(applicationCreateInput)
    .mutation(({ ctx, input }) =>
      ctx.prisma.application.create({
        data: { ...input, userId: ctx.user.id },
      }),
    ),

  update: protectedProcedure
    .input(z.object({ id: z.string(), data: applicationCreateInput.partial() }))
    .mutation(async ({ ctx, input }) => {
      // Confirm ownership before updating so users can't edit others' rows.
      const owned = await ctx.prisma.application.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        select: { id: true },
      });
      if (!owned) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Application not found',
        });
      }
      return ctx.prisma.application.update({
        where: { id: input.id },
        data: input.data,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const owned = await ctx.prisma.application.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        select: { id: true },
      });
      if (!owned) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Application not found',
        });
      }
      // Interview.applicationId is a Restrict FK, so delete child interviews
      // first, then the application — atomically in one transaction.
      const [, application] = await ctx.prisma.$transaction([
        ctx.prisma.interview.deleteMany({ where: { applicationId: input.id } }),
        ctx.prisma.application.delete({ where: { id: input.id } }),
      ]);
      return application;
    }),
});
