import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PostBody = z.object({
  generationId: z.string().min(1),
  questionIndex: z.number().int().nonnegative(),
  userAnswer: z.string(),
  isCorrect: z.boolean(),
});

const GetQuery = z.object({
  generationId: z.string().min(1),
});

export async function GET(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }

  const { searchParams } = new URL(req.url);
  const parsed = GetQuery.safeParse({
    generationId: searchParams.get('generationId'),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
  }

  const db = getDb();
  const progress = db
    .prepare(`SELECT * FROM quiz_progress WHERE user_id = ? AND generation_id = ? ORDER BY question_index ASC`)
    .all(user.id, parsed.data.generationId);

  return NextResponse.json({ progress });
}

export async function POST(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }

  const json = await req.json().catch(() => null);
  const parsed = PostBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { generationId, questionIndex, userAnswer, isCorrect } = parsed.data;
  const id = `${user.id}_${generationId}_${questionIndex}`;
  const completed_at = Date.now();

  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO quiz_progress (id, user_id, generation_id, question_index, user_answer, is_correct, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, user.id, generationId, questionIndex, userAnswer, isCorrect ? 1 : 0, completed_at);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }

  const { searchParams } = new URL(req.url);
  const generationId = searchParams.get('generationId');
  if (!generationId) {
    return NextResponse.json({ error: 'generationId required' }, { status: 400 });
  }

  const db = getDb();
  db.prepare(`DELETE FROM quiz_progress WHERE user_id = ? AND generation_id = ?`).run(user.id, generationId);

  return NextResponse.json({ ok: true });
}
