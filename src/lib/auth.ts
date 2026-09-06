// Cookie-based session layer. No external dep. Tokens are random 32 bytes,
// stored in the sessions table, and held in an httpOnly cookie. Server actions
// and API routes call getSessionUser() to identify the caller.

import { cookies } from 'next/headers';
import { randomBytes, createHmac } from 'node:crypto';
import { getDb, type UserRow } from './db';

const COOKIE = 'ash_session';
const COOKIE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'dev-only-change-me';

// Super admin — cannot be demoted, banned, or removed by anyone
export const SUPER_ADMIN_EMAIL = 'freshpinapple20120518@outlook.com';

export function isSuperAdmin(user: { email: string | null; role?: string | null }): boolean {
  return user.email === SUPER_ADMIN_EMAIL || user.role === 'super_admin';
}

function sign(value: string): string {
  return createHmac('sha256', SECRET).update(value).digest('hex');
}

function pack(token: string): string {
  return `${token}.${sign(token)}`;
}

function unpack(packed: string): string | null {
  const idx = packed.lastIndexOf('.');
  if (idx < 0) return null;
  const token = packed.slice(0, idx);
  const sig = packed.slice(idx + 1);
  if (sign(token) !== sig) return null;
  return token;
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const expires = Date.now() + COOKIE_TTL_MS;
  getDb()
    .prepare(`INSERT INTO sessions (id, session_token, user_id, expires) VALUES (?, ?, ?, ?)`)
    .run(randomBytes(12).toString('base64url'), token, userId, expires);
  cookies().set(COOKIE, pack(token), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(COOKIE_TTL_MS / 1000),
    secure: false, // HTTP-only for now; set true when HTTPS is configured
  });
  return token;
}

export async function destroySession(): Promise<void> {
  const c = cookies();
  const raw = c.get(COOKIE)?.value;
  if (raw) {
    const token = unpack(raw);
    if (token) {
      try { getDb().prepare(`DELETE FROM sessions WHERE session_token = ?`).run(token); } catch {}
    }
  }
  c.delete(COOKIE);
}

export async function getSessionUser(): Promise<UserRow | null> {
  const raw = cookies().get(COOKIE)?.value;
  if (!raw) return null;
  const token = unpack(raw);
  if (!token) return null;
  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.* FROM users u
       JOIN sessions s ON s.user_id = u.id
       WHERE s.session_token = ? AND s.expires > ?`,
    )
    .get(token, Date.now()) as UserRow | undefined;
  return row || null;
}

export async function requireUser(): Promise<UserRow> {
  const u = await getSessionUser();
  if (!u) {
    const err: any = new Error('Not authenticated');
    err.status = 401;
    throw err;
  }
  return u;
}

export async function requireAdmin(): Promise<UserRow> {
  const u = await requireUser();
  if (u.role !== 'admin' && u.role !== 'super_admin') {
    const err: any = new Error('Admin access required');
    err.status = 403;
    throw err;
  }
  return u;
}

export async function requireSuperAdmin(): Promise<UserRow> {
  const u = await requireUser();
  if (!isSuperAdmin(u)) {
    const err: any = new Error('Super admin access required');
    err.status = 403;
    throw err;
  }
  return u;
}
