'use client';

import { useEffect, useState } from 'react';
import { Zap, Loader2 } from 'lucide-react';

type CreditsResponse = {
  credits: number;
  daily: number;
};

function colorForCredits(credits: number, daily: number): {
  bg: string;
  text: string;
  dot: string;
} {
  const pct = daily > 0 ? credits / daily : 0;
  if (credits < 20) {
    return {
      bg: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30',
      text: 'text-rose-700 dark:text-rose-300',
      dot: 'bg-rose-500',
    };
  }
  if (credits < 50 || pct <= 0.5) {
    return {
      bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30',
      text: 'text-amber-700 dark:text-amber-300',
      dot: 'bg-amber-500',
    };
  }
  return {
    bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  };
}

export function CreditsDisplay() {
  const [data, setData] = useState<CreditsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authed, setAuthed] = useState<boolean>(true);

  async function load() {
    try {
      const res = await fetch('/api/credits', { cache: 'no-store' });
      if (res.status === 401) {
        setAuthed(false);
        setData(null);
        return;
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const d: CreditsResponse = await res.json();
      setAuthed(true);
      setData(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load credits');
    }
  }

  useEffect(() => {
    load();
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  if (!authed) return null;

  if (data === null && !error) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 text-xs text-ink-400 dark:text-ink-500"
        title="Loading credits"
      >
        <Loader2 className="w-3 h-3 animate-spin" />
        …
      </span>
    );
  }

  if (error || !data) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 text-xs text-ink-400 dark:text-ink-500"
        title={error ?? 'Unavailable'}
      >
        <Zap className="w-3 h-3" />
        --
      </span>
    );
  }

  const palette = colorForCredits(data.credits, data.daily);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium ${palette.bg} ${palette.text}`}
      title={`${data.credits} of ${data.daily} credits remaining. Resets daily.`}
      aria-label={`${data.credits} of ${data.daily} credits remaining. Resets daily.`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${palette.dot}`} aria-hidden="true" />
      <Zap className="w-3 h-3" aria-hidden="true" />
      <span>
        {data.credits}/{data.daily}
      </span>
      <span className="hidden sm:inline opacity-70">credits</span>
    </span>
  );
}