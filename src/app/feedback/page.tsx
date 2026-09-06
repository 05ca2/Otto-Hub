'use client';

import { useState } from 'react';
import {
  MessageSquare,
  Sparkles,
  Bug,
  Lightbulb,
  MessageCircle,
  Loader2,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';
import { t, type Locale, type TranslationKeys } from '@/lib/translations';

type Category = 'experience' | 'bug' | 'feature' | 'other';

const CATEGORIES: { value: Category; labelKey: keyof TranslationKeys; icon: typeof Sparkles }[] = [
  { value: 'experience', labelKey: 'feedback.experience', icon: Sparkles },
  { value: 'bug', labelKey: 'feedback.bugReport', icon: Bug },
  { value: 'feature', labelKey: 'feedback.featureRequest', icon: Lightbulb },
  { value: 'other', labelKey: 'feedback.other', icon: MessageCircle },
];

function categoryLabel(locale: Locale, value: Category): string {
  const cat = CATEGORIES.find((c) => c.value === value);
  return cat ? t(locale, cat.labelKey) : value;
}

export default function FeedbackPage() {
  const { locale } = useLanguage();
  const [category, setCategory] = useState<Category>('experience');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);

  const canSubmit = title.trim().length >= 2 && content.trim().length >= 5;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const r = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ category, title, content }),
      });
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        setError(data?.error || t(locale, 'feedback.error'));
        return;
      }
      setCategory('experience');
      setTitle('');
      setContent('');
      const id = Date.now();
      setToast({ id, message: t(locale, 'feedback.success') });
      setTimeout(() => {
        setToast((t) => (t?.id === id ? null : t));
      }, 4000);
    } catch {
      setError(t(locale, 'feedback.networkError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-[640px] px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-accent-500" /> {t(locale, 'feedback.title')}
        </h1>
        <p className="text-ink-600 dark:text-ink-400 text-sm mt-1">{t(locale, 'feedback.description')}</p>
      </div>

      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-6 space-y-5"
      >
        <div>
          <label className="block text-sm font-medium mb-2 dark:text-ink-200">{t(locale, 'feedback.category')}</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CATEGORIES.map((c) => {
              const active = category === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  aria-pressed={active}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    active
                      ? 'bg-accent-500 text-white border-accent-500'
                      : 'border-ink-200 dark:border-ink-600 text-ink-600 dark:text-ink-400 hover:bg-ink-50 dark:hover:bg-ink-700'
                  }`}
                >
                  <c.icon className="w-4 h-4" /> {categoryLabel(locale, c.value)}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="feedback-title" className="block text-sm font-medium mb-1 dark:text-ink-200">
            {t(locale, 'feedback.titleLabel')}
          </label>
          <input
            id="feedback-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t(locale, 'feedback.titlePlaceholder')}
            maxLength={200}
            className="w-full border border-ink-200 dark:border-ink-600 bg-white dark:bg-ink-900 dark:text-ink-100 rounded-md p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-400"
          />
        </div>

        <div>
          <label htmlFor="feedback-content" className="block text-sm font-medium mb-1 dark:text-ink-200">
            {t(locale, 'feedback.content')}
          </label>
          <textarea
            id="feedback-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t(locale, 'feedback.contentPlaceholder')}
            minLength={5}
            maxLength={5000}
            className="w-full border border-ink-200 dark:border-ink-600 bg-white dark:bg-ink-900 dark:text-ink-100 rounded-md p-3 text-sm min-h-[150px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-accent-400"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {submitting ? t(locale, 'feedback.submitting') : t(locale, 'feedback.submitBtn')}
          </button>
        </div>
      </form>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-white dark:bg-ink-800 px-4 py-2.5 text-sm text-ink-700 dark:text-ink-100 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          {toast.message}
          <button
            onClick={() => setToast(null)}
            className="ml-1 p-0.5 rounded hover:bg-ink-100 dark:hover:bg-ink-700 text-ink-400 dark:text-ink-500"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
