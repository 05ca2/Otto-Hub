import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { moderateContent } from '@/lib/moderation';
import { syncPost } from '@/lib/github-sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PostBody = z.object({
  title: z.string().min(2).max(200),
  body: z.string().min(2).max(20000),
  tags: z.array(z.string().min(1).max(40)).max(10).optional(),
  visibility: z.enum(['public', 'room']).default('public'),
  roomId: z.string().nullable().optional(),
});

function scoreOf(targetType: string, targetId: string): number {
  const r = getDb()
    .prepare(`SELECT COALESCE(SUM(value), 0) AS s FROM votes WHERE target_type = ? AND target_id = ?`)
    .get(targetType, targetId) as { s: number };
  return r.s;
}

export async function GET(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const url = new URL(req.url);
  const scope = url.searchParams.get('scope') || 'all'; // 'all' | 'feed' | 'mine' | 'room'
  const roomId = url.searchParams.get('roomId');
  const db = getDb();
  const myRooms = db
    .prepare(`SELECT room_id FROM room_members WHERE user_id = ?`)
    .all(user.id) as Array<{ room_id: string }>;
  const myRoomIds = myRooms.map((r) => r.room_id);

  let where = '';
  const args: any[] = [];
  if (scope === 'feed') {
    where = `WHERE (p.visibility = 'public' OR (p.visibility = 'room' AND p.room_id IN (${myRoomIds.length ? myRoomIds.map(() => '?').join(',') : "''"})))`;
    args.push(...myRoomIds);
  } else if (scope === 'mine') {
    where = `WHERE p.author_id = ?`;
    args.push(user.id);
  } else if (scope === 'room' && roomId) {
    where = `WHERE (p.room_id = ? AND (p.visibility = 'room' OR p.visibility = 'public'))`;
    args.push(roomId);
  }

  const rows = db
    .prepare(
      `SELECT p.*, u.name AS author_name, u.image AS author_image, u.avatar_frame AS author_avatar_frame
       FROM posts p JOIN users u ON u.id = p.author_id
       ${where}
       ORDER BY p.created_at DESC LIMIT 200`,
    )
    .all(...args) as Array<any>;
  const enriched = rows.map((p) => ({
    ...p,
    score: scoreOf('post', p.id),
    my_vote: (db.prepare(`SELECT value FROM votes WHERE user_id = ? AND target_type = 'post' AND target_id = ?`).get(user.id, p.id) as { value: number } | undefined)?.value || 0,
    comment_count: (db.prepare(`SELECT COUNT(*) AS c FROM comments WHERE post_id = ?`).get(p.id) as { c: number }).c,
  }));
  return NextResponse.json({ posts: enriched });
}

export async function POST(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const json = await req.json().catch(() => null);
  const parsed = PostBody.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request', details: parsed.error.format() }, { status: 400 });
  const { title, body, tags, visibility, roomId } = parsed.data;
  if (visibility === 'room') {
    if (!roomId) return NextResponse.json({ error: 'roomId required for room-scoped post' }, { status: 400 });
    const member = getDb().prepare(`SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?`).get(roomId, user.id);
    if (!member) return NextResponse.json({ error: 'Not a member of this room' }, { status: 403 });
  }
// Content moderation check
   if (visibility === 'public') {
     const modResult = await moderateContent(title, body);
     if (!modResult.ok) {
       // Log violation for admin review
       try {
         const vId = (await import('nanoid')).nanoid();
         const preview = ((body || '').slice(0, 200) || '').replace(/'/g, "''");
         const reason = (modResult.reason || 'Content violates guidelines').replace(/'/g, "''");
         const titleSanitized = (title || '').slice(0, 200).replace(/'/g, "''");
         const db = getDb();
         db.prepare(`INSERT INTO violations (id, post_id, author_id, reason, content_preview, source, created_at) VALUES (?, NULL, ?, ?, ?, 'moderation', ?)`).run(vId, user.id, reason, titleSanitized + ': ' + preview, Date.now());
       } catch {}
       return NextResponse.json({ error: 'Content rejected', reason: modResult.reason }, { status: 422 });
     }
   }
  const id = nanoid(12);
  getDb()
    .prepare(
      `INSERT INTO posts (id, author_id, room_id, title, body, tags, visibility, best_answer_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
    )
    .run(id, user.id, visibility === 'room' ? (roomId || null) : null, title, body, JSON.stringify(tags || []), visibility, Date.now());

  // Fire-and-forget: sync public posts to GitHub repo
  if (visibility === 'public') {
    syncPost({
      postId: id,
      userId: user.id,
      title,
      body,
      tags: JSON.stringify(tags || []),
      createdAt: Date.now(),
    }).catch(() => {});
  }

  return NextResponse.json({ id });
}
