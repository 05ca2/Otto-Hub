import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyCode } from '@/lib/email-verify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const ok = verifyCode(parsed.data.email.toLowerCase(), parsed.data.code, 'register');
  if (!ok) {
    return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 400 });
  }

  return NextResponse.json({ ok: true, verified: true });
}
