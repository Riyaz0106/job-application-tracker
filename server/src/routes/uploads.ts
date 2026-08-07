import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import multer from 'multer';
import { verifyToken } from '../auth/jwt';
import { prisma } from '../db/prisma';
import { uploadAttachment } from '../uploads/cloudinary';
import {
  ATTACHMENT_KINDS,
  MAX_FILE_BYTES,
  MAX_SIZE_LABEL,
  formatBytes,
  validateFile,
  type AttachmentKind,
} from '../uploads/fileRules';

// Multipart upload route.
//
// WHY THIS ISN'T A tRPC PROCEDURE: tRPC's httpBatchLink serialises inputs as
// JSON (superjson). Binary can only ride that as base64 — ~33% larger, the whole
// file held twice in memory, and no upload-progress events. So the bytes take a
// plain multipart route, and a tRPC mutation (applications.attachFile) records
// the resulting metadata. The boundary: THIS route moves bytes and returns
// metadata; tRPC owns all database writes and stays fully type-safe.
export const uploadsRouter = Router();

// Memory storage: the file goes straight from the request to Cloudinary without
// ever touching this server's disk. Safe at a 5MB cap.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 1 },
});

type AuthedRequest = Request & { userId?: string };

// 1. Authenticate BEFORE multer, so an anonymous request never gets to stream a
//    file into this process's memory.
function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const payload = header?.startsWith('Bearer ')
    ? verifyToken(header.slice('Bearer '.length))
    : null;
  if (!payload) {
    res.status(401).json({ error: 'Log in again — your session has expired.' });
    return;
  }
  req.userId = payload.userId;
  next();
}

// 2. Verify ownership BEFORE multer too. A user may only attach files to their
//    own applications, and a stranger's upload is refused before it costs us
//    any bandwidth or memory.
async function requireOwnedApplication(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  const { applicationId, kind } = req.params;
  if (!ATTACHMENT_KINDS.includes(kind as AttachmentKind)) {
    res.status(400).json({ error: 'Unknown attachment type.' });
    return;
  }
  const owned = await prisma.application.findFirst({
    where: { id: applicationId, userId: req.userId },
    select: { id: true },
  });
  if (!owned) {
    // Same response whether it doesn't exist or belongs to someone else, so this
    // can't be used to probe for other users' application ids.
    res.status(404).json({ error: 'Application not found.' });
    return;
  }
  next();
}

uploadsRouter.post(
  '/:applicationId/:kind',
  requireAuth,
  (req, res, next) => {
    void requireOwnedApplication(req, res, next);
  },
  // 3. Only now do we accept the bytes.
  (req: AuthedRequest, res: Response, next: NextFunction) => {
    upload.single('file')(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          // The stream was aborted at the cap, so the exact size isn't known
          // here; Content-Length is a close upper bound and makes the message
          // concrete. (The client checks the precise size before sending, so in
          // practice you see the exact figure.)
          const declared = Number(req.headers['content-length'] ?? 0);
          const approx = declared ? ` (about ${formatBytes(declared)})` : '';
          res.status(413).json({
            error: `That file is too big${approx} — the limit is ${MAX_SIZE_LABEL}.`,
          });
          return;
        }
        res.status(400).json({ error: `Upload rejected: ${err.message}.` });
        return;
      }
      if (err) return next(err);
      next();
    });
  },
  async (req: AuthedRequest, res: Response) => {
    const file = req.file;
    if (!file) {
      res
        .status(400)
        .json({ error: 'No file received — choose a file first.' });
      return;
    }

    // 4. Validate extension AND declared MIME type together.
    const reason = validateFile({
      fileName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    });
    if (reason) {
      res.status(400).json({ error: reason });
      return;
    }

    try {
      const uploaded = await uploadAttachment({
        buffer: file.buffer,
        fileName: file.originalname,
        userId: req.userId as string,
        applicationId: req.params.applicationId as string,
        kind: req.params.kind as AttachmentKind,
      });
      // Metadata only — the client hands this straight to applications.attachFile.
      res.status(201).json(uploaded);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown upload error';
      // Surfaces "Cloudinary is not configured..." verbatim, which is the most
      // useful thing to see during setup.
      res.status(502).json({ error: `Couldn’t store the file — ${message}` });
    }
  },
);
