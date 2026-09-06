import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  const db = getDb();
  db.prepare('DELETE FROM comments WHERE id = ?').run(params.id);
  return NextResponse.json({ ok: true });
}
