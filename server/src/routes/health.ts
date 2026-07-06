import { Router, type Request, type Response } from 'express';

// Health-check router. Mounted at /health in app.ts, so the '/' route here
// answers GET /health. Used as a liveness probe (is the process up?).
export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});
