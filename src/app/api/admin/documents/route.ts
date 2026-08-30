import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  await requireAdmin();
  const db = getDb();
  const docs = db.prepare(`
    SELECT d.*, u.name as owner_name, u.email as owner_email
    FROM documents d
    LEFT JOIN users u ON d.user_id = u.id
    ORDER BY d.created_at DESC
    LIMIT 200
  `).all();
  return NextResponse.json({ documents: docs });
}

export async function DELETE(req: NextRequest) {
  await requireAdmin();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing document id' }, { status: 400 });
  const db = getDb();
  db.prepare('DELETE FROM documents WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
