import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

// 7 days. We have no refresh-token mechanism yet, so a very short expiry would
// log users out mid-session. In production you'd pair a short-lived access token
// with a refresh token; that's a later concern.
const TOKEN_EXPIRY: SignOptions['expiresIn'] = '7d';

// What we put inside the token. Keep it minimal — just enough to identify the
// user. Never put secrets (or the password hash) in a JWT: the payload is only
// base64-encoded, not encrypted, so anyone with the token can read it.
export type JwtPayload = { userId: string };

function getSecret(): string {
  if (!env.jwtSecret) {
    throw new Error('JWT_SECRET is not set. Add it to server/.env.');
  }
  return env.jwtSecret;
}

export function signToken(userId: string): string {
  return jwt.sign({ userId }, getSecret(), { expiresIn: TOKEN_EXPIRY });
}

// Returns the payload if the token is valid and unexpired, otherwise null.
// A bad signature or expiry throws inside jwt.verify — we swallow it and treat
// the request as unauthenticated.
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret());
    if (
      typeof decoded === 'object' &&
      decoded !== null &&
      'userId' in decoded &&
      typeof decoded.userId === 'string'
    ) {
      return { userId: decoded.userId };
    }
    return null;
  } catch {
    return null;
  }
}
