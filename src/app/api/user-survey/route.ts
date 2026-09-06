import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SurveyBody = z.object({
  grade: z.string().max(100).optional().default(''),
  role: z.enum(['student', 'teacher', 'self_learner', 'other']),
  purpose: z.string().max(500).optional().default(''),
});

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const json = await req.json().catch(() => null);
  const p = SurveyBody.safeParse(json);
  if (!p.success) return NextResponse.json({ error: 'Invalid input', details: p.error.format() }, { status: 400 });

  const db = getDb();

  // Upsert: one survey per user
  const existing = db.prepare('SELECT id FROM user_surveys WHERE user_id = ?').get(user.id);
  if (existing) {
    db.prepare('UPDATE user_surveys SET grade = ?, role = ?, purpose = ? WHERE user_id = ?')
      .run(p.data.grade, p.data.role, p.data.purpose, user.id);
  } else {
    db.prepare('INSERT INTO user_surveys (id, user_id, grade, role, purpose, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(nanoid(12), user.id, p.data.grade, p.data.role, p.data.purpose, Date.now());
  }

  return NextResponse.json({ success: true });
}

// GET: super_admin can fetch all surveys, regular user can fetch own
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const db = getDb();
  const isSuperAdmin = user.role === 'super_admin' || user.email === 'freshpinapple20120518@outlook.com';

  if (isSuperAdmin) {
    const surveys = db.prepare(`
      SELECT s.*, u.name as user_name, u.email as user_email
      FROM user_surveys s
      LEFT JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
    `).all();
    return NextResponse.json({ surveys, is_super_admin: true });
  }

  const survey = db.prepare('SELECT * FROM user_surveys WHERE user_id = ?').get(user.id);
  return NextResponse.json({ survey: survey || null, is_super_admin: false });
}
