import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UpdateBody = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(500).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const db = getDb();
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(params.id) as any;
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const memberRow = db.prepare('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?').get(params.id, user.id) as { role: string } | undefined;
  const isMember = Boolean(memberRow);
  const myRole = memberRow?.role || '';
  // Non-members can only see public groups
  if (!isMember && group.privacy !== 'public') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const members = db.prepare(
    `SELECT u.id, u.name, u.image, u.avatar_frame, gm.role, gm.joined_at
     FROM group_members gm JOIN users u ON u.id = gm.user_id
     WHERE gm.group_id = ? ORDER BY gm.joined_at ASC`
  ).all(params.id) as any[];
  return NextResponse.json({ group, members, isMember, myRole });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const db = getDb();
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(params.id) as any;
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (group.owner_id !== user.id) return NextResponse.json({ error: 'Owner only' }, { status: 403 });
  const json = await req.json().catch(() => null);
  const parsed = UpdateBody.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const sets: string[] = [];
  const values: any[] = [];
  if (parsed.data.name !== undefined) { sets.push('name = ?'); values.push(parsed.data.name); }
  if (parsed.data.description !== undefined) { sets.push('description = ?'); values.push(parsed.data.description); }
  if (sets.length > 0) {
    values.push(params.id);
    db.prepare(`UPDATE groups SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const db = getDb();
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(params.id) as any;
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (group.owner_id !== user.id) return NextResponse.json({ error: 'Owner only' }, { status: 403 });
  db.prepare('DELETE FROM group_messages WHERE group_id = ?').run(params.id);
  db.prepare('DELETE FROM group_announcements WHERE group_id = ?').run(params.id);
  db.prepare('DELETE FROM group_files WHERE group_id = ?').run(params.id);
  db.prepare('DELETE FROM group_members WHERE group_id = ?').run(params.id);
  db.prepare('DELETE FROM groups WHERE id = ?').run(params.id);
  return NextResponse.json({ ok: true });
}
