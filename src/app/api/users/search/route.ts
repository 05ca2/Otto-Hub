import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();
  
  if (!q || q.length < 2) {
    return NextResponse.json({ users: [] });
  }
  
  const db = getDb();
  
  // Search users by name or email (exclude current user)
  const users = db.prepare(`
    SELECT id, name, email, image 
    FROM users 
    WHERE id != ? AND (name LIKE ? OR email LIKE ?)
    LIMIT 20
  `).all(user.id, `%${q}%`, `%${q}%`);
  
  return NextResponse.json({ users });
}
