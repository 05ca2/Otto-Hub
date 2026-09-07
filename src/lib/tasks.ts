// Task tracking helpers — called from action APIs to update user task progress
import { getDb } from './db';
import { nanoid } from 'nanoid';

const TASK_TARGETS: Record<string, number> = {
  daily_login: 1,       // login once per day
  upload_document: 5,
  post_question: 3,
  receive_upvote: 10,
  answer_question: 5,
};

const TASK_REWARDS: Record<string, number> = {
  daily_login: 5,       // 5 Ohbit per day
  upload_document: 15,
  post_question: 20,
  receive_upvote: 5,
  answer_question: 15,
};

/** Daily tasks use day-start, weekly tasks use week-start */
function getPeriodStart(taskType: string): number {
  const now = new Date();
  if (taskType === 'daily_login') {
    // Start of today (midnight)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return today.getTime();
  }
  // Start of week (Sunday)
  const day = now.getDay();
  const diff = now.getDate() - day;
  const sunday = new Date(now.getFullYear(), now.getMonth(), diff);
  sunday.setHours(0, 0, 0, 0);
  return sunday.getTime();
}

/**
 * Increment task progress by 1 (or `increment`).
 * Awards Ohbit when task completes. Idempotent — safe to call multiple times.
 */
export function trackTask(userId: string, taskType: string, increment = 1) {
  const db = getDb();
  const target = TASK_TARGETS[taskType] || 1;
  const periodStart = getPeriodStart(taskType);

  const existing = db.prepare(
    'SELECT id, progress, completed FROM user_tasks WHERE user_id = ? AND task_type = ? AND period_start = ?'
  ).get(userId, taskType, periodStart) as { id: string; progress: number; completed: number } | undefined;

  if (existing) {
    if (existing.completed) return; // already rewarded
    const newProgress = Math.min(existing.progress + increment, target);
    const completed = newProgress >= target ? 1 : 0;
    db.prepare('UPDATE user_tasks SET progress = ?, completed = ? WHERE id = ?').run(newProgress, completed, existing.id);
    if (completed) {
      const reward = TASK_REWARDS[taskType] || 5;
      db.prepare('UPDATE user_credits SET credits = credits + ? WHERE user_id = ?').run(reward, userId);
    }
  } else {
    const newProgress = Math.min(increment, target);
    const completed = newProgress >= target ? 1 : 0;
    db.prepare(
      'INSERT INTO user_tasks (id, user_id, task_type, progress, target, period_start, completed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(nanoid(12), userId, taskType, newProgress, target, periodStart, completed, Date.now());
    if (completed) {
      const reward = TASK_REWARDS[taskType] || 5;
      db.prepare('UPDATE user_credits SET credits = credits + ? WHERE user_id = ?').run(reward, userId);
    }
  }
}

/**
 * Compute task progress from actual DB stats.
 * Returns array of { task_type, progress, target, completed }.
 */
export function computeTaskProgress(userId: string) {
  const db = getDb();

  const docCount = (db.prepare('SELECT COUNT(*) as c FROM documents WHERE user_id = ?').get(userId) as any)?.c || 0;
  const postCount = (db.prepare('SELECT COUNT(*) as c FROM posts WHERE author_id = ?').get(userId) as any)?.c || 0;
  const upvoteCount = (db.prepare(
    "SELECT COALESCE(SUM(value), 0) as c FROM votes WHERE target_type = 'post' AND target_id IN (SELECT id FROM posts WHERE author_id = ?)"
  ).get(userId) as any)?.c || 0;
  // Daily login: check if today's entry exists and is completed
  const todayStart = getPeriodStart('daily_login');
  const todayLogin = db.prepare(
    "SELECT 1 FROM user_tasks WHERE user_id = ? AND task_type = 'daily_login' AND period_start = ? AND completed = 1"
  ).get(userId, todayStart);
  const loginDone = todayLogin ? 1 : 0;
  const answerCount = (db.prepare(
    'SELECT COUNT(*) as c FROM comments WHERE author_id = ?'
  ).get(userId) as any)?.c || 0;

  const stats: Record<string, number> = {
    daily_login: loginDone,
    upload_document: docCount,
    post_question: postCount,
    receive_upvote: upvoteCount,
    answer_question: answerCount,
  };

  return Object.entries(TASK_TARGETS).map(([taskType, target]) => {
    const progress = Math.min(stats[taskType] || 0, target);
    const completed = progress >= target ? 1 : 0;
    return { task_type: taskType, progress, target, completed };
  });
}

/**
 * Ensure user_credits row exists for the user.
 */
export function ensureCredits(userId: string) {
  const db = getDb();
  const existing = db.prepare('SELECT 1 FROM user_credits WHERE user_id = ?').get(userId);
  if (!existing) {
    db.prepare('INSERT INTO user_credits (user_id, credits) VALUES (?, 0)').run(userId);
  }
}
