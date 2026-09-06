import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb, type DocumentRow } from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Params { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const db = getDb();
  const doc = db
    .prepare(`SELECT * FROM documents WHERE id = ?`)
    .get(params.id) as DocumentRow | undefined;
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const generations = db
    .prepare(`SELECT * FROM generations WHERE document_id = ? ORDER BY created_at DESC`)
    .all(params.id);
  const annotations = db
    .prepare(`SELECT * FROM annotations WHERE document_id = ? ORDER BY start_offset ASC`)
    .all(params.id);
  const qa = db
    .prepare(`SELECT * FROM qa_history WHERE document_id = ? ORDER BY created_at DESC LIMIT 100`)
    .all(params.id);

  return NextResponse.json({ document: doc, generations, annotations, qa });
}

const PatchBody = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const json = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const db = getDb();
  const doc = db.prepare(`SELECT * FROM documents WHERE id = ?`).get(params.id) as DocumentRow | undefined;
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (doc.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  
  const updates: string[] = [];
  const values: (string | number)[] = [];
  if (parsed.data.title !== undefined) {
    updates.push('title = ?');
    values.push(parsed.data.title);
  }
  if (parsed.data.description !== undefined) {
    updates.push('description = ?');
    values.push(parsed.data.description);
  }
  if (updates.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  
  values.push(params.id);
  db.prepare(`UPDATE documents SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  const updated = db.prepare(`SELECT * FROM documents WHERE id = ?`).get(params.id) as DocumentRow;
  return NextResponse.json({ document: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const db = getDb();
  db.prepare(`DELETE FROM documents WHERE id = ?`).run(params.id);
  return NextResponse.json({ ok: true });
}
