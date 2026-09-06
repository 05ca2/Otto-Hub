import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { nanoid } from 'nanoid';
import { computeTaskProgress, ensureCredits } from '@/lib/tasks';

// GET /api/user/personalization - Get all personalization data for current user
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();

  // Get all frames
  const frames = db.prepare('SELECT * FROM avatar_frames ORDER BY sort_order ASC').all();

  // Get all wallpapers
  const wallpapers = db.prepare('SELECT * FROM wallpapers ORDER BY sort_order ASC').all();

  // Get user's current selections
  const userProfile = db.prepare('SELECT avatar_frame, wallpaper FROM users WHERE id = ?').get(user.id) as { avatar_frame: string; wallpaper: string } | undefined;

  // Compute task progress from actual stats (not empty user_tasks table)
  ensureCredits(user.id);
  const tasks = computeTaskProgress(user.id);

  // Get user's unlock progress for frames and wallpapers
  const stats = getUserStats(db, user.id);

  // Get Ohbit balance
  const creditsRow = db.prepare('SELECT credits FROM user_credits WHERE user_id = ?').get(user.id) as { credits: number } | undefined;
  const ohbitBalance = creditsRow?.credits || 0;

  // Get user's purchased items
  const purchased = db.prepare('SELECT item_type, item_id FROM purchased_items WHERE user_id = ?').all(user.id) as Array<{ item_type: string; item_id: string }>;

  return NextResponse.json({
    frames,
    wallpapers,
    currentFrame: userProfile?.avatar_frame || 'none',
    currentWallpaper: userProfile?.wallpaper || 'default',
    tasks,
    stats,
    ohbitBalance,
    purchased,
  });
}

// PATCH /api/user/personalization - Update user's frame/wallpaper selection
export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { avatar_frame, wallpaper } = await req.json();
  const db = getDb();

  // Verify user owns the selected items
  if (avatar_frame) {
    const frame = db.prepare('SELECT * FROM avatar_frames WHERE id = ?').get(avatar_frame) as any;
    if (!frame) return NextResponse.json({ error: 'Invalid frame' }, { status: 400 });
    // Check task-unlock (free frames with requirements)
    if (frame.requirement_type !== 'none' && (!frame.price_ohbit || frame.price_ohbit === 0)) {
      const unlocked = isItemUnlocked(db, user.id, frame.requirement_type, frame.requirement_value);
      if (!unlocked) return NextResponse.json({ error: 'Frame not unlocked' }, { status: 403 });
    }
    // Check Ohbit purchase (paid frames)
    if (frame.price_ohbit && frame.price_ohbit > 0) {
      const hasPurchased = db.prepare('SELECT 1 FROM purchased_items WHERE user_id = ? AND item_type = ? AND item_id = ?').get(user.id, 'frame', avatar_frame);
      if (!hasPurchased) return NextResponse.json({ error: 'Frame not purchased' }, { status: 403 });
    }
  }

  if (wallpaper) {
    const wp = db.prepare('SELECT * FROM wallpapers WHERE id = ?').get(wallpaper) as any;
    if (!wp) return NextResponse.json({ error: 'Invalid wallpaper' }, { status: 400 });
    if (wp.requirement_type !== 'none' && (!wp.price_ohbit || wp.price_ohbit === 0)) {
      const unlocked = isItemUnlocked(db, user.id, wp.requirement_type, wp.requirement_value);
      if (!unlocked) return NextResponse.json({ error: 'Wallpaper not unlocked' }, { status: 403 });
    }
    if (wp.price_ohbit && wp.price_ohbit > 0) {
      const hasPurchased = db.prepare('SELECT 1 FROM purchased_items WHERE user_id = ? AND item_type = ? AND item_id = ?').get(user.id, 'wallpaper', wallpaper);
      if (!hasPurchased) return NextResponse.json({ error: 'Wallpaper not purchased' }, { status: 403 });
    }
  }

  const sets: string[] = [];
  const values: any[] = [];
  if (avatar_frame !== undefined) { sets.push('avatar_frame = ?'); values.push(avatar_frame); }
  if (wallpaper !== undefined) { sets.push('wallpaper = ?'); values.push(wallpaper); }
  
  if (sets.length > 0) {
    values.push(user.id);
    db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  }

  return NextResponse.json({ ok: true });
}

