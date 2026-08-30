import { getDb, type UserCreditsRow } from '@/lib/db';

export const DAILY_CREDITS = 100;

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getCredits(userId: string): number {
  const db = getDb();
  const today = getTodayStr();
  const row = db
    .prepare('SELECT * FROM user_credits WHERE user_id = ?')
    .get(userId) as UserCreditsRow | undefined;
  if (!row) {
    db.prepare(
      'INSERT INTO user_credits (user_id, credits, last_reset_date, created_at) VALUES (?, ?, ?, ?)',
    ).run(userId, DAILY_CREDITS, today, Date.now());
    return DAILY_CREDITS;
  }
  if (row.last_reset_date !== today) {
    db.prepare(
      'UPDATE user_credits SET credits = ?, last_reset_date = ? WHERE user_id = ?',
    ).run(DAILY_CREDITS, today, userId);
    return DAILY_CREDITS;
  }
  return row.credits;
}

export function deductCredits(
  userId: string,
  amount: number,
): { ok: boolean; remaining: number } {
  const db = getDb();
  const current = getCredits(userId);
  if (current < amount) return { ok: false, remaining: current };
  db.prepare('UPDATE user_credits SET credits = credits - ? WHERE user_id = ?').run(
    amount,
    userId,
  );
  return { ok: true, remaining: current - amount };
}
