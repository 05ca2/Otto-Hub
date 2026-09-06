import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  const db = getDb();
  const doc = db.prepare(`
    SELECT d.*, u.name as owner_name, u.email as owner_email
    FROM documents d
    LEFT JOIN users u ON d.user_id = u.id
    WHERE d.id = ?
  `).get(params.id) as Record<string, unknown> | undefined;
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ document: doc });
}
