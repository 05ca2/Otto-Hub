import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getDb, type DocumentRow } from '@/lib/db';
import { extractFromBuffer } from '@/lib/extract';
import { requireUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, title, source_type, mime, size, created_at, length(content) AS content_length
       FROM documents WHERE user_id = ? ORDER BY created_at DESC`,
    )
    .all(user.id) as Array<Omit<DocumentRow, 'content' | 'user_id'>>;
  return NextResponse.json({ documents: rows });
}

export async function POST(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file uploaded (field name must be "file")' }, { status: 400 });
  }
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 25MB)' }, { status: 413 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const extracted = await extractFromBuffer(file.name, file.type || '', buf);
  if (!extracted.content || extracted.content.trim().length < 10) {
    return NextResponse.json(
      { error: 'Could not extract any text from this file. Is it scanned/image-only?' },
      { status: 422 },
    );
  }
  const id = nanoid(12);
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO documents (id, user_id, title, source_type, mime, size, content, created_at)
       VALUES (?, ?, 'upload', ?, ?, ?, ?, ?)`,
    )
    .run(id, user.id, extracted.title, extracted.mime, file.size, extracted.content, now);
  return NextResponse.json({
    id,
    title: extracted.title,
    content_length: extracted.content.length,
  });
}
