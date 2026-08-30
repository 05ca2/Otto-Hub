import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { getDb, type RoomRow } from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
  is_public: z.boolean().default(false),
});

function genInviteCode(): string {
  // 6-char base32, easy to type
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

export async function GET() {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const db = getDb();
  const mine = db
    .prepare(
      `SELECT r.*, rm.role,
        (SELECT COUNT(*) FROM room_members WHERE room_id = r.id) AS member_count
       FROM rooms r JOIN room_members rm ON rm.room_id = r.id
       WHERE rm.user_id = ?
       ORDER BY r.created_at DESC`,
    )
    .all(user.id) as Array<RoomRow & { role: string; member_count: number }>;
  const publicRooms = db
    .prepare(
      `SELECT r.*,
        (SELECT COUNT(*) FROM room_members WHERE room_id = r.id) AS member_count
       FROM rooms r
       WHERE r.is_public = 1 AND r.id NOT IN (SELECT room_id FROM room_members WHERE user_id = ?)
       ORDER BY r.created_at DESC LIMIT 50`,
    )
    .all(user.id) as Array<RoomRow & { member_count: number }>;
  return NextResponse.json({ mine, publicRooms });
}

export async function POST(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const db = getDb();
  const id = nanoid(12);
  // Try a few codes in case of clash
  let invite = genInviteCode();
  for (let i = 0; i < 5; i++) {
    if (!db.prepare(`SELECT 1 FROM rooms WHERE invite_code = ?`).get(invite)) break;
    invite = genInviteCode();
  }
  const now = Date.now();
  db.prepare(
    `INSERT INTO rooms (id, owner_id, name, description, invite_code, is_public, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, user.id, parsed.data.name, parsed.data.description || null, invite, parsed.data.is_public ? 1 : 0, now);
  db.prepare(`INSERT INTO room_members (room_id, user_id, role, joined_at) VALUES (?, ?, 'owner', ?)`).run(id, user.id, now);
  return NextResponse.json({ id, invite_code: invite });
}
