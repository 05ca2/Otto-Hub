import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateCode, storeCode, sendVerificationEmail } from '@/lib/email-verify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid email' }, { status: 400 });

  const email = parsed.data.email.toLowerCase();
  const code = generateCode();
  storeCode(email, code, 'register');
  const sent = await sendVerificationEmail(email, code);

  if (!sent) {
    return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: 'Verification code sent' });
}
