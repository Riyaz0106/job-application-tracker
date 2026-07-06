import express, { type Express } from 'express';
import { healthRouter } from './routes/health';

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

  return app;
}
