'use client';

import { useEffect, useState } from 'react';
import { Save, Loader2, CheckCircle2, Eye, EyeOff, Sparkles } from 'lucide-react';

type ProviderKey = 'sensenova' | 'openrouter' | 'custom';
type ProviderDto = { baseUrl: string; model: string; hasApiKey: boolean; enabled: boolean };
type SettingsDto = { defaultProvider: ProviderKey; providers: Record<ProviderKey, ProviderDto> };

const PROVIDER_META: Record<ProviderKey, { label: string; placeholder: { baseUrl: string; model: string }; recipes: string[] }> = {
  sensenova: {
    label: 'SenseNova (商汤日问)',
    placeholder: { baseUrl: 'https://api.sensenova.cn/compat-mode/v1/chat/completions', model: 'SenseChat' },
    recipes: [
      'Base: https://api.sensenova.cn/compat-mode/v1/chat/completions',
      'Model: SenseChat / SenseChat-Vision / SenseChat-Turbo',
      'Key: 在 https://platform.sensenova.cn 申请',
    ],
  },
  openrouter: {
    label: 'OpenRouter',
    placeholder: { baseUrl: 'https://openrouter.ai/api/v1', model: 'google/gemini-2.0-flash-exp:free' },
    recipes: [
      'Base: https://openrouter.ai/api/v1',
      'Model: google/gemini-2.0-flash-exp:free (免费)',
      '备选: meta-llama/llama-3.3-70b-instruct:free / qwen/qwen-2.5-72b-instruct:free',
      'Key: 在 https://openrouter.ai/keys 申请',
    ],
  },
  custom: {
    label: 'Custom (任何 OpenAI 兼容端点)',
    placeholder: { baseUrl: 'https://your-endpoint/v1', model: 'your-model' },
    recipes: [
      'OpenAI:  base https://api.openai.com/v1,  model gpt-4o-mini',
      'DeepSeek: base https://api.deepseek.com/v1,  model deepseek-chat',
      'Ollama:  base http://localhost:11434/v1,  model llama3.1,  key ollama',
      'LM Studio: base http://localhost:1234/v1,  key lm-studio',
    ],
  },
};

