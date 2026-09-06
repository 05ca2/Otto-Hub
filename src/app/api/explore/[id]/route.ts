// Single explore item detail. Resolves either a public generation (cheatsheet/summary)
// or a public community post, returning a unified shape so the detail page can render
// both uniformly. Includes votes, author, and (for posts) comments.

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Params { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const db = getDb();
  const id = params.id;

  const score = (targetType: string, targetId: string) =>
    (db.prepare(`SELECT COALESCE(SUM(value), 0) AS s FROM votes WHERE target_type = ? AND target_id = ?`).get(targetType, targetId) as { s: number }).s;
  const myVote = (targetType: string, targetId: string) =>
    (db.prepare(`SELECT value FROM votes WHERE user_id = ? AND target_type = ? AND target_id = ?`).get(user.id, targetType, targetId) as { value: number } | undefined)?.value || 0;

  // 1) Generations (cheatsheets / summaries) — the original explore content.
  const gen = db
    .prepare(
      `SELECT g.id, g.kind, g.content, g.created_at, g.visibility,
              d.title AS doc_title,
              u.id AS author_id, u.name AS author_name, u.image AS author_image
       FROM generations g
       JOIN documents d ON d.id = g.document_id
       JOIN users u ON u.id = g.user_id
       WHERE g.id = ?`,
    )
    .get(id) as
    | { id: string; kind: string; content: string; created_at: number; visibility: string; doc_title: string; author_id: string; author_name: string; author_image: string | null }
    | undefined;

  if (gen) {
    if (gen.visibility !== 'public') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({
      type: 'generation',
      item: {
        id: gen.id,
        kind: gen.kind,
        title: gen.doc_title,
        content: gen.content,
        created_at: gen.created_at,
        author_id: gen.author_id,
        author_name: gen.author_name,
        author_image: gen.author_image,
        score: score('cheatsheet', gen.id),
        my_vote: myVote('cheatsheet', gen.id),
        comment_count: 0,
        tags: null,
        visibility: gen.visibility,
      },
      comments: [],
    });
  }

  // 2) Community posts (manual "New Post" content).
  const post = db
    .prepare(
      `SELECT p.id, p.title, p.body, p.tags, p.visibility, p.created_at,
              u.id AS author_id, u.name AS author_name, u.image AS author_image
       FROM posts p JOIN users u ON u.id = p.author_id
       WHERE p.id = ?`,
    )
    .get(id) as
    | { id: string; title: string; body: string; tags: string | null; visibility: string; created_at: number; author_id: string; author_name: string; author_image: string | null }
    | undefined;

  if (post) {
    if (post.visibility !== 'public') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const comments = db
      .prepare(
        `SELECT c.id, c.body, c.created_at, c.parent_id,
                u.id AS author_id, u.name AS author_name, u.image AS author_image
         FROM comments c JOIN users u ON u.id = c.author_id
         WHERE c.post_id = ? ORDER BY c.created_at ASC`,
      )
      .all(id) as Array<{ id: string; body: string; created_at: number; parent_id: string | null; author_id: string; author_name: string; author_image: string | null }>;
    return NextResponse.json({
      type: 'post',
      item: {
        id: post.id,
        kind: 'post',
        title: post.title,
        content: post.body,
        created_at: post.created_at,
        author_id: post.author_id,
        author_name: post.author_name,
        author_image: post.author_image,
        score: score('post', post.id),
        my_vote: myVote('post', post.id),
        comment_count: comments.length,
        tags: post.tags ? (JSON.parse(post.tags) as string[]) : [],
        visibility: post.visibility,
      },
      comments: comments.map((c) => ({
        ...c,
        score: score('comment', c.id),
        my_vote: myVote('comment', c.id),
      })),
    });
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
