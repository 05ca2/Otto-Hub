import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { getDb, type DocumentRow } from '@/lib/db';
import { chatStream, isConfigured } from '@/lib/ai';
import { EXPLAIN_SYSTEM } from '@/lib/prompts';
import { truncateForContext } from '@/lib/chunks';
import { requireUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  documentId: z.string().min(1),
  annotationId: z.string().optional(),
  quoted: z.string().min(1).max(4000),
  startOffset: z.number().int().nonnegative(),
  endOffset: z.number().int().nonnegative(),
  question: z.string().min(1).max(2000),
  provider: z.enum(['sensenova', 'openrouter', 'custom']).optional(),
});

export async function POST(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.format() }, { status: 400 });
  }
  const { documentId, annotationId, quoted, startOffset, endOffset, question, provider } = parsed.data;

  if (!isConfigured(provider)) {
    return NextResponse.json(
      { error: 'AI not configured. Add an API key in Settings.' },
      { status: 412 },
    );
  }

  const db = getDb();
  const doc = db
    .prepare(`SELECT * FROM documents WHERE id = ? AND user_id = ?`)
    .get(documentId, user.id) as DocumentRow | undefined;
  if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

  const WIN = 2500;
  const start = Math.max(0, startOffset - WIN);
  const end = Math.min(doc.content.length, endOffset + WIN);
  const before = doc.content.slice(start, startOffset);
  const highlight = doc.content.slice(startOffset, endOffset);
  const after = doc.content.slice(endOffset, end);
  const tight = `${before}<<<${highlight}>>>${after}`;
  const ctx = truncateForContext(tight, 10_000);

  const userMsg = `Document title: ${doc.title}\n\n` +
    `Highlighted passage (between <<< and >>>):\n${ctx}\n\n` +
    `Student question: ${question}`;

  const encoder = new TextEncoder();
  let fullAnswer = '';

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const id = nanoid(12);
        
        for await (const chunk of chatStream(
          [
            { role: 'system', content: EXPLAIN_SYSTEM },
            { role: 'user', content: userMsg },
          ],
          { temperature: 0.2, provider },
        )) {
          fullAnswer += chunk;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk, done: false })}\n\n`));
        }

        // Save to database after streaming completes
        db.prepare(
          `INSERT INTO qa_history (id, user_id, document_id, annotation_id, question, answer, citations, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          id,
          user.id,
          documentId,
          annotationId ?? null,
          question,
          fullAnswer,
          JSON.stringify([{ quote: quoted, start: startOffset, end: endOffset }]),
          Date.now(),
        );

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ id, done: true })}\n\n`));
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'AI request failed';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
