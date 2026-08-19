import path from 'node:path';
import { config } from 'dotenv';

// Load server environment from server/.env (co-located with this workspace).
// Prisma's CLI loads the same file via prisma.config.ts, so the running server
// and the migration tooling always read one source of truth.
// __dirname resolves correctly from src/ (tsx) and dist/ (node) — both sit one
// level under /server. If the file is missing, dotenv is a no-op.
config({ path: path.resolve(__dirname, '../../.env') });

// Centralized, typed access to configuration. `databaseUrl` may be undefined
// here (we validate it where it's actually needed — see db/prisma.ts — so the
// error message can be specific and actionable).
export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL,
  // Secret used to sign/verify JWTs. May be undefined here; the auth layer
  // (src/auth/jwt.ts) validates its presence before signing/verifying.
  jwtSecret: process.env.JWT_SECRET,
  // Cloudinary credentials. These are read ONLY here, in the server workspace,
  // from server/.env — which is git-ignored and which Vite never reads. The API
  // secret must never be sent to a browser, so every Cloudinary call happens in
  // src/uploads/cloudinary.ts on this process. See README "File uploads".
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
} as const;
