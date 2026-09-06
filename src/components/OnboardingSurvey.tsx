'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, GraduationCap, UserCheck } from 'lucide-react';

type Props = {
  onComplete?: () => void;
};

const ROLES = [
  { value: 'student', label: '学生 Student', icon: '📚' },
  { value: 'teacher', label: '教师 Teacher', icon: '🎓' },
  { value: 'self_learner', label: '自学者 Self-learner', icon: '💡' },
  { value: 'other', label: '其他 Other', icon: '✨' },
] as const;

const GRADES = [
  '小学 Elementary',
  '初一 Grade 7',
  '初二 Grade 8',
  '初三 Grade 9',
  '高一 Grade 10',
  '高二 Grade 11',
  '高三 Grade 12',
  '大一 Freshman',
  '大二 Sophomore',
  '大三 Junior',
  '大四 Senior',
  '研究生 Graduate',
  '在职 Professional',
  '其他 Other',
];

export default function OnboardingSurvey({ onComplete }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<'role' | 'details' | 'done'>('role');
  const [role, setRole] = useState<string>('');
  const [grade, setGrade] = useState('');
  const [purpose, setPurpose] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function selectRole(r: string) {
    setRole(r);
    setStep('details');
  }

  async function submit() {
    if (!role) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/user-survey', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role, grade, purpose }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Failed to save');
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  }

  function finish() {
    if (onComplete) onComplete();
    else router.push('/');
    router.refresh();
  }

  return (
    <div className="max-w-md mx-auto mt-10">
      <div className="rounded-2xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-6">
        {step === 'role' && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap className="w-5 h-5 text-accent-500" />
              <h1 className="text-xl font-semibold">Welcome! 让我们认识你</h1>
            </div>
            <p className="text-xs text-ink-400 dark:text-ink-500 mb-4 italic">
              此采访是为了更好的了解用户 · This survey helps us better understand our users
            </p>
            <div className="space-y-2">
              {ROLES.map(r => (
                <button key={r.value} onClick={() => selectRole(r.value)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-ink-200 dark:border-ink-600 hover:border-accent-400 hover:bg-accent-50 dark:hover:bg-accent-900/20 transition-colors text-left">
                  <span className="text-xl">{r.icon}</span>
                  <span className="font-medium dark:text-ink-100">{r.label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'details' && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <UserCheck className="w-5 h-5 text-accent-500" />
              <h1 className="text-xl font-semibold">Tell us more</h1>
            </div>
            <p className="text-xs text-ink-400 dark:text-ink-500 mb-4 italic">
              此采访是为了更好的了解用户 · This survey helps us better understand our users
            </p>
            <div className="space-y-3">
              {role === 'student' && (
                <div>
                  <label className="block text-sm font-medium mb-1">你的年级 Your Grade</label>
                  <select value={grade} onChange={e => setGrade(e.target.value)}
                    className="w-full border border-ink-200 dark:border-ink-600 rounded-md p-2 text-sm bg-white dark:bg-ink-900 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-accent-400">
                    <option value="">选择年级 Select grade...</option>
                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              )}
              {role === 'teacher' && (
                <div>
                  <label className="block text-sm font-medium mb-1">教学阶段 Teaching Level</label>
                  <select value={grade} onChange={e => setGrade(e.target.value)}
                    className="w-full border border-ink-200 dark:border-ink-600 rounded-md p-2 text-sm bg-white dark:bg-ink-900 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-accent-400">
                    <option value="">选择阶段 Select level...</option>
                    <option value="小学 Elementary">小学 Elementary</option>
                    <option value="初中 Middle School">初中 Middle School</option>
                    <option value="高中 High School">高中 High School</option>
                    <option value="大学 University">大学 University</option>
                    <option value="其他 Other">其他 Other</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">使用目的 Purpose</label>
                <textarea value={purpose} onChange={e => setPurpose(e.target.value)} rows={3}
                  placeholder="你打算用这个平台做什么？&#10;What do you plan to use this platform for?"
                  className="w-full border border-ink-200 dark:border-ink-600 rounded-md p-2 text-sm bg-white dark:bg-ink-900 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-accent-400 resize-none" />
              </div>
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <div className="flex gap-2">
                <button onClick={() => setStep('role')}
                  className="px-4 py-2 rounded border border-ink-200 dark:border-ink-600 text-sm hover:bg-ink-100 dark:hover:bg-ink-700">
                  Back
                </button>
                <button onClick={submit} disabled={loading}
                  className="flex-1 px-4 py-2 rounded bg-accent-500 text-white font-medium hover:bg-accent-600 disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {loading ? 'Saving...' : 'Submit'}
                </button>
              </div>
              <button onClick={finish}
                className="w-full text-sm text-ink-400 dark:text-ink-500 hover:text-ink-600 dark:hover:text-ink-300 hover:underline">
                Skip for now
              </button>
            </div>
          </>
        )}

        {step === 'done' && (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">🎉</div>
            <h2 className="text-xl font-semibold mb-2">Thank you!</h2>
            <p className="text-sm text-ink-500 dark:text-ink-400 mb-4">感谢你的分享，我们会据此优化体验</p>
            <button onClick={finish}
              className="px-6 py-2 rounded bg-accent-500 text-white font-medium hover:bg-accent-600">
              Start Exploring
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
