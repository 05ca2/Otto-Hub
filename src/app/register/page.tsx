'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, BookOpen, Mail, CheckCircle2, ArrowLeft } from 'lucide-react';
import OnboardingSurvey from '@/components/OnboardingSurvey';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'verify' | 'survey'>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  async function sendVerificationCode() {
    if (!email || sendingCode) return;
    setSendingCode(true);
    setError(null);
    try {
      const r = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Failed to send code');
      setCodeSent(true);
      setStep('verify');
      // Start 60s countdown
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) { clearInterval(timer); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send code');
    } finally {
      setSendingCode(false);
    }
  }

  async function verifyEmailCode() {
    if (!code || code.length !== 6 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Invalid code');
      setEmailVerified(true);
      setStep('form');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setLoading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!emailVerified) {
      setError('Please verify your email first');
      return;
    }
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
      setStep('survey');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {step === 'survey' ? (
        <OnboardingSurvey onComplete={() => { router.push('/'); router.refresh(); }} />
      ) : (
        <div className="max-w-md mx-auto mt-10">
          <div className="rounded-2xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-accent-500" />
              <h1 className="text-xl font-semibold">Create your account</h1>
            </div>

            {step === 'verify' ? (
              /* Step 2: Verify code */
              <div className="space-y-4">
                <button onClick={() => { setStep('form'); setError(null); }}
                  className="flex items-center gap-1 text-sm text-ink-500 hover:text-ink-700 dark:hover:text-ink-300">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <div className="flex items-center gap-2 text-ink-600 dark:text-ink-400">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">Enter the 6-digit code sent to <strong>{email}</strong></span>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Verification Code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="w-full border border-ink-200 dark:border-ink-600 rounded-md p-2 text-sm text-center text-2xl tracking-[0.5em] font-mono bg-white dark:bg-ink-900 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-accent-400"
                  />
                </div>
                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                <button
                  onClick={verifyEmailCode}
                  disabled={code.length !== 6 || loading}
                  className="w-full px-4 py-2 rounded bg-accent-500 text-white font-medium hover:bg-accent-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {loading ? 'Verifying...' : 'Verify Email'}
                </button>
                <button
                  onClick={sendVerificationCode}
                  disabled={countdown > 0}
                  className="w-full text-sm text-accent-600 dark:text-accent-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend code'}
                </button>
              </div>
            ) : (
              /* Step 1: Registration form */
              <form onSubmit={submit} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Display name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} required minLength={1} maxLength={80}
                    className="w-full border border-ink-200 dark:border-ink-600 rounded-md p-2 text-sm bg-white dark:bg-ink-900 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-accent-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <div className="flex gap-2">
                    <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setEmailVerified(false); setCodeSent(false); }} required
                      className="flex-1 border border-ink-200 dark:border-ink-600 rounded-md p-2 text-sm bg-white dark:bg-ink-900 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-accent-400" />
                    <button
                      type="button"
                      onClick={sendVerificationCode}
                      disabled={!email || sendingCode || countdown > 0}
                      className="px-3 py-2 rounded-md bg-ink-100 dark:bg-ink-700 text-sm font-medium hover:bg-ink-200 dark:hover:bg-ink-600 disabled:opacity-50 shrink-0"
                    >
                      {sendingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : emailVerified ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : 'Verify'}
                    </button>
                  </div>
                  {emailVerified && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Email verified
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Password (≥ 8 characters)</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
                    className="w-full border border-ink-200 dark:border-ink-600 rounded-md p-2 text-sm bg-white dark:bg-ink-900 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-accent-400" />
                </div>
                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                <button type="submit" disabled={loading || !emailVerified}
                  className="w-full px-4 py-2 rounded bg-accent-500 text-white font-medium hover:bg-accent-600 disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {loading ? 'Creating...' : 'Create account'}
                </button>
                {!emailVerified && (
                  <p className="text-xs text-ink-400 dark:text-ink-500 text-center">
                    Please verify your email before registering
                  </p>
                )}
              </form>
            )}

            <p className="text-sm text-ink-600 dark:text-ink-400 mt-4">
              Already have an account? <Link href="/login" className="text-accent-600 dark:text-accent-400 hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
