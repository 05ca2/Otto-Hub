import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { nanoid } from 'nanoid';

// POST /api/reports - Report a post
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { post_id, reason } = await req.json();
  if (!post_id || !reason) return NextResponse.json({ error: 'Missing post_id or reason' }, { status: 400 });

  const db = getDb();
  // Check post exists
  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(post_id) as { id: string } | undefined;
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

  // Check duplicate report
  const existing = db.prepare('SELECT id FROM reports WHERE reporter_id = ? AND post_id = ?').get(user.id, post_id) as { id: string } | undefined;
  if (existing) return NextResponse.json({ error: 'Already reported' }, { status: 409 });

  const id = nanoid();
  db.prepare('INSERT INTO reports (id, reporter_id, post_id, reason, created_at) VALUES (?, ?, ?, ?, ?)').run(id, user.id, post_id, reason, Date.now());

  // Also create a violation record so admins see it in the violations section
  try {
    db.prepare('INSERT INTO violations (id, post_id, author_id, reason, content_preview, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(nanoid(), post_id, user.id, reason, reason.slice(0, 200), 'user_report', Date.now());
  } catch {}

  return NextResponse.json({ ok: true, id });
}

// GET /api/reports - List reports (admin only)
export async function GET() {
  const user = await getSessionUser();
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = getDb();
  const reports = db.prepare(`
    SELECT r.*, u.name as reporter_name, u.email as reporter_email, p.title as post_title
    FROM reports r
    JOIN users u ON r.reporter_id = u.id
    LEFT JOIN posts p ON r.post_id = p.id
    ORDER BY r.created_at DESC
    LIMIT 200
  `).all();

  return NextResponse.json({ reports });
}

// PATCH /api/reports - Update report status (admin only)
export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id, status, admin_note } = await req.json();
  if (!id || !status) return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });

  const validStatuses = ['pending', 'reviewed', 'dismissed'];
  if (!validStatuses.includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });

  const db = getDb();
  if (admin_note) {
    db.prepare('UPDATE reports SET status = ?, admin_note = ? WHERE id = ?').run(status, admin_note, id);
  } else {
    db.prepare('UPDATE reports SET status = ? WHERE id = ?').run(status, id);
  }

  return NextResponse.json({ ok: true });
}
