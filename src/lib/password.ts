// Password hashing using Node's built-in scrypt (no external dep). Produces a
// `scrypt$N$r$p$salt$hash` string. Constant-time compare via scrypt's API.

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const N = 16384, r = 8, p = 1, KEYLEN = 64;

export function hashPassword(plain: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(plain, salt, KEYLEN, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  try {
    const parts = stored.split('$');
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
    const Nv = parseInt(parts[1], 10);
    const rv = parseInt(parts[2], 10);
    const pv = parseInt(parts[3], 10);
    const salt = Buffer.from(parts[4], 'base64');
    const expected = Buffer.from(parts[5], 'base64');
    const actual = scryptSync(plain, salt, expected.length, { N: Nv, r: rv, p: pv });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