export default function SettingsPage() {
  const [data, setData] = useState<SettingsDto | null>(null);
  const [defaultProvider, setDefaultProvider] = useState<ProviderKey>('sensenova');
  const [draft, setDraft] = useState<Record<ProviderKey, { baseUrl: string; model: string; apiKey: string }>>({
    sensenova: { baseUrl: '', model: '', apiKey: '' },
    openrouter: { baseUrl: '', model: '', apiKey: '' },
    custom: { baseUrl: '', model: '', apiKey: '' },
  });
  const [showKey, setShowKey] = useState<Record<ProviderKey, boolean>>({ sensenova: false, openrouter: false, custom: false });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<Record<ProviderKey, null | 'ok' | 'fail' | 'testing'>>({ sensenova: null, openrouter: null, custom: null });
  const [testMsg, setTestMsg] = useState<Record<ProviderKey, string | null>>({ sensenova: null, openrouter: null, custom: null });

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then((d: SettingsDto) => {
      setData(d);
      setDefaultProvider(d.defaultProvider);
      setDraft({
        sensenova: { baseUrl: d.providers.sensenova.baseUrl, model: d.providers.sensenova.model, apiKey: '' },
        openrouter: { baseUrl: d.providers.openrouter.baseUrl, model: d.providers.openrouter.model, apiKey: '' },
        custom: { baseUrl: d.providers.custom.baseUrl, model: d.providers.custom.model, apiKey: '' },
      });
    });
  }, []);

  function set<K extends ProviderKey>(k: K, patch: Partial<{ baseUrl: string; model: string; apiKey: string }>) {
    setDraft((d) => ({ ...d, [k]: { ...d[k], ...patch } }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const body: any = { defaultProvider };
      for (const k of ['sensenova', 'openrouter', 'custom'] as ProviderKey[]) {
        const d = draft[k];
        // Only send apiKey if user typed a new one — empty keeps existing.
        body[k] = { baseUrl: d.baseUrl, model: d.model, apiKey: d.apiKey };
      }
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || 'Save failed');
      setData(out);
      // Clear apiKey fields in memory
      setDraft((d) => ({
        sensenova: { ...d.sensenova, apiKey: '' },
        openrouter: { ...d.openrouter, apiKey: '' },
        custom: { ...d.custom, apiKey: '' },
      }));
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function testProvider(k: ProviderKey) {
    setTestStatus((s) => ({ ...s, [k]: 'testing' }));
    setTestMsg((s) => ({ ...s, [k]: null }));
    // Save first so the test uses the new key.
    const body: any = { defaultProvider };
    for (const kk of ['sensenova', 'openrouter', 'custom'] as ProviderKey[]) {
      const d = draft[kk];
      body[kk] = { baseUrl: d.baseUrl, model: d.model, apiKey: d.apiKey };
    }
    await fetch('/api/settings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    try {
      const r = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider: k }),
      });
      const out = await r.json();
      if (!r.ok || !out.ok) {
        setTestStatus((s) => ({ ...s, [k]: 'fail' }));
        setTestMsg((s) => ({ ...s, [k]: out.error || 'Test failed' }));
      } else {
        setTestStatus((s) => ({ ...s, [k]: 'ok' }));
        setTestMsg((s) => ({ ...s, [k]: `OK · model=${out.model}` }));
      }
    } catch (err) {
      setTestStatus((s) => ({ ...s, [k]: 'fail' }));
      setTestMsg((s) => ({ ...s, [k]: err instanceof Error ? err.message : 'Network error' }));
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="rounded-2xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-6">
        <h1 className="text-2xl font-semibold mb-1">AI Settings</h1>
        <p className="text-ink-600 dark:text-ink-400 text-sm mb-5">
          Three providers are wired in. Pick a default and add an API key for each one you want to use.
          Keys are stored locally in <code>./data/settings.json</code> and never leave this machine.
        </p>

        <div className="mb-5">
          <label className="block text-sm font-medium mb-1">Default provider</label>
          <div className="flex flex-wrap gap-2">
            {(['sensenova', 'openrouter', 'custom'] as ProviderKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setDefaultProvider(k)}
                className={`px-3 py-1.5 rounded text-sm font-medium border ${defaultProvider === k ? 'bg-accent-500 text-white border-accent-500' : 'border-ink-200 dark:border-ink-600 text-ink-600 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-700'}`}
              >
                {PROVIDER_META[k].label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {(['sensenova', 'openrouter', 'custom'] as ProviderKey[]).map((k) => {
            const meta = PROVIDER_META[k];
            const d = draft[k];
            const p = data?.providers[k];
            return (
              <div key={k} className="border border-ink-100 dark:border-ink-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-sm flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-accent-500" />
                    {meta.label}
                  </h2>
                  <span className={`text-xs ${p?.hasApiKey ? 'text-green-600 dark:text-green-400' : 'text-ink-400 dark:text-ink-500'}`}>
                    {p?.hasApiKey ? 'configured' : 'no key yet'}
                  </span>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-ink-600 dark:text-ink-400">Base URL</label>
                    <input
                      value={d.baseUrl}
                      onChange={(e) => set(k, { baseUrl: e.target.value })}
                      placeholder={meta.placeholder.baseUrl}
                      className="w-full border border-ink-200 dark:border-ink-600 rounded-md p-2 text-sm font-mono bg-white dark:bg-ink-900 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-accent-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-ink-600 dark:text-ink-400">Model</label>
                    <input
                      value={d.model}
                      onChange={(e) => set(k, { model: e.target.value })}
                      placeholder={meta.placeholder.model}
                      className="w-full border border-ink-200 dark:border-ink-600 rounded-md p-2 text-sm font-mono bg-white dark:bg-ink-900 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-accent-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-ink-600 dark:text-ink-400">API Key</label>
                    <div className="flex gap-2">
                      <input
                        type={showKey[k] ? 'text' : 'password'}
                        value={d.apiKey}
                        onChange={(e) => set(k, { apiKey: e.target.value })}
                        placeholder={p?.hasApiKey ? '••••••• (already set, leave blank to keep)' : 'paste key here'}
                        className="flex-1 border border-ink-200 dark:border-ink-600 rounded-md p-2 text-sm font-mono bg-white dark:bg-ink-900 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-accent-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey((s) => ({ ...s, [k]: !s[k] }))}
                        className="px-2 rounded border border-ink-200 dark:border-ink-600 hover:bg-ink-50 dark:hover:bg-ink-700"
                        title={showKey[k] ? 'Hide' : 'Show'}
                      >
                        {showKey[k] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => testProvider(k)}
                        disabled={testStatus[k] === 'testing'}
                        className="px-3 rounded border border-ink-200 dark:border-ink-600 hover:bg-ink-50 dark:hover:bg-ink-700 text-xs font-medium flex items-center gap-1"
                      >
                        {testStatus[k] === 'testing' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Test'}
                      </button>
                    </div>
                    {testStatus[k] && testStatus[k] !== 'testing' && (
                      <p className={`text-xs mt-1 ${testStatus[k] === 'ok' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {testMsg[k]}
                      </p>
                    )}
                  </div>
                  <details className="text-xs text-ink-600 dark:text-ink-400">
                    <summary className="cursor-pointer hover:underline">Quick recipes</summary>
                    <ul className="mt-2 space-y-0.5 list-disc pl-5">
                      {meta.recipes.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </details>
                </div>
              </div>
            );
          })}
        </div>

        {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
        {saved && <p className="text-sm text-green-600 mt-4 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Saved.</p>}

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded bg-accent-500 text-white font-medium hover:bg-accent-600 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save all settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
