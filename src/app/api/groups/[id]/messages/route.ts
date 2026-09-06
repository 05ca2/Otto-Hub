import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getDb } from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const db = getDb();
  const member = db.prepare('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?').get(params.id, user.id);
  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 });
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const messages = db.prepare(
    `SELECT m.*, u.name AS author_name, u.image AS author_image, u.avatar_frame AS author_avatar_frame
     FROM group_messages m JOIN users u ON u.id = m.author_id
     WHERE m.group_id = ?
     ORDER BY m.created_at DESC LIMIT ? OFFSET ?`
  ).all(params.id, limit, offset) as any[];
  return NextResponse.json({ messages: messages.reverse() });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const db = getDb();
  const member = db.prepare('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?').get(params.id, user.id);
  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (!body?.content) return NextResponse.json({ error: 'Missing content' }, { status: 400 });
  const msgType = body.msg_type || 'text';
  const id = nanoid(12);
  db.prepare(
    'INSERT INTO group_messages (id, group_id, author_id, content, msg_type, file_url, file_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, params.id, user.id, body.content, msgType, body.file_url || null, body.file_name || null, Date.now());
  return NextResponse.json({ ok: true, id });
}
