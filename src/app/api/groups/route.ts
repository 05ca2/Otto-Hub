import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function genInviteCode(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

const CreateBody = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
  privacy: z.enum(['public', 'private']).default('public'),
});

export async function GET() {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const db = getDb();
  const mine = db.prepare(
    `SELECT g.*, gm.role,
      (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) AS member_count,
      u.name AS owner_name, u.image AS owner_image, u.avatar_frame AS owner_avatar_frame
     FROM groups g
     JOIN group_members gm ON gm.group_id = g.id
     JOIN users u ON u.id = g.owner_id
     WHERE gm.user_id = ?
     ORDER BY g.created_at DESC`
  ).all(user.id) as any[];
  const publicGroups = db.prepare(
    `SELECT g.*,
      (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) AS member_count,
      u.name AS owner_name, u.image AS owner_image, u.avatar_frame AS owner_avatar_frame
     FROM groups g
     JOIN users u ON u.id = g.owner_id
     WHERE g.privacy = 'public' AND g.id NOT IN (SELECT group_id FROM group_members WHERE user_id = ?)
     ORDER BY g.created_at DESC LIMIT 50`
  ).all(user.id) as any[];
  return NextResponse.json({ mine, publicGroups });
}

export async function POST(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const json = await req.json().catch(() => null);
  const parsed = CreateBody.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const db = getDb();
  const id = nanoid(12);
  const now = Date.now();
  let inviteCode: string | null = null;
  if (parsed.data.privacy === 'private') {
    inviteCode = genInviteCode();
    for (let i = 0; i < 5; i++) {
      if (!db.prepare('SELECT 1 FROM groups WHERE invite_code = ?').get(inviteCode)) break;
      inviteCode = genInviteCode();
    }
  }
  db.prepare(
    'INSERT INTO groups (id, owner_id, name, description, privacy, invite_code, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, user.id, parsed.data.name, parsed.data.description || null, parsed.data.privacy, inviteCode, now);
  db.prepare('INSERT INTO group_members (group_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)').run(id, user.id, 'owner', now);
  return NextResponse.json({ id, invite_code: inviteCode });
}
