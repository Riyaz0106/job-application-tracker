import { Router, type Request, type Response } from 'express';
import { prisma } from '../db/prisma';

// TEMPORARY (Phase 2): proves the database connection works end to end by
// running a trivial query. This route will be removed in a later phase.
export const dbCheckRouter = Router();

dbCheckRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.count();
    res.json({ users });
  } catch (err) {
    // Surface the real reason (bad DATABASE_URL, DB down, missing migration)
    // so the Phase 2 verify step is easy to debug.
    res.status(500).json({
      error: 'Database query failed',
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});
