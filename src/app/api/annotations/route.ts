import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { getDb, type DocumentRow } from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  documentId: z.string().min(1),
  startOffset: z.number().int().nonnegative(),
  endOffset: z.number().int().nonnegative(),
  quoted: z.string().min(1).max(4000),
  color: z.enum(['yellow', 'green', 'pink', 'blue']).default('yellow'),
  note: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.format() }, { status: 400 });
  }
  const { documentId, startOffset, endOffset, quoted, color, note } = parsed.data;
  const db = getDb();
  const doc = db.prepare(`SELECT id FROM documents WHERE id = ? AND user_id = ?`).get(documentId, user.id) as
    | Pick<DocumentRow, 'id'>
    | undefined;
  if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

  const id = nanoid(12);
  db.prepare(
    `INSERT INTO annotations (id, user_id, document_id, start_offset, end_offset, quoted, color, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, user.id, documentId, startOffset, endOffset, quoted, color, note ?? null, Date.now());
  return NextResponse.json({ id });
}

export async function GET(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const url = new URL(req.url);
  const documentId = url.searchParams.get('documentId');
  if (!documentId) return NextResponse.json({ error: 'documentId required' }, { status: 400 });
  const rows = getDb()
    .prepare(`SELECT * FROM annotations WHERE user_id = ? AND document_id = ? ORDER BY start_offset ASC`)
    .all(user.id, documentId);
  return NextResponse.json({ annotations: rows });
}

const DeleteBody = z.object({ id: z.string().min(1) });
export async function DELETE(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const json = await req.json().catch(() => null);
  const parsed = DeleteBody.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const db = getDb();
  const r = db.prepare(`DELETE FROM annotations WHERE id = ? AND user_id = ?`).run(parsed.data.id, user.id);
  if (r.changes === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
