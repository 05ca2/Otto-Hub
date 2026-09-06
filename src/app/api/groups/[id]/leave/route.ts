import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const db = getDb();
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(params.id) as any;
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const member = db.prepare('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?').get(params.id, user.id) as { role: string } | undefined;
  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 400 });
  if (member.role === 'owner') return NextResponse.json({ error: 'Owner cannot leave. Transfer ownership or delete the group.' }, { status: 400 });
  db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').run(params.id, user.id);
  return NextResponse.json({ ok: true });
}
