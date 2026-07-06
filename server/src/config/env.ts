import path from 'node:path';
import { config } from 'dotenv';

// Load environment variables from the single repo-root .env file.
// Resolving from __dirname keeps this correct whether we run from src/ (tsx)
// or dist/ (node) — both directories sit one level under /server.
// If the file is missing, dotenv is a no-op and the defaults below apply.
config({ path: path.resolve(__dirname, '../../../.env') });

// Centralized, typed access to configuration. As later phases add secrets
// (DATABASE_URL, JWT_SECRET, ANTHROPIC_API_KEY) they get parsed here in one place.
export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
} as const;
