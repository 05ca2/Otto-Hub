import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { moderateContent } from '@/lib/moderation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  generation_id: z.string().min(1),
  visibility: z.enum(['private', 'public']),
});

export async function POST(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const db = getDb();
  const r = db
    .prepare(`UPDATE generations SET visibility = ? WHERE id = ? AND user_id = ?`)
    .run(parsed.data.visibility, parsed.data.generation_id, user.id);
  if (r.changes === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Content moderation check when making public
  if (parsed.data.visibility === 'public') {
    const gen = db
      .prepare(`SELECT content, kind FROM generations WHERE id = ?`)
      .get(parsed.data.generation_id) as { content: string; kind: string } | undefined;
    if (gen) {
      const modResult = await moderateContent(`Generated ${gen.kind}`, gen.content);
      if (!modResult.ok) {
        // Revert visibility back to private
        db.prepare(`UPDATE generations SET visibility = 'private' WHERE id = ?`).run(parsed.data.generation_id);
        return NextResponse.json(
          { error: 'Content rejected', reason: modResult.reason },
          { status: 422 }
        );
      }
    }
  }

  return NextResponse.json({ ok: true });
}
