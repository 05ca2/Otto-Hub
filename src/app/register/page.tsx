'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, BookOpen } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/auth?action=register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Registration failed');
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10">
      <div className="rounded-2xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-accent-500" />
          <h1 className="text-xl font-semibold">Create your account</h1>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Display name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required minLength={1} maxLength={80}
              className="w-full border border-ink-200 dark:border-ink-600 rounded-md p-2 text-sm bg-white dark:bg-ink-900 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-accent-400" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full border border-ink-200 dark:border-ink-600 rounded-md p-2 text-sm bg-white dark:bg-ink-900 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-accent-400" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password (≥ 8 characters)</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
              className="w-full border border-ink-200 dark:border-ink-600 rounded-md p-2 text-sm bg-white dark:bg-ink-900 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-accent-400" />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full px-4 py-2 rounded bg-accent-500 text-white font-medium hover:bg-accent-600 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Creating…' : 'Create account'}
          </button>
        </form>
        <p className="text-sm text-ink-600 dark:text-ink-400 mt-4">
          Already have an account? <Link href="/login" className="text-accent-600 dark:text-accent-400 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
