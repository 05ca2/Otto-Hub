import { NextRequest, NextResponse } from 'next/server';
import { getDb, type UserRow } from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Params { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  let me;
  try { me = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const db = getDb();
  const u = db.prepare(`SELECT id, name, email, bio, image, created_at, avatar_frame, wallpaper FROM users WHERE id = ?`).get(params.id) as UserRow | undefined;
  if (!u) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Get wallpaper CSS value
  const wpRow = u.wallpaper ? db.prepare(`SELECT css_value FROM wallpapers WHERE id = ?`).get(u.wallpaper) as { css_value: string } | undefined : undefined;

  const profile = {
    id: u.id, name: u.name, email: u.email, bio: u.bio, image: u.image, created_at: u.created_at,
    avatar_frame: u.avatar_frame || 'none',
    wallpaper: u.wallpaper || 'default',
    wallpaper_css: wpRow?.css_value || '',
    document_count: (db.prepare(`SELECT COUNT(*) AS c FROM documents WHERE user_id = ?`).get(u.id) as { c: number }).c,
    public_cheats: (db.prepare(`SELECT COUNT(*) AS c FROM generations WHERE user_id = ? AND visibility = 'public'`).get(u.id) as { c: number }).c,
    post_count: (db.prepare(`SELECT COUNT(*) AS c FROM posts WHERE author_id = ?`).get(u.id) as { c: number }).c,
  };
  const cheats = db
    .prepare(
      `SELECT g.id, g.kind, g.content, g.created_at, d.title AS doc_title,
              COALESCE((SELECT SUM(value) FROM votes v WHERE v.target_type = 'cheatsheet' AND v.target_id = g.id), 0) AS score
       FROM generations g JOIN documents d ON d.id = g.document_id
       WHERE g.user_id = ? AND g.visibility = 'public'
       ORDER BY g.created_at DESC LIMIT 50`,
    )
    .all(u.id);
  const posts = db
    .prepare(
      `SELECT p.id, p.title, p.body, p.created_at,
              (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,
              COALESCE((SELECT SUM(value) FROM votes v WHERE v.target_type = 'post' AND v.target_id = p.id), 0) AS score
       FROM posts p WHERE p.author_id = ? ORDER BY p.created_at DESC LIMIT 50`,
    )
    .all(u.id);
  return NextResponse.json({ profile, cheats, posts });
}
