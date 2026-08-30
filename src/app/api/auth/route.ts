import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { getDb, type UserRow } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/password';
import { createSession, destroySession, getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RegisterBody = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
});

const LoginBody = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
});

export async function GET() {
  const u = await getSessionUser();
  if (!u) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: { id: u.id, name: u.name, email: u.email, image: u.image, bio: u.bio, role: u.role, created_at: u.created_at },
  });
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'login';
  const json = await req.json().catch(() => null);
  if (action === 'register') {
    const p = RegisterBody.safeParse(json);
    if (!p.success) return NextResponse.json({ error: 'Invalid input', details: p.error.format() }, { status: 400 });
    const db = getDb();
    const exists = db.prepare(`SELECT id FROM users WHERE email = ?`).get(p.data.email.toLowerCase());
    if (exists) return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    const id = nanoid(12);
    const now = Date.now();
    db.prepare(
      `INSERT INTO users (id, name, email, email_verified, image, password_hash, bio, created_at)
       VALUES (?, ?, ?, NULL, NULL, ?, NULL, ?)`,
    ).run(id, p.data.name, p.data.email.toLowerCase(), hashPassword(p.data.password), now);
    await createSession(id);
    return NextResponse.json({ user: { id, name: p.data.name, email: p.data.email.toLowerCase() } });
  }
  // login
  const p = LoginBody.safeParse(json);
  if (!p.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  const db = getDb();
  const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(p.data.email.toLowerCase()) as UserRow | undefined;
  if (!user || !user.password_hash || !verifyPassword(p.data.password, user.password_hash)) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }
  await createSession(user.id);
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
}

export async function DELETE() {
  await destroySession();
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const u = await getSessionUser();
  if (!u) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  
  const { name, bio, image } = await req.json();
  const db = getDb();
  
  const updates: string[] = [];
  const values: any[] = [];
  
  if (name !== undefined) { updates.push('name = ?'); values.push(name); }
  if (bio !== undefined) { updates.push('bio = ?'); values.push(bio); }
  if (image !== undefined) { updates.push('image = ?'); values.push(image); }
  
  if (updates.length > 0) {
    values.push(u.id);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }
  
  return NextResponse.json({ success: true });
}
