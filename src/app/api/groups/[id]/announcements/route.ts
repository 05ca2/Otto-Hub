import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getDb } from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const db = getDb();
  const member = db.prepare('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?').get(params.id, user.id);
  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 });
  const announcements = db.prepare(
    `SELECT a.*, u.name AS author_name FROM group_announcements a
     JOIN users u ON u.id = a.author_id
     WHERE a.group_id = ?
     ORDER BY a.is_pinned DESC, a.created_at DESC`
  ).all(params.id) as any[];
  return NextResponse.json({ announcements });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const db = getDb();
  const member = db.prepare('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?').get(params.id, user.id) as { role: string } | undefined;
  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    return NextResponse.json({ error: 'Owner/admin only' }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (!body?.title || !body?.body) return NextResponse.json({ error: 'Missing title or body' }, { status: 400 });
  const id = nanoid(12);
  const now = Date.now();
  db.prepare(
    'INSERT INTO group_announcements (id, group_id, author_id, title, body, is_pinned, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, params.id, user.id, body.title, body.body, body.is_pinned ? 1 : 0, now);
  return NextResponse.json({ ok: true, id });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const db = getDb();
  const group = db.prepare('SELECT owner_id FROM groups WHERE id = ?').get(params.id) as { owner_id: string } | undefined;
  if (!group || group.owner_id !== user.id) return NextResponse.json({ error: 'Owner only' }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (!body?.announcement_id) return NextResponse.json({ error: 'Missing announcement_id' }, { status: 400 });
  const sets: string[] = [];
  const values: any[] = [];
  if (body.title !== undefined) { sets.push('title = ?'); values.push(body.title); }
  if (body.body !== undefined) { sets.push('body = ?'); values.push(body.body); }
  if (body.is_pinned !== undefined) { sets.push('is_pinned = ?'); values.push(body.is_pinned ? 1 : 0); }
  if (sets.length > 0) {
    sets.push('updated_at = ?');
    values.push(Date.now());
    values.push(body.announcement_id);
    db.prepare(`UPDATE group_announcements SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const db = getDb();
  const body = await req.json().catch(() => null);
  if (!body?.announcement_id) return NextResponse.json({ error: 'Missing announcement_id' }, { status: 400 });
  const ann = db.prepare('SELECT * FROM group_announcements WHERE id = ?').get(body.announcement_id) as any;
  if (!ann) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const group = db.prepare('SELECT owner_id FROM groups WHERE id = ?').get(params.id) as { owner_id: string } | undefined;
  const isOwner = group?.owner_id === user.id;
  const isAuthor = ann.author_id === user.id;
  if (!isOwner && !isAuthor) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  db.prepare('DELETE FROM group_announcements WHERE id = ?').run(body.announcement_id);
  return NextResponse.json({ ok: true });
}
