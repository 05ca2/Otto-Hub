import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getDb, type DocumentRow } from '@/lib/db';
import { extractFromBuffer } from '@/lib/extract';
import { requireUser } from '@/lib/auth';
import { syncDocument } from '@/lib/github-sync';

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
  
  // Support both single file (field "file") and multiple files (field "files")
  const singleFile = form.get('file');
  const multipleFiles = form.getAll('files');
  
  let files: File[] = [];
  if (multipleFiles.length > 0 && multipleFiles[0] instanceof File) {
    files = multipleFiles.filter((f): f is File => f instanceof File);
  } else if (singleFile instanceof File) {
    files = [singleFile];
  }
  
  if (files.length === 0) {
    return NextResponse.json({ error: 'No files uploaded (field name must be "file" or "files")' }, { status: 400 });
  }

  // Validate all files
  for (const file of files) {
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: `File "${file.name}" too large (max 25MB)` }, { status: 413 });
    }
  }

  // Extract content from all files
  const extractedParts: string[] = [];
  const fileNames: string[] = [];
  
  for (const file of files) {
    const buf = Buffer.from(await file.arrayBuffer());
    const extracted = await extractFromBuffer(file.name, file.type || '', buf);
    if (extracted.content && extracted.content.trim().length > 10) {
      extractedParts.push(extracted.content.trim());
      fileNames.push(file.name);
    }
  }

  if (extractedParts.length === 0) {
    return NextResponse.json(
      { error: 'Could not extract any text from the uploaded files.' },
      { status: 422 },
    );
  }

  // Combine content with separators
  const combinedContent = extractedParts
    .map((content, i) => `=== ${fileNames[i]} ===\n\n${content}`)
    .join('\n\n\n');

  // Generate title from file names
  let title: string;
  if (fileNames.length === 1) {
    title = fileNames[0].replace(/\.[^.]+$/, '').slice(0, 200) || 'Untitled';
  } else {
    title = `${fileNames[0].replace(/\.[^.]+$/, '')} 等 ${fileNames.length} 个文件`;
  }

  const id = nanoid(12);
  const now = Date.now();
  
  getDb()
    .prepare(
      `INSERT INTO documents (id, user_id, title, source_type, mime, size, content, created_at)
       VALUES (?, ?, 'upload', ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      user.id,
      title,
      fileNames.join(', '),
      files.reduce((sum, f) => sum + f.size, 0),
      combinedContent,
      now,
    );

  // Fire-and-forget: sync anonymized document to GitHub repo
  syncDocument({
    docId: id,
    userId: user.id,
    title,
    sourceType: 'upload',
    content: combinedContent,
    mime: fileNames.join(', '),
    createdAt: now,
  }).catch(() => {});

  return NextResponse.json({
    id,
    title,
    content_length: combinedContent.length,
    file_count: fileNames.length,
  });
}
