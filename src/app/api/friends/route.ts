import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/friends - Get friends list and pending requests
export async function GET() {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  
  const db = getDb();
  
  // Get accepted friends
  const friends = db.prepare(`
    SELECT u.id, u.name, u.email, u.image, f.created_at as friends_since
    FROM friends f
    JOIN users u ON (f.friend_id = u.id OR f.user_id = u.id) AND u.id != ?
    WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted'
  `).all(user.id, user.id, user.id);
  
  // Get pending requests sent to me
  const pendingReceived = db.prepare(`
    SELECT f.user_id as from_user_id, u.name, u.email, u.image, f.created_at
    FROM friends f
    JOIN users u ON f.user_id = u.id
    WHERE f.friend_id = ? AND f.status = 'pending'
  `).all(user.id);
  
  // Get pending requests I sent
  const pendingSent = db.prepare(`
    SELECT f.friend_id as to_user_id, u.name, u.email, u.image, f.created_at
    FROM friends f
    JOIN users u ON f.friend_id = u.id
    WHERE f.user_id = ? AND f.status = 'pending'
  `).all(user.id);
  
  return NextResponse.json({ friends, pendingReceived, pendingSent });
}

// POST /api/friends - Send friend request
export async function POST(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  
  const { friendId } = await req.json();
  if (!friendId || typeof friendId !== 'string') {
    return NextResponse.json({ error: 'Invalid friend ID' }, { status: 400 });
  }
  
  if (friendId === user.id) {
    return NextResponse.json({ error: 'Cannot add yourself' }, { status: 400 });
  }
  
  const db = getDb();
  
  // Check if user exists
  const targetUser = db.prepare('SELECT id FROM users WHERE id = ?').get(friendId);
  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  
  // Check if friendship already exists
  const existing = db.prepare(`
    SELECT * FROM friends 
    WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
  `).get(user.id, friendId, friendId, user.id);
  
  if (existing) {
    return NextResponse.json({ error: 'Friend request already exists' }, { status: 409 });
  }
  
  // Create friend request
  db.prepare('INSERT INTO friends (user_id, friend_id, status, created_at) VALUES (?, ?, ?, ?)').run(user.id, friendId, 'pending', Date.now());
  
  return NextResponse.json({ success: true });
}

// PUT /api/friends - Accept/reject friend request
export async function PUT(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  
  const { fromUserId, action } = await req.json();
  if (!fromUserId || typeof fromUserId !== 'string' || !action) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }
  
  const db = getDb();
  
  if (action === 'accept') {
    db.prepare('UPDATE friends SET status = ? WHERE user_id = ? AND friend_id = ?').run('accepted', fromUserId, user.id);
  } else if (action === 'reject') {
    db.prepare('DELETE FROM friends WHERE user_id = ? AND friend_id = ?').run(fromUserId, user.id);
  }
  
  return NextResponse.json({ success: true });
}

// DELETE /api/friends - Remove friend
export async function DELETE(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  
  const { friendId } = await req.json();
  if (!friendId || typeof friendId !== 'string') {
    return NextResponse.json({ error: 'Invalid friend ID' }, { status: 400 });
  }
  
  const db = getDb();
  db.prepare('DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)').run(user.id, friendId, friendId, user.id);
  
  return NextResponse.json({ success: true });
}
