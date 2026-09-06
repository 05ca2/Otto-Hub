import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { readSettings, writeSettings, DEFAULT_SETTINGS } from '@/lib/ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const s = readSettings();
  return NextResponse.json({
    defaultProvider: s.defaultProvider,
    providers: {
      sensenova: { ...s.providers.sensenova, hasApiKey: Boolean(s.providers.sensenova.apiKey) },
      openrouter: { ...s.providers.openrouter, hasApiKey: Boolean(s.providers.openrouter.apiKey) },
      custom: { ...s.providers.custom, hasApiKey: Boolean(s.providers.custom.apiKey) },
    },
  });
}

const ProviderInput = z.object({
  baseUrl: z.string().optional(),
  apiKey: z.string().optional(),
  model: z.string().optional(),
});

const Body = z.object({
  defaultProvider: z.enum(['sensenova', 'openrouter', 'custom']).optional(),
  sensenova: ProviderInput.optional(),
  openrouter: ProviderInput.optional(),
  custom: ProviderInput.optional(),
});

function applyProvider(
  prev: typeof DEFAULT_SETTINGS.providers.sensenova,
  patch?: { baseUrl?: string; apiKey?: string; model?: string },
) {
  const nextApiKey = patch?.apiKey !== undefined ? patch.apiKey.trim() : prev.apiKey;
  return {
    baseUrl: patch?.baseUrl !== undefined ? patch.baseUrl.trim() : prev.baseUrl,
    apiKey: nextApiKey,
    model: patch?.model !== undefined ? patch.model.trim() : prev.model,
    enabled: nextApiKey.length > 0,
  };
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.format() }, { status: 400 });
  }
  const cur = readSettings();
  // Always use hardcoded API keys for sensenova and openrouter
  const next = {
    defaultProvider: parsed.data.defaultProvider || cur.defaultProvider,
    providers: {
      sensenova: { ...DEFAULT_SETTINGS.providers.sensenova },
      openrouter: { ...DEFAULT_SETTINGS.providers.openrouter },
      custom: applyProvider(cur.providers.custom, parsed.data.custom),
    },
  };
  writeSettings(next);
  return NextResponse.json({
    defaultProvider: next.defaultProvider,
    providers: {
      sensenova: { ...next.providers.sensenova, hasApiKey: Boolean(next.providers.sensenova.apiKey) },
      openrouter: { ...next.providers.openrouter, hasApiKey: Boolean(next.providers.openrouter.apiKey) },
      custom: { ...next.providers.custom, hasApiKey: Boolean(next.providers.custom.apiKey) },
    },
  });
}
