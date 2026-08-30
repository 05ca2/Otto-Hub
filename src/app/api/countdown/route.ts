import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getDb, type CountdownEventRow } from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET - list user's countdown events
export async function GET() {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const db = getDb();
  const events = db
    .prepare('SELECT * FROM countdown_events WHERE user_id = ? ORDER BY event_date ASC')
    .all(user.id) as CountdownEventRow[];
  return NextResponse.json({ events });
}

// POST - create countdown event
export async function POST(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const { title, event_date, color } = await req.json();
  if (!title || !event_date) {
    return NextResponse.json({ error: 'title and event_date required' }, { status: 400 });
  }
  const db = getDb();
  const id = nanoid();
  db.prepare(
    'INSERT INTO countdown_events (id, user_id, title, event_date, color, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(id, user.id, title, event_date, color || 'accent', Date.now());
  return NextResponse.json({ id });
}

// DELETE - remove countdown event
export async function DELETE(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const db = getDb();
  db.prepare('DELETE FROM countdown_events WHERE id = ? AND user_id = ?').run(id, user.id);
  return NextResponse.json({ ok: true });
}