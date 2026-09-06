import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isSuperAdmin } from '@/lib/auth';
import { getDb, type UserRow } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  await requireAdmin();
  const db = getDb();
  const users = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.bio, u.created_at,
      (SELECT COUNT(*) FROM documents WHERE user_id = u.id) as doc_count,
      (SELECT COUNT(*) FROM posts WHERE author_id = u.id) as post_count
    FROM users u ORDER BY u.created_at DESC
  `).all();
  return NextResponse.json({ users });
}

export async function PATCH(req: NextRequest) {
  const caller = await requireAdmin();
  const { id, role, banned } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing user id' }, { status: 400 });

  const db = getDb();
  const target = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as UserRow | undefined;
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const callerIsSuper = isSuperAdmin(caller);
  const targetIsSuper = isSuperAdmin(target);

  // === SUPER ADMIN PROTECTION ===
  // No one can demote or ban the super admin (except super admin themselves)
  if (targetIsSuper && !callerIsSuper) {
    return NextResponse.json({ error: 'Cannot modify the super admin' }, { status: 403 });
  }

  // === ADMIN PROTECTION ===
  // Non-super admins cannot demote or ban other admins
  if (!callerIsSuper && target.role === 'admin' && target.id !== caller.id) {
    return NextResponse.json({ error: 'Admins cannot modify other admins' }, { status: 403 });
  }

  // === SELF-PROTECTION ===
  // No one can demote themselves
  if (target.id === caller.id && (role !== undefined || banned !== undefined)) {
    return NextResponse.json({ error: 'Cannot modify your own role or ban status' }, { status: 403 });
  }

  // Apply changes
  if (role !== undefined) {
    // Only super admin can assign or remove super_admin role
    if ((role === 'super_admin' || target.role === 'super_admin') && !callerIsSuper) {
      return NextResponse.json({ error: 'Only super admin can modify super admin role' }, { status: 403 });
    }
    // Only super admin can set admin role (optional: allow admins too)
    if (role === 'admin' && !callerIsSuper) {
      return NextResponse.json({ error: 'Only super admin can promote to admin' }, { status: 403 });
    }
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  }

  if (banned !== undefined) {
    // Prevent banning via role change if target is admin (only super admin can)
    if (!callerIsSuper && (target.role === 'admin' || target.role === 'super_admin')) {
      return NextResponse.json({ error: 'Only super admin can ban admins' }, { status: 403 });
    }
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(banned ? 'banned' : 'user', id);
  }

  return NextResponse.json({ ok: true });
}
