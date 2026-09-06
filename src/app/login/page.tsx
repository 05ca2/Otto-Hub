'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Github, BookOpen } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [githubHint, setGithubHint] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/auth?action=login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Login failed');
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function startGithub() {
    setGithubHint(null);
    const r = await fetch('/api/auth/github?action=login', { redirect: 'manual' });
    if (r.status === 412) {
      const data = await r.json();
      setGithubHint(data.error + (data.setup ? '\n\n' + data.setup : ''));
      return;
    }
    if (r.type === 'opaqueredirect' || r.status === 0) {
      window.location.href = '/api/auth/github?action=login';
      return;
    }
    window.location.href = '/api/auth/github?action=login';
  }

  return (
    <div className="max-w-md mx-auto mt-10">
      <div className="rounded-2xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-accent-500" />
          <h1 className="text-xl font-semibold">Sign in to AI Study Hub</h1>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full border border-ink-200 dark:border-ink-600 rounded-md p-2 text-sm bg-white dark:bg-ink-900 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-accent-400" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              className="w-full border border-ink-200 dark:border-ink-600 rounded-md p-2 text-sm bg-white dark:bg-ink-900 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-accent-400" />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full px-4 py-2 rounded bg-accent-500 text-white font-medium hover:bg-accent-600 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <div className="my-4 flex items-center text-xs text-ink-400 dark:text-ink-500">
          <span className="flex-1 border-t border-ink-100 dark:border-ink-700" />
          <span className="px-2">or</span>
          <span className="flex-1 border-t border-ink-100 dark:border-ink-700" />
        </div>
        <button onClick={startGithub}
          className="w-full px-4 py-2 rounded border border-ink-200 dark:border-ink-600 text-ink-800 dark:text-ink-100 font-medium hover:bg-ink-50 dark:hover:bg-ink-700 flex items-center justify-center gap-2">
          <Github className="w-4 h-4" />
          Continue with GitHub
        </button>
        {githubHint && <pre className="mt-3 text-xs text-ink-600 dark:text-ink-300 whitespace-pre-wrap bg-ink-50 dark:bg-ink-900 p-2 rounded">{githubHint}</pre>}
        <p className="text-sm text-ink-600 dark:text-ink-400 mt-4">
          New here? <Link href="/register" className="text-accent-600 dark:text-accent-400 hover:underline">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
