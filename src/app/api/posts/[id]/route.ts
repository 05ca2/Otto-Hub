import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { SupportedValueType } from 'node:sqlite';
import { getDb, type PostRow } from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Params { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const db = getDb();
  const post = db
    .prepare(
      `SELECT p.*, u.name AS author_name, u.image AS author_image
       FROM posts p JOIN users u ON u.id = p.author_id
       WHERE p.id = ?`,
    )
    .get(params.id) as (PostRow & { author_name: string; author_image: string | null }) | undefined;
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Visibility check
  if (post.visibility === 'room' && post.room_id) {
    const member = db.prepare(`SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?`).get(post.room_id, user.id);
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const comments = db
    .prepare(
      `SELECT c.*, u.name AS author_name, u.image AS author_image
       FROM comments c JOIN users u ON u.id = c.author_id
       WHERE c.post_id = ? ORDER BY c.created_at ASC`,
    )
    .all(params.id) as Array<any>;

  const score = (targetType: string, targetId: string) =>
    (db.prepare(`SELECT COALESCE(SUM(value),0) AS s FROM votes WHERE target_type = ? AND target_id = ?`).get(targetType, targetId) as { s: number }).s;
  const myVote = (targetType: string, targetId: string) =>
    (db.prepare(`SELECT value FROM votes WHERE user_id = ? AND target_type = ? AND target_id = ?`).get(user.id, targetType, targetId) as { value: number } | undefined)?.value || 0;

  return NextResponse.json({
    post: {
      ...post,
      score: score('post', post.id),
      my_vote: myVote('post', post.id),
    },
    comments: comments.map((c) => ({
      ...c,
      score: score('comment', c.id),
      my_vote: myVote('comment', c.id),
    })),
  });
}

const ActionBody = z.object({
  action: z.enum(['comment', 'vote', 'best_answer']),
  body: z.string().min(1).max(10000).optional(),
  parent_id: z.string().optional(),
  value: z.union([z.literal(1), z.literal(-1), z.literal(0)]).optional(),
  comment_id: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: Params) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const json = await req.json().catch(() => null);
  const parsed = ActionBody.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const db = getDb();
  const post = db.prepare(`SELECT * FROM posts WHERE id = ?`).get(params.id) as PostRow | undefined;
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (parsed.data.action === 'comment') {
    if (!parsed.data.body) return NextResponse.json({ error: 'body required' }, { status: 400 });
    const { nanoid } = await import('nanoid');
    const id = nanoid(12);
    db.prepare(
      `INSERT INTO comments (id, post_id, author_id, body, parent_id, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(id, post.id, user.id, parsed.data.body, parsed.data.parent_id || null, Date.now());
    return NextResponse.json({ id });
  }
  if (parsed.data.action === 'vote') {
    if (parsed.data.value === undefined) return NextResponse.json({ error: 'value required' }, { status: 400 });
    if (parsed.data.value === 0) {
      db.prepare(`DELETE FROM votes WHERE user_id = ? AND target_type = 'post' AND target_id = ?`).run(user.id, post.id);
    } else {
      db.prepare(
        `INSERT INTO votes (user_id, target_type, target_id, value, created_at)
         VALUES (?, 'post', ?, ?, ?)
         ON CONFLICT (user_id, target_type, target_id) DO UPDATE SET value = excluded.value`,
      ).run(user.id, post.id, parsed.data.value, Date.now());
    }
    const s = (db.prepare(`SELECT COALESCE(SUM(value),0) AS s FROM votes WHERE target_type = 'post' AND target_id = ?`).get(post.id) as { s: number }).s;
    return NextResponse.json({ score: s });
  }
  if (parsed.data.action === 'best_answer') {
    if (post.author_id !== user.id) return NextResponse.json({ error: 'Only the author can mark a best answer' }, { status: 403 });
    if (!parsed.data.comment_id) return NextResponse.json({ error: 'comment_id required' }, { status: 400 });
    db.prepare(`UPDATE posts SET best_answer_id = ? WHERE id = ?`).run(parsed.data.comment_id, post.id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

const PatchBody = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(50000).optional(),
  tags: z.array(z.string().min(1).max(40)).max(10).optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const json = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  if (parsed.data.title === undefined && parsed.data.body === undefined && parsed.data.tags === undefined) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }
  const db = getDb();
  const post = db.prepare(`SELECT * FROM posts WHERE id = ?`).get(params.id) as PostRow | undefined;
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (post.author_id !== user.id && user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const sets: string[] = [];
  const values: SupportedValueType[] = [];
  if (parsed.data.title !== undefined) { sets.push('title = ?'); values.push(parsed.data.title); }
  if (parsed.data.body !== undefined) { sets.push('body = ?'); values.push(parsed.data.body); }
  if (parsed.data.tags !== undefined) { sets.push('tags = ?'); values.push(JSON.stringify(parsed.data.tags)); }
  values.push(post.id);
  db.prepare(`UPDATE posts SET ${sets.join(', ')} WHERE id = ?`).run(...values);

  const updated = db.prepare(`SELECT * FROM posts WHERE id = ?`).get(post.id) as PostRow;
  return NextResponse.json({ post: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const db = getDb();
  const post = db.prepare(`SELECT * FROM posts WHERE id = ?`).get(params.id) as PostRow | undefined;
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (post.author_id !== user.id && user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  db.prepare(`DELETE FROM comments WHERE post_id = ?`).run(post.id);
  db.prepare(`DELETE FROM posts WHERE id = ?`).run(post.id);
  return NextResponse.json({ ok: true });
}
