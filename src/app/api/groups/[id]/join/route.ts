import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const db = getDb();
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(params.id) as any;
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  // Check if already member
  const existing = db.prepare('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?').get(params.id, user.id);
  if (existing) return NextResponse.json({ error: 'Already a member' }, { status: 400 });
  // Private groups require invite code
  if (group.privacy === 'private') {
    const body = await req.json().catch(() => ({}));
    if (body.invite_code !== group.invite_code) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 403 });
    }
  }
  db.prepare('INSERT INTO group_members (group_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)').run(params.id, user.id, 'member', Date.now());
  return NextResponse.json({ ok: true });
}
