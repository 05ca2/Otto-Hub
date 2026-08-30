import { NextResponse } from 'next/server';
import { getCredits, DAILY_CREDITS } from '@/lib/credits';
import { requireUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET endpoint
export async function GET() {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  const credits = getCredits(user.id);
  return NextResponse.json({ credits, daily: DAILY_CREDITS });
}
