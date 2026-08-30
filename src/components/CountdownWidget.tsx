'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Calendar, Loader2 } from 'lucide-react';

type EventRow = {
  id: string;
  user_id: string;
  title: string;
  event_date: number;
  color: string;
  created_at: number;
};

const COLOR_OPTIONS: Array<{ value: string; label: string; swatch: string }> = [
  { value: 'accent', label: 'Accent', swatch: 'bg-accent-500' },
  { value: 'green', label: 'Green', swatch: 'bg-emerald-500' },
  { value: 'red', label: 'Red', swatch: 'bg-rose-500' },
  { value: 'yellow', label: 'Yellow', swatch: 'bg-amber-400' },
  { value: 'blue', label: 'Blue', swatch: 'bg-sky-500' },
];

function colorClass(color: string): string {
  switch (color) {
    case 'green': return 'bg-emerald-500';
    case 'red': return 'bg-rose-500';
    case 'yellow': return 'bg-amber-400';
    case 'blue': return 'bg-sky-500';
    default: return 'bg-accent-500';
  }
}

function urgencyClass(days: number): string {
  if (days < 0) return 'text-ink-400 dark:text-ink-500';
  if (days < 7) return 'text-rose-600 dark:text-rose-400';
  if (days < 30) return 'text-amber-600 dark:text-amber-400';
  return 'text-emerald-600 dark:text-emerald-400';
}

function formatDays(days: number): string {
  if (days < 0) return `${Math.abs(days)}d ago`;
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  return `${days} days`;
}

function daysUntil(ts: number): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(ts);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - now.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function todayIsoDate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function CountdownWidget() {
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState(todayIsoDate());
  const [color, setColor] = useState('accent');
  const [busy, setBusy] = useState(false);
  const [authed, setAuthed] = useState<boolean>(true);

  async function load() {
    try {
      const res = await fetch('/api/countdown', { cache: 'no-store' });
      if (res.status === 401) {
        setAuthed(false);
        setEvents([]);
        return;
      }
      const data = await res.json();
      setAuthed(true);
      setEvents(data.events || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
      setEvents([]);
    }
  }

  useEffect(() => { load(); }, []);

  const sortedEvents = useMemo(() => {
    if (!events) return [];
    return [...events].sort((a, b) => a.event_date - b.event_date);
  }, [events]);

  async function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim() || !eventDate) return;
    setBusy(true);
    setError(null);
    try {
      const ts = new Date(`${eventDate}T00:00:00`).getTime();
      const res = await fetch('/api/countdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), event_date: ts, color }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create event');
      }
      setTitle('');
      setEventDate(todayIsoDate());
      setColor('accent');
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm('Delete this countdown event?')) return;
    setError(null);
    try {
      const res = await fetch(`/api/countdown?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete event');
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete event');
    }
  }

  if (!authed) {
    return (
      <section className="rounded-xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-4 h-4 text-accent-500" />
          <h3 className="font-semibold text-sm">Days Countdown</h3>
        </div>
        <p className="text-xs text-ink-500 dark:text-ink-400">
          Sign in to track upcoming exams and events.
        </p>
      </section>
    );
  }

  if (events === null) {
    return (
      <section className="rounded-xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-4">
        <div className="flex items-center gap-2 text-sm text-ink-400 dark:text-ink-500">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Loading countdowns…
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-4">
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-accent-500" />
          <h3 className="font-semibold text-sm">Days Countdown</h3>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-accent-500 text-white hover:bg-accent-600"
          aria-expanded={showForm}
        >
          <Plus className="w-3 h-3" />
          {showForm ? 'Cancel' : 'Add'}
        </button>
      </header>

      {showForm && (
        <form onSubmit={onAdd} className="space-y-2 mb-3 p-3 rounded-lg bg-ink-50 dark:bg-ink-700/50">
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-ink-500 dark:text-ink-400 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Final exam, project deadline…"
              maxLength={120}
              required
              className="w-full text-sm rounded-md border border-ink-200 dark:border-ink-600 bg-white dark:bg-ink-800 px-2 py-1.5 text-ink-800 dark:text-ink-100"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-ink-500 dark:text-ink-400 mb-1">
              Date
            </label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
              className="w-full text-sm rounded-md border border-ink-200 dark:border-ink-600 bg-white dark:bg-ink-800 px-2 py-1.5 text-ink-800 dark:text-ink-100"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-ink-500 dark:text-ink-400 mb-1">
              Color
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setColor(opt.value)}
                  className={`w-6 h-6 rounded-full border-2 ${colorClass(opt.swatch)} ${
                    color === opt.value
                      ? 'border-ink-800 dark:border-ink-100 ring-2 ring-offset-1 ring-accent-400 dark:ring-offset-ink-800'
                      : 'border-transparent'
                  }`}
                  title={opt.label}
                  aria-label={opt.label}
                />
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={busy || !title.trim() || !eventDate}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-accent-500 text-white text-sm py-1.5 hover:bg-accent-600 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Add event
          </button>
        </form>
      )}

      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      {sortedEvents.length === 0 ? (
        <p className="text-xs text-ink-500 dark:text-ink-400">
          No events yet. Add an exam or deadline to see the countdown.
        </p>
      ) : (
        <ul className="space-y-2">
          {sortedEvents.map((ev) => {
            const days = daysUntil(ev.event_date);
            return (
              <li
                key={ev.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-ink-50 dark:bg-ink-700/40 border border-ink-100 dark:border-ink-700"
              >
                <span className={`w-2 h-2 rounded-full ${colorClass(ev.color)} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate text-ink-800 dark:text-ink-100">
                    {ev.title}
                  </div>
                  <div className="text-[11px] text-ink-500 dark:text-ink-400">
                    {new Date(ev.event_date).toLocaleDateString()}
                  </div>
                </div>
                <div className={`text-right shrink-0 ${urgencyClass(days)}`}>
                  <div className="text-base font-semibold leading-none">{Math.max(0, days)}</div>
                  <div className="text-[10px] uppercase tracking-wide">{formatDays(days)}</div>
                </div>
                <button
                  onClick={() => onDelete(ev.id)}
                  className="p-1 rounded hover:bg-ink-200 dark:hover:bg-ink-600 text-ink-400 hover:text-red-600"
                  title="Delete event"
                  aria-label="Delete event"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}