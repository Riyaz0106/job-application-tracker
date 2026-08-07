import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';
import { destroyAttachment, signedDownloadUrl } from '../../uploads/cloudinary';
import { ATTACHMENT_KINDS, type AttachmentKind } from '../../uploads/fileRules';

// Maps an attachment kind onto the columns that hold its metadata. Keeps the
// two procedures below free of repeated field-name string soup.
const ATTACHMENT_COLUMNS = {
  cv: {
    fileName: 'cvFileName',
    url: 'cvFileUrl',
    publicId: 'cvPublicId',
    fileSize: 'cvFileSize',
    uploadedAt: 'cvUploadedAt',
  },
  coverLetter: {
    fileName: 'coverLetterFileName',
    url: 'coverLetterUrl',
    publicId: 'coverLetterPublicId',
    fileSize: 'coverLetterFileSize',
    uploadedAt: 'coverLetterUploadedAt',
  },
} as const satisfies Record<AttachmentKind, Record<string, string>>;

const attachmentKindEnum = z.enum(
  ATTACHMENT_KINDS as unknown as [AttachmentKind, ...AttachmentKind[]],
);

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

  // Mints a short-lived download link for an attachment. Stored files are not
  // publicly readable (they're CVs), so viewing one goes through here: ownership
  // is checked first, then the URL is signed server-side and expires in minutes.
  fileUrl: protectedProcedure
    .input(z.object({ applicationId: z.string(), kind: attachmentKindEnum }))
    .query(async ({ ctx, input }) => {
      const cols = ATTACHMENT_COLUMNS[input.kind];
      const row = await ctx.prisma.application.findFirst({
        where: { id: input.applicationId, userId: ctx.user.id },
        select: { id: true, [cols.publicId]: true, [cols.fileName]: true },
      });
      if (!row) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Application not found',
        });
      }
      const record = row as Record<string, unknown>;
      const publicId = record[cols.publicId];
      if (typeof publicId !== 'string') {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No file is attached.',
        });
      }
      return {
        url: signedDownloadUrl(publicId),
        fileName:
          typeof record[cols.fileName] === 'string'
            ? (record[cols.fileName] as string)
            : 'file',
      };
    }),

  // Records a file that /api/uploads has already stored in Cloudinary. The route
  // moves the bytes; this owns the database write (and the type safety).
  attachFile: protectedProcedure
    .input(
      z.object({
        applicationId: z.string(),
        kind: attachmentKindEnum,
        fileName: z.string().min(1),
        url: z.string().url(),
        publicId: z.string().min(1),
        fileSize: z.number().int().nonnegative(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const cols = ATTACHMENT_COLUMNS[input.kind];
      const existing = await ctx.prisma.application.findFirst({
        where: { id: input.applicationId, userId: ctx.user.id },
        select: { id: true, [cols.publicId]: true },
      });
      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Application not found',
        });
      }

      // Replacing an attachment: remove the file this one supersedes, otherwise
      // it lingers in storage with nothing pointing at it.
      const previousPublicId = (existing as Record<string, unknown>)[
        cols.publicId
      ];
      if (
        typeof previousPublicId === 'string' &&
        previousPublicId !== input.publicId
      ) {
        await destroyAttachment(previousPublicId).catch(() => {
          // A failed cleanup must not fail the attach — the new file is already
          // stored and the user's intent is to attach it.
        });
      }

      return ctx.prisma.application.update({
        where: { id: input.applicationId },
        data: {
          [cols.fileName]: input.fileName,
          [cols.url]: input.url,
          [cols.publicId]: input.publicId,
          [cols.fileSize]: input.fileSize,
          [cols.uploadedAt]: new Date(),
        },
      });
    }),

  // Deletes from Cloudinary AND clears the columns, so storage and the database
  // stay in step.
  removeFile: protectedProcedure
    .input(z.object({ applicationId: z.string(), kind: attachmentKindEnum }))
    .mutation(async ({ ctx, input }) => {
      const cols = ATTACHMENT_COLUMNS[input.kind];
      const existing = await ctx.prisma.application.findFirst({
        where: { id: input.applicationId, userId: ctx.user.id },
        select: { id: true, [cols.publicId]: true },
      });
      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Application not found',
        });
      }

      const publicId = (existing as Record<string, unknown>)[cols.publicId];
      if (typeof publicId === 'string') {
        // Deliberately NOT caught: if the file can't be removed from storage we
        // keep the database pointing at it rather than orphaning it silently.
        await destroyAttachment(publicId);
      }

      return ctx.prisma.application.update({
        where: { id: input.applicationId },
        data: {
          [cols.fileName]: null,
          [cols.url]: null,
          [cols.publicId]: null,
          [cols.fileSize]: null,
          [cols.uploadedAt]: null,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const owned = await ctx.prisma.application.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        select: { id: true, cvPublicId: true, coverLetterPublicId: true },
      });
      if (!owned) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Application not found',
        });
      }
      // Deleting the application must also clear its stored files, or they'd sit
      // in Cloudinary forever with no row pointing at them. Cleanup failures are
      // swallowed: the user asked to delete the application, and a stuck remote
      // file shouldn't block that.
      await Promise.all(
        [owned.cvPublicId, owned.coverLetterPublicId]
          .filter((id): id is string => typeof id === 'string')
          .map((id) => destroyAttachment(id).catch(() => undefined)),
      );
      // Interview.applicationId is a Restrict FK, so delete child interviews
      // first, then the application — atomically in one transaction.
      const [, application] = await ctx.prisma.$transaction([
        ctx.prisma.interview.deleteMany({ where: { applicationId: input.id } }),
        ctx.prisma.application.delete({ where: { id: input.id } }),
      ]);
      return application;
    }),
});
