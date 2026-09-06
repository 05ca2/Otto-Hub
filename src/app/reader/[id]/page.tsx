import { notFound } from 'next/navigation';
import { getDb, type DocumentRow, type AnnotationRow, type GenerationRow, type QaRow } from '@/lib/db';
import { Reader } from '@/components/Reader';

export const dynamic = 'force-dynamic';

export default function ReaderPage({ params }: { params: { id: string } }) {
  const db = getDb();
  const doc = db.prepare(`SELECT * FROM documents WHERE id = ?`).get(params.id) as
    | DocumentRow
    | undefined;
  if (!doc) notFound();
  const annotations = db
    .prepare(`SELECT * FROM annotations WHERE document_id = ? ORDER BY start_offset ASC`)
    .all(params.id) as AnnotationRow[];
  const generations = db
    .prepare(`SELECT * FROM generations WHERE document_id = ? ORDER BY created_at DESC`)
    .all(params.id) as GenerationRow[];
  const qa = db
    .prepare(`SELECT * FROM qa_history WHERE document_id = ? ORDER BY created_at DESC LIMIT 100`)
    .all(params.id) as QaRow[];

  return (
    <Reader
      documentId={doc.id}
      title={doc.title}
      description={doc.description || ''}
      content={doc.content}
      initialAnnotations={annotations.map((a) => ({
        id: a.id,
        start_offset: a.start_offset,
        end_offset: a.end_offset,
        quoted: a.quoted,
        color: a.color as 'yellow' | 'green' | 'pink' | 'blue',
        note: a.note,
      }))}
      initialGenerations={generations.map((g) => ({
        id: g.id,
        kind: g.kind as 'cheatsheet' | 'questions' | 'summary',
        content: g.content,
        created_at: g.created_at,
        visibility: g.visibility as 'private' | 'public' | 'room',
      }))}
      initialQa={qa.map((q) => ({
        id: q.id,
        question: q.question,
        answer: q.answer,
        citations: q.citations,
        created_at: q.created_at,
      }))}
    />
  );
}
