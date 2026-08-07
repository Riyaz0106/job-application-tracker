import express, { type Express } from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { healthRouter } from './routes/health';
import { dbCheckRouter } from './routes/dbCheck';
import { uploadsRouter } from './routes/uploads';
import { appRouter } from './trpc/routers/_app';
import { createContext } from './trpc/context';

// Builds and configures the Express app, but does NOT start it listening.
// Separating construction from startup means later phases can import
// `createApp()` in tests and make requests without binding a network port.
// It's also where tRPC and other middleware will be mounted later.
export function createApp(): Express {
  const app = express();

  // Parse JSON request bodies — ready for POST/PUT routes in later phases.
  app.use(express.json());

  // Routes.
  app.use('/health', healthRouter);
  app.use('/db-check', dbCheckRouter); // TEMPORARY (Phase 2) — removed later.

  // Multipart file uploads. Also under /api so it rides the same Vite proxy.
  // Deliberately NOT tRPC: binary can't travel over tRPC's JSON transport
  // without base64 bloat and no progress events (see routes/uploads.ts). This
  // route only moves bytes to Cloudinary and returns metadata; the database
  // write happens through the tRPC applications.attachFile mutation.
  app.use('/api/uploads', uploadsRouter);

  // tRPC — mounted under /api so it rides the client's existing Vite /api proxy
  // (client calls /api/trpc; Vite forwards to this server). createContext gives
  // every procedure access to the Prisma singleton via ctx.prisma.
  app.use(
    '/api/trpc',
    createExpressMiddleware({ router: appRouter, createContext }),
  );

  return app;
}
