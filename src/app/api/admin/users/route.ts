import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  await requireAdmin();
  const db = getDb();
  const users = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.bio, u.created_at,
      (SELECT COUNT(*) FROM documents WHERE user_id = u.id) as doc_count,
      (SELECT COUNT(*) FROM posts WHERE author_id = u.id) as post_count
    FROM users u ORDER BY u.created_at DESC
  `).all();
  return NextResponse.json({ users });
}

export async function PATCH(req: NextRequest) {
  await requireAdmin();
  const { id, role, banned } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
  const db = getDb();
  if (role !== undefined) {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  }
  if (banned !== undefined) {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(banned ? 'banned' : 'user', id);
  }
  return NextResponse.json({ ok: true });
}
