// Public cheatsheet feed. Returns generations with visibility = 'public',
// joined with author + source document title, sorted by score/recency.

import { NextRequest, NextResponse } from 'next/server';
import { getDb, type GenerationRow } from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const url = new URL(req.url);
  const kind = url.searchParams.get('kind') || 'cheatsheet';
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT g.id, g.kind, g.content, g.created_at, g.document_id,
              d.title AS doc_title,
              u.id AS author_id, u.name AS author_name, u.image AS author_image,
              COALESCE((SELECT SUM(value) FROM votes v WHERE v.target_type = 'cheatsheet' AND v.target_id = g.id), 0) AS score
       FROM generations g
       JOIN documents d ON d.id = g.document_id
       JOIN users u ON u.id = g.user_id
       WHERE g.visibility = 'public' AND g.kind = ?
       ORDER BY g.created_at DESC LIMIT 200`,
    )
    .all(kind) as Array<GenerationRow & { doc_title: string; author_id: string; author_name: string; author_image: string | null; score: number }>;
  const myVotes = new Map<string, number>();
  for (const r of rows) {
    const v = db.prepare(`SELECT value FROM votes WHERE user_id = ? AND target_type = 'cheatsheet' AND target_id = ?`).get(user.id, r.id) as { value: number } | undefined;
    if (v) myVotes.set(r.id, v.value);
  }
  return NextResponse.json({
    cheatsheets: rows.map((r) => ({ ...r, my_vote: myVotes.get(r.id) || 0 })),
  });
}
