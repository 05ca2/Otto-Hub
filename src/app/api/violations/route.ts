import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

// GET /api/violations - List violations (admin only)
export async function GET() {
  const user = await getSessionUser();
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = getDb();
  const violations = db.prepare(`
    SELECT v.*, u.name as author_name, u.email as author_email
    FROM violations v
    JOIN users u ON v.author_id = u.id
    ORDER BY v.created_at DESC
    LIMIT 200
  `).all();

  return NextResponse.json({ violations });
}

// PATCH /api/violations - Update violation status (admin only)
export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id, status } = await req.json();
  if (!id || !status) return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });

  const validStatuses = ['active', 'acknowledged', 'dismissed'];
  if (!validStatuses.includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });

  const db = getDb();
  db.prepare('UPDATE violations SET status = ? WHERE id = ?').run(status, id);

  return NextResponse.json({ ok: true });
}
