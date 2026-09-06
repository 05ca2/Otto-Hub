import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  await requireAdmin();
  const db = getDb();
  const count = (table: string) => {
    const row = db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get() as { c: number };
    return row?.c ?? 0;
  };
  const stats = {
    users: count('users'),
    documents: count('documents'),
    posts: count('posts'),
    comments: count('comments'),
    rooms: count('rooms'),
  };
  const env = {
    GITHUB_ID: process.env.GITHUB_ID ? 'configured' : 'not set',
    GITHUB_SECRET: process.env.GITHUB_SECRET ? 'configured' : 'not set',
    AUTH_SECRET: process.env.AUTH_SECRET ? 'configured' : 'not set',
  };
  return NextResponse.json({ stats, env });
}