// POST /api/user/personalization - Record task completion OR purchase items
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action, item_type, item_id, task_type, increment } = body;
  const db = getDb();

  // Handle Ohbit purchase
  if (action === 'purchase') {
    if (!item_type || !item_id) return NextResponse.json({ error: 'Missing item' }, { status: 400 });
    
    const table = item_type === 'frame' ? 'avatar_frames' : 'wallpapers';
    const item = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(item_id) as any;
    if (!item) return NextResponse.json({ error: 'Invalid item' }, { status: 400 });
    
    // Check if already purchased
    const existing = db.prepare('SELECT 1 FROM purchased_items WHERE user_id = ? AND item_type = ? AND item_id = ?').get(user.id, item_type, item_id);
    if (existing) return NextResponse.json({ error: 'Already purchased' }, { status: 400 });
    
    // Check Ohbit balance
    const creditsRow = db.prepare('SELECT credits FROM user_credits WHERE user_id = ?').get(user.id) as { credits: number } | undefined;
    const balance = creditsRow?.credits || 0;
    if (balance < item.price_ohbit) return NextResponse.json({ error: 'Insufficient Ohbit' }, { status: 400 });
    
    // Deduct Ohbit
    db.prepare('UPDATE user_credits SET credits = credits - ? WHERE user_id = ?').run(item.price_ohbit, user.id);
    
    // Record purchase
    db.prepare('INSERT INTO purchased_items (id, user_id, item_type, item_id, purchased_at) VALUES (?, ?, ?, ?, ?)').run(nanoid(), user.id, item_type, item_id, Date.now());
    
    return NextResponse.json({ ok: true, remaining: balance - item.price_ohbit });
  }

  // Handle task completion
  if (!task_type) return NextResponse.json({ error: 'Missing task_type' }, { status: 400 });

  const weekStart = getWeekStart();
  const targets: Record<string, number> = {
    daily_login: 7,
    upload_document: 5,
    post_question: 3,
    receive_upvote: 10,
    answer_question: 5,
  };
  const target = targets[task_type] || 1;

  // Upsert task progress
  const existing = db.prepare('SELECT id, progress, completed FROM user_tasks WHERE user_id = ? AND task_type = ? AND period_start = ?')
    .get(user.id, task_type, weekStart) as { id: string; progress: number; completed: number } | undefined;

  if (existing) {
    if (existing.completed) return NextResponse.json({ ok: true, already_completed: true });
    const newProgress = Math.min(existing.progress + (increment || 1), target);
    const completed = newProgress >= target ? 1 : 0;
    db.prepare('UPDATE user_tasks SET progress = ?, completed = ? WHERE id = ?').run(newProgress, completed, existing.id);
    
    // Award Ohbit on completion
    if (completed && !existing.completed) {
      const rewards: Record<string, number> = {
        daily_login: 10, upload_document: 15, post_question: 20,
        receive_upvote: 5, answer_question: 15,
      };
      const reward = rewards[task_type] || 5;
      db.prepare('UPDATE user_credits SET credits = credits + ? WHERE user_id = ?').run(reward, user.id);
      return NextResponse.json({ ok: true, reward, completed: true });
    }
  } else {
    const newProgress = Math.min(increment || 1, target);
    const completed = newProgress >= target ? 1 : 0;
    db.prepare('INSERT INTO user_tasks (id, user_id, task_type, progress, target, period_start, completed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(nanoid(), user.id, task_type, newProgress, target, weekStart, completed, Date.now());
    
    if (completed) {
      const rewards: Record<string, number> = {
        daily_login: 10, upload_document: 15, post_question: 20,
        receive_upvote: 5, answer_question: 15,
      };
      const reward = rewards[task_type] || 5;
      db.prepare('UPDATE user_credits SET credits = credits + ? WHERE user_id = ?').run(reward, user.id);
      return NextResponse.json({ ok: true, reward, completed: true });
    }
  }

  return NextResponse.json({ ok: true });
}

// Helper functions
function getWeekStart(): number {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day;
  const sunday = new Date(now.setDate(diff));
  sunday.setHours(0, 0, 0, 0);
  return sunday.getTime();
}

function getUserStats(db: any, userId: string) {
  const docCount = (db.prepare("SELECT COUNT(*) as c FROM documents WHERE user_id = ?").get(userId) as any)?.c || 0;
  const postCount = (db.prepare("SELECT COUNT(*) as c FROM posts WHERE author_id = ?").get(userId) as any)?.c || 0;
  const upvoteCount = (db.prepare("SELECT COALESCE(SUM(value), 0) as c FROM votes WHERE target_type = 'post' AND target_id IN (SELECT id FROM posts WHERE author_id = ?)").get(userId) as any)?.c || 0;
  const loginDays = (db.prepare("SELECT COUNT(*) as c FROM user_tasks WHERE user_id = ? AND task_type = 'daily_login' AND completed = 1").get(userId) as any)?.c || 0;
  return { documents: docCount, posts: postCount, upvotes: upvoteCount, loginDays };
}

function isItemUnlocked(db: any, userId: string, type: string, value: number): boolean {
  const stats = getUserStats(db, userId);
  switch (type) {
    case 'documents': return stats.documents >= value;
    case 'posts': return stats.posts >= value;
    case 'upvotes': return stats.upvotes >= value;
    case 'login_days': return stats.loginDays >= value;
    default: return true;
  }
}
