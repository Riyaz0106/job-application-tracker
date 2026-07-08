import { z } from 'zod';
import { publicProcedure, router } from '../trpc';

const interviewCreateInput = z.object({
  applicationId: z.string(),
  round: z.string().min(1),
  date: z.coerce.date(),
  notes: z.string().optional(),
});

export const interviewsRouter = router({
  // All interviews for one application, earliest first.
  listByApplication: publicProcedure
    .input(z.object({ applicationId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.prisma.interview.findMany({
        where: { applicationId: input.applicationId },
        orderBy: { date: 'asc' },
      }),
    ),

  create: publicProcedure
    .input(interviewCreateInput)
    .mutation(({ ctx, input }) => ctx.prisma.interview.create({ data: input })),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        // applicationId can't be changed via update — an interview stays with
        // its application.
        data: interviewCreateInput.omit({ applicationId: true }).partial(),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.interview.update({
        where: { id: input.id },
        data: input.data,
      }),
    ),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.interview.delete({ where: { id: input.id } }),
    ),
});
