import bcrypt from 'bcryptjs';

// bcrypt work factor. Higher = slower to hash AND slower to brute-force. 10 is a
// sensible default for a local app; bump it as hardware gets faster.
const SALT_ROUNDS = 10;

// Hash a plaintext password for storage. bcrypt embeds the salt + cost in the
// output string, so nothing else needs to be stored.
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

// Constant-time comparison of a plaintext attempt against a stored hash.
export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
