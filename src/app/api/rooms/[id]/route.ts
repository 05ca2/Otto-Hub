import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb, type RoomRow } from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Params { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const db = getDb();
  const room = db.prepare(`SELECT * FROM rooms WHERE id = ?`).get(params.id) as RoomRow | undefined;
  if (!room) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const isMember = db.prepare(`SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?`).get(room.id, user.id);
  if (!isMember && !room.is_public) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const members = db
    .prepare(
      `SELECT u.id, u.name, u.image, u.avatar_frame, rm.role, rm.joined_at
       FROM room_members rm JOIN users u ON u.id = rm.user_id
       WHERE rm.room_id = ?
       ORDER BY rm.role ASC, rm.joined_at ASC`,
    )
    .all(room.id);
  return NextResponse.json({ room, members, isMember: Boolean(isMember) });
}

const JoinBody = z.object({ invite_code: z.string().min(4).max(20) });
export async function POST(req: NextRequest, { params }: Params) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const json = await req.json().catch(() => null);
  const parsed = JoinBody.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const db = getDb();
  const room = db.prepare(`SELECT * FROM rooms WHERE id = ?`).get(params.id) as RoomRow | undefined;
  if (!room) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (room.invite_code !== parsed.data.invite_code) return NextResponse.json({ error: 'Wrong invite code' }, { status: 403 });
  const already = db.prepare(`SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?`).get(room.id, user.id);
  if (already) return NextResponse.json({ ok: true, already: true });
  db.prepare(`INSERT INTO room_members (room_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)`).run(room.id, user.id, Date.now());
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const db = getDb();
  const room = db.prepare(`SELECT * FROM rooms WHERE id = ?`).get(params.id) as RoomRow | undefined;
  if (!room) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  
  const url = new URL(req.url);
  const dissolve = url.searchParams.get('dissolve') === 'true';
  
  if (dissolve) {
    // Owner or admin can dissolve the room
    const member = db.prepare(`SELECT role FROM room_members WHERE room_id = ? AND user_id = ?`).get(params.id, user.id) as { role: string } | undefined;
    const isAdmin = db.prepare(`SELECT role FROM users WHERE id = ?`).get(user.id) as { role: string | null } | undefined;
    if (!member || (member.role !== 'owner' && isAdmin?.role !== 'admin')) {
      return NextResponse.json({ error: 'Only the room owner or admin can dissolve the room' }, { status: 403 });
    }
    // Delete the room and cascade (members, posts in room)
    db.prepare(`DELETE FROM rooms WHERE id = ?`).run(params.id);
    return NextResponse.json({ ok: true, dissolved: true });
  }
  
  // Normal leave
  db.prepare(`DELETE FROM room_members WHERE room_id = ? AND user_id = ?`).run(params.id, user.id);
  
  // Auto-dissolve: if no members left, delete the room
  const remaining = db.prepare(`SELECT COUNT(*) AS c FROM room_members WHERE room_id = ?`).get(params.id) as { c: number };
  if (remaining.c === 0) {
    db.prepare(`DELETE FROM rooms WHERE id = ?`).run(params.id);
    return NextResponse.json({ ok: true, dissolved: true });
  }
  
  return NextResponse.json({ ok: true });
}
