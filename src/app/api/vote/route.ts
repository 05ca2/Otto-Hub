import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { trackTask, ensureCredits } from '@/lib/tasks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  target_type: z.enum(['cheatsheet', 'post', 'comment']),
  target_id: z.string().min(1),
  value: z.union([z.literal(1), z.literal(-1), z.literal(0)]),
});

export async function POST(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const { target_type, target_id, value } = parsed.data;
  const db = getDb();
  if (value === 0) {
    db.prepare(`DELETE FROM votes WHERE user_id = ? AND target_type = ? AND target_id = ?`).run(user.id, target_type, target_id);
  } else {
    db.prepare(
      `INSERT INTO votes (user_id, target_type, target_id, value, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (user_id, target_type, target_id) DO UPDATE SET value = excluded.value`,
    ).run(user.id, target_type, target_id, value, Date.now());
  }
  const s = (db.prepare(`SELECT COALESCE(SUM(value),0) AS s FROM votes WHERE target_type = ? AND target_id = ?`).get(target_type, target_id) as { s: number }).s;

  // Track receive_upvote task for post author when upvoted (value=1)
  if (value === 1 && target_type === 'post') {
    const post = db.prepare('SELECT author_id FROM posts WHERE id = ?').get(target_id) as { author_id: string } | undefined;
    if (post) {
      ensureCredits(post.author_id);
      trackTask(post.author_id, 'receive_upvote');
    }
  }

  return NextResponse.json({ score: s, my_vote: value });
}
