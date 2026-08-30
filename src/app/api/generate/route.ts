import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { getDb, type DocumentRow } from '@/lib/db';
import { chat, isConfigured } from '@/lib/ai';
import { CHEATSHEET_SYSTEM, QUESTIONS_SYSTEM, SUMMARY_SYSTEM } from '@/lib/prompts';
import { truncateForContext } from '@/lib/chunks';
import { requireUser } from '@/lib/auth';
import { deductCredits, getCredits } from '@/lib/credits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  documentId: z.string().min(1),
  kind: z.enum(['cheatsheet', 'questions', 'summary']),
  instructions: z.string().optional(),
  provider: z.enum(['sensenova', 'openrouter', 'custom']).optional(),
  questionCount: z.number().min(1).max(30).optional(),
  visibility: z.enum(['private', 'public', 'room']).optional(),
  roomId: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.format() }, { status: 400 });
  }
  const { documentId, kind, instructions, provider, questionCount, visibility, roomId } = parsed.data;

  // Credit gating: admin bypass, otherwise deduct by kind
  const db = getDb();
  const u = db
    .prepare('SELECT role FROM users WHERE id = ?')
    .get(user.id) as { role: string | null };
  const cost = kind === 'cheatsheet' ? 20 : kind === 'summary' ? 10 : 10;
  if (u.role !== 'admin') {
    const result = deductCredits(user.id, cost);
    if (!result.ok) {
      return NextResponse.json(
        {
          error: `Not enough credits. Need ${cost}, have ${result.remaining}. Credits reset daily.`,
          credits: result.remaining,
        },
        { status: 429 },
      );
    }
  }

  if (!isConfigured(provider)) {
    return NextResponse.json(
      { error: 'AI not configured. Add an API key in Settings.' },
      { status: 412 },
    );
  }

  const doc = db
    .prepare(`SELECT * FROM documents WHERE id = ? AND user_id = ?`)
    .get(documentId, user.id) as DocumentRow | undefined;
  if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

  const ctx = truncateForContext(doc.content, 28_000);
  const questionCountHint = kind === 'questions' && questionCount 
    ? `\n\n---\n\nIMPORTANT: Generate EXACTLY ${questionCount} questions.`
    : '';
  const userMsg = `Source title: ${doc.title}\n\n---\n\n${ctx}${
    instructions ? `\n\n---\n\nAdditional instructions: ${instructions}` : ''
  }${questionCountHint}`;

  let system = CHEATSHEET_SYSTEM;
  let wantJson = false;
  if (kind === 'questions') {
    system = QUESTIONS_SYSTEM;
    wantJson = true;
  } else if (kind === 'summary') {
    system = SUMMARY_SYSTEM;
  }

  try {
    const text = await chat(
      [
        { role: 'system', content: system },
        { role: 'user', content: userMsg },
      ],
      { json: wantJson, temperature: 0.3, provider },
    );
    const id = nanoid(12);
    db.prepare(
      `INSERT INTO generations (id, user_id, document_id, kind, prompt, content, meta, visibility, room_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id, user.id, documentId, kind, instructions ?? null, text,
      JSON.stringify({ provider: provider || 'default' }),
      visibility || 'private',
      visibility === 'room' ? (roomId || null) : null,
      Date.now(),
    );

    return NextResponse.json({
      id,
      kind,
      content: text,
      visibility: visibility || 'private',
      credits: getCredits(user.id),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI request failed';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
