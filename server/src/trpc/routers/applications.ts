import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { publicProcedure, router } from '../trpc';

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

// Fields a client may set when creating an application. Note there is NO
// `userId` here — Phase 3 has no auth, so the server attaches a dev user (below).
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

export const applicationsRouter = router({
  // All applications, newest first.
  list: publicProcedure.query(({ ctx }) =>
    ctx.prisma.application.findMany({ orderBy: { createdAt: 'desc' } }),
  ),

  // One application, including its interviews.
  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const application = await ctx.prisma.application.findUnique({
        where: { id: input.id },
        include: { interviews: true },
      });
      if (!application) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Application ${input.id} not found`,
        });
      }
      return application;
    }),

  create: publicProcedure
    .input(applicationCreateInput)
    .mutation(async ({ ctx, input }) => {
      // No auth yet (Phase 4): attach every application to an auto-provisioned
      // dev user so the required userId FK is satisfied. Replace with the
      // authenticated ctx.user once sessions exist.
      const devUser = await ctx.prisma.user.upsert({
        where: { email: 'dev@local.test' },
        update: {},
        create: {
          email: 'dev@local.test',
          passwordHash: 'dev-only-not-a-real-hash',
        },
      });
      return ctx.prisma.application.create({
        data: { ...input, userId: devUser.id },
      });
    }),

  update: publicProcedure
    .input(z.object({ id: z.string(), data: applicationCreateInput.partial() }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.application.update({
        where: { id: input.id },
        data: input.data,
      }),
    ),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Interview.applicationId is a Restrict FK, so delete child interviews
      // first, then the application — atomically in one transaction.
      const [, application] = await ctx.prisma.$transaction([
        ctx.prisma.interview.deleteMany({ where: { applicationId: input.id } }),
        ctx.prisma.application.delete({ where: { id: input.id } }),
      ]);
      return application;
    }),
});
