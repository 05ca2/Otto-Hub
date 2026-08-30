import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb, type AnnouncementRow } from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Params { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const db = getDb();
  const row = db
    .prepare(
      `SELECT a.*, u.name AS author_name, u.image AS author_image
       FROM announcements a JOIN users u ON u.id = a.author_id
       WHERE a.id = ?`,
    )
    .get(params.id) as (AnnouncementRow & { author_name: string; author_image: string | null }) | undefined;
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Room-scoped announcements require membership; global ones are open to any signed-in user.
  if (row.room_id) {
    const member = db.prepare(`SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?`).get(row.room_id, user.id);
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ announcement: row });
}

const PatchBody = z.object({
  title: z.string().min(2).max(200).optional(),
  body: z.string().min(2).max(20000).optional(),
  isPinned: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const json = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  if (parsed.data.title === undefined && parsed.data.body === undefined && parsed.data.isPinned === undefined) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }
  const db = getDb();
  const row = db.prepare(`SELECT * FROM announcements WHERE id = ?`).get(params.id) as AnnouncementRow | undefined;
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (row.author_id !== user.id && user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const sets: string[] = [];
  const values: Array<string | number | null> = [];
  if (parsed.data.title !== undefined) { sets.push('title = ?'); values.push(parsed.data.title); }
  if (parsed.data.body !== undefined) { sets.push('body = ?'); values.push(parsed.data.body); }
  if (parsed.data.isPinned !== undefined) { sets.push('is_pinned = ?'); values.push(parsed.data.isPinned ? 1 : 0); }
  values.push(row.id);
  db.prepare(`UPDATE announcements SET ${sets.join(', ')} WHERE id = ?`).run(...values);

  const updated = db.prepare(`SELECT * FROM announcements WHERE id = ?`).get(row.id) as AnnouncementRow;
  return NextResponse.json({ announcement: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const db = getDb();
  const row = db.prepare(`SELECT * FROM announcements WHERE id = ?`).get(params.id) as AnnouncementRow | undefined;
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (row.author_id !== user.id && user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  db.prepare(`DELETE FROM announcements WHERE id = ?`).run(row.id);
  return NextResponse.json({ ok: true });
}