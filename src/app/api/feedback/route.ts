import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FeedbackBody = z.object({
  category: z.enum(['experience', 'bug', 'feature', 'other']).default('experience'),
  title: z.string().min(2).max(200),
  content: z.string().min(5).max(5000),
});

export async function POST(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const json = await req.json().catch(() => null);
  const parsed = FeedbackBody.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request', details: parsed.error.format() }, { status: 400 });
  const { category, title, content } = parsed.data;
  const id = nanoid(12);
  getDb().prepare(
    `INSERT INTO feedbacks (id, user_id, category, title, content, status, admin_reply, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', NULL, ?)`
  ).run(id, user.id, category, title, content, Date.now());
  return NextResponse.json({ id, ok: true });
}

export async function GET(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  const db = getDb();
  const feedbacks = db.prepare(`
    SELECT f.*, u.name AS user_name, u.email AS user_email
    FROM feedbacks f JOIN users u ON u.id = f.user_id
    ORDER BY f.created_at DESC LIMIT 200
  `).all();
  return NextResponse.json({ feedbacks });
}
