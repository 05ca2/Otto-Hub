import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PostBody = z.object({
  documentId: z.string().min(1),
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
});

const GetQuery = z.object({
  documentId: z.string().min(1),
  limit: z.coerce.number().int().positive().max(200).optional(),
});

export async function GET(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }

  const { searchParams } = new URL(req.url);
  const parsed = GetQuery.safeParse({
    documentId: searchParams.get('documentId'),
    limit: searchParams.get('limit'),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
  }

  const db = getDb();
  const limit = parsed.data.limit ?? 100;
  const messages = db
    .prepare(`SELECT * FROM chat_history WHERE user_id = ? AND document_id = ? ORDER BY created_at ASC LIMIT ?`)
    .all(user.id, parsed.data.documentId, limit);

  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }

  const json = await req.json().catch(() => null);
  const parsed = PostBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { documentId, role, content } = parsed.data;
  const id = crypto.randomUUID();
  const created_at = Date.now();

  const db = getDb();
  db.prepare(
    `INSERT INTO chat_history (id, user_id, document_id, role, content, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, user.id, documentId, role, content, created_at);

  return NextResponse.json({ id, created_at });
}

export async function DELETE(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }

  const { searchParams } = new URL(req.url);
  const documentId = searchParams.get('documentId');
  if (!documentId) {
    return NextResponse.json({ error: 'documentId required' }, { status: 400 });
  }

  const db = getDb();
  db.prepare(`DELETE FROM chat_history WHERE user_id = ? AND document_id = ?`).run(user.id, documentId);

  return NextResponse.json({ ok: true });
}
