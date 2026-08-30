import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { getDb, type AnnouncementRow } from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CreateBody = z.object({
  title: z.string().min(2).max(200),
  body: z.string().min(2).max(20000),
  roomId: z.string().nullable().optional(),
  isPinned: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const url = new URL(req.url);
  const roomId = url.searchParams.get('roomId');
  const db = getDb();

  // Default scope: global admin announcements. roomId scope: that room's announcements
  // (must be a member to see them).
  let rows: Array<AnnouncementRow & { author_name: string; author_image: string | null }>;
  if (roomId) {
    const member = db.prepare(`SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?`).get(roomId, user.id);
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    rows = db
      .prepare(
        `SELECT a.*, u.name AS author_name, u.image AS author_image
         FROM announcements a JOIN users u ON u.id = a.author_id
         WHERE a.room_id = ?
         ORDER BY a.is_pinned DESC, a.created_at DESC
         LIMIT 200`,
      )
      .all(roomId) as Array<AnnouncementRow & { author_name: string; author_image: string | null }>;
  } else {
    rows = db
      .prepare(
        `SELECT a.*, u.name AS author_name, u.image AS author_image
         FROM announcements a JOIN users u ON u.id = a.author_id
         WHERE a.room_id IS NULL
         ORDER BY a.is_pinned DESC, a.created_at DESC
         LIMIT 200`,
      )
      .all() as Array<AnnouncementRow & { author_name: string; author_image: string | null }>;
  }

  return NextResponse.json({ announcements: rows });
}

export async function POST(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const json = await req.json().catch(() => null);
  const parsed = CreateBody.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request', details: parsed.error.format() }, { status: 400 });
  const { title, body, roomId, isPinned } = parsed.data;

  // Admin can post anywhere (global or any room). Otherwise the caller must be
  // the owner of the target room to post a room announcement.
  if (roomId) {
    if (user.role !== 'admin') {
      const owner = getDb()
        .prepare(`SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ? AND role = 'owner'`)
        .get(roomId, user.id);
      if (!owner) return NextResponse.json({ error: 'Only the room owner or an admin can post here' }, { status: 403 });
    }
  } else {
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can post global announcements' }, { status: 403 });
    }
  }

  const id = nanoid(12);
  getDb()
    .prepare(
      `INSERT INTO announcements (id, author_id, room_id, title, body, is_pinned, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, user.id, roomId || null, title, body, isPinned ? 1 : 0, Date.now());
  return NextResponse.json({ id });
}