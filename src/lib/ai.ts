// Multi-provider AI client. Each provider has its own base URL, model, key.
// Settings are persisted in data/settings.json and reloaded when the file changes.
//
// Providers shipped:
//   - sensenova:  https://api.sensenova.cn/compat-mode/v1/chat/completions
//   - openrouter: https://openrouter.ai/api/v1
//   - custom:     user-supplied OpenAI-compatible endpoint
//
// All providers are exposed through chat() / chatStream() entry points.

import OpenAI from 'openai';
import fs from 'node:fs';
import path from 'node:path';

const SETTINGS_PATH = path.join(process.cwd(), 'data', 'settings.json');

export type ProviderName = 'sensenova' | 'openrouter' | 'custom';

export interface ProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  enabled: boolean;
}

export interface Settings {
  defaultProvider: ProviderName;
  providers: Record<ProviderName, ProviderConfig>;
}

let cached: { value: Settings; mtimeMs: number } | null = null;

export const DEFAULT_SETTINGS: Settings = {
  defaultProvider: 'sensenova',
  providers: {
    sensenova: {
      baseUrl: 'https://token.sensenova.cn/v1',
      apiKey: '',
      model: 'sensenova-6.7-flash-lite',
      enabled: false,
    },
    openrouter: {
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey: '',
      model: 'nvidia/nemotron-3-super-120b-a12b:free',
      enabled: false,
    },
    custom: {
      baseUrl: '',
      apiKey: '',
      model: '',
      enabled: false,
    },
  },
};

function migrate(old: any): Settings {
  if (!old || typeof old !== 'object') return cloneDefaults();
  // Old single-provider shape: { baseUrl, apiKey, model }
  if ('baseUrl' in old || 'apiKey' in old || 'model' in old) {
    return {
      defaultProvider: 'custom',
      providers: {
        sensenova: { ...DEFAULT_SETTINGS.providers.sensenova },
        openrouter: { ...DEFAULT_SETTINGS.providers.openrouter },
        custom: {
          baseUrl: old.baseUrl || '',
          apiKey: old.apiKey || '',
          model: old.model || '',
          enabled: Boolean(old.apiKey),
        },
      },
    };
  }
  return {
    defaultProvider: old.defaultProvider || DEFAULT_SETTINGS.defaultProvider,
    providers: {
      sensenova: { ...DEFAULT_SETTINGS.providers.sensenova, ...(old.providers?.sensenova || {}) },
      openrouter: { ...DEFAULT_SETTINGS.providers.openrouter, ...(old.providers?.openrouter || {}) },
      custom: { ...DEFAULT_SETTINGS.providers.custom, ...(old.providers?.custom || {}) },
    },
  };
}

function cloneDefaults(): Settings {
  return {
    defaultProvider: DEFAULT_SETTINGS.defaultProvider,
    providers: {
      sensenova: { ...DEFAULT_SETTINGS.providers.sensenova },
      openrouter: { ...DEFAULT_SETTINGS.providers.openrouter },
      custom: { ...DEFAULT_SETTINGS.providers.custom },
    },
  };
}

export function readSettings(): Settings {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) return cloneDefaults();
    const stat = fs.statSync(SETTINGS_PATH);
    if (cached && cached.mtimeMs === stat.mtimeMs) return cached.value;
    const raw = fs.readFileSync(SETTINGS_PATH, 'utf8');
    const value = migrate(JSON.parse(raw));
    cached = { value, mtimeMs: stat.mtimeMs };
    return value;
  } catch {
    return cloneDefaults();
  }
}

export function writeSettings(next: Settings) {
  const dir = path.dirname(SETTINGS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(next, null, 2), 'utf8');
  cached = { value: next, mtimeMs: Date.now() };
}

export function getProvider(name?: ProviderName): ProviderConfig {
  const s = readSettings();
  const n = name || s.defaultProvider;
  return s.providers[n] || s.providers.custom;
}

export function listProviders(): Settings['providers'] {
  return readSettings().providers;
}

export function isConfigured(provider?: ProviderName): boolean {
  const p = getProvider(provider);
  return p.apiKey.trim().length > 0 && p.baseUrl.trim().length > 0;
}

function getClient(p: ProviderConfig): OpenAI {
  return new OpenAI({ baseURL: p.baseUrl, apiKey: p.apiKey });
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  provider?: ProviderName;
  model?: string;
  temperature?: number;
  json?: boolean;
  maxTokens?: number;
}

export async function chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string> {
  const p = getProvider(opts.provider);
  if (!p.apiKey.trim()) {
    const name = opts.provider || readSettings().defaultProvider;
    throw new Error(`AI provider "${name}" is not configured. Add its API key in Settings.`);
  }
  if (!p.baseUrl.trim()) {
    throw new Error('AI provider base URL is empty. Set it in Settings.');
  }
  const client = getClient(p);
  const res = await client.chat.completions.create({
    model: opts.model || p.model,
    temperature: opts.temperature ?? 0.3,
    messages,
    ...(opts.json ? { response_format: { type: 'json_object' as const } } : {}),
    ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
  });
  return res.choices[0]?.message?.content ?? '';
}

export async function* chatStream(
  messages: ChatMessage[],
  opts: ChatOptions = {},
): AsyncGenerator<string, void, void> {
  const p = getProvider(opts.provider);
  if (!p.apiKey.trim()) throw new Error('AI not configured');
  const client = getClient(p);
  const stream = await client.chat.completions.create({
    model: opts.model || p.model,
    temperature: opts.temperature ?? 0.3,
    messages,
    stream: true,
    ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
  });
  for await (const part of stream) {
    const delta = part.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}
