import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { chat, isConfigured, getProvider, type ProviderName } from '@/lib/ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  provider: z.enum(['sensenova', 'openrouter', 'custom']).optional(),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
  const provider = (parsed.data.provider || undefined) as ProviderName | undefined;
  if (!isConfigured(provider)) {
    return NextResponse.json({ ok: false, error: 'Provider not configured' }, { status: 412 });
  }
  const cfg = getProvider(provider);
  try {
    const text = await chat(
      [
        { role: 'system', content: 'You are a connectivity test. Reply with the single word: ok' },
        { role: 'user', content: 'ping' },
      ],
      { provider, maxTokens: 8, temperature: 0 },
    );
    return NextResponse.json({ ok: true, model: cfg.model, sample: text.slice(0, 60) });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'AI request failed' },
      { status: 502 },
    );
  }
}
