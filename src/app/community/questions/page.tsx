'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUp, ArrowDown, MessageSquare, Plus, Loader2, Users as UsersIcon } from 'lucide-react';
import { LaurelFrame } from '@/components/LaurelFrame';

type Post = {
  id: string;
  title: string;
  body: string;
  tags: string | null;
  visibility: string;
  room_id: string | null;
  created_at: number;
  author_id: string;
  author_name: string;
  author_image: string | null;
  author_avatar_frame: string | null;
  score: number;
  my_vote: number;
  comment_count: number;
};

export default function QuestionsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Post[] | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [posting, setPosting] = useState(false);

  async function load() {
    const r = await fetch('/api/posts?scope=feed');
    if (r.status === 401) { router.push('/login'); return; }
    const d = await r.json();
    setItems(d.posts);
  }
  useEffect(() => { load(); }, []);

  async function vote(id: string, value: 1 | -1 | 0) {
    const r = await fetch('/api/posts/' + id, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'vote', value: value }),
    });
    if (r.ok) load();
  }

  async function submit() {
    setPosting(true);
    try {
      const r = await fetch('/api/posts', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, body, tags: tags.split(',').map((s) => s.trim()).filter(Boolean), visibility: 'public' }),
      });
      if (r.ok) { setShowNew(false); setTitle(''); setBody(''); setTags(''); await load(); }
    } finally { setPosting(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-accent-500" /> Q&amp;A Forum
          </h1>
          <p className="text-ink-600 dark:text-ink-400 text-sm mt-1">Ask anything about your study material. Anyone in the community can answer.</p>
        </div>
        <button onClick={() => setShowNew(true)} className="px-3 py-1.5 rounded bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Ask a question
        </button>
      </div>

      {items === null ? (
        <div className="text-ink-400 dark:text-ink-500 text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-200 dark:border-ink-600 p-8 text-center text-sm text-ink-400 dark:text-ink-500">
          No questions yet. Be the first to ask!
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((p) => (
            <li key={p.id} className="rounded-xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-4 flex gap-3">
              <div className="flex flex-col items-center text-sm text-ink-600 dark:text-ink-400 w-10">
                <button onClick={() => vote(p.id, p.my_vote === 1 ? 0 : 1)} className={`p-1 rounded hover:bg-ink-100 dark:hover:bg-ink-700 ${p.my_vote === 1 ? 'text-accent-600' : ''}`}><ArrowUp className="w-4 h-4" /></button>
                <span className="tabular-nums">{p.score}</span>
                <button onClick={() => vote(p.id, p.my_vote === -1 ? 0 : -1)} className={`p-1 rounded hover:bg-ink-100 dark:hover:bg-ink-700 ${p.my_vote === -1 ? 'text-red-500' : ''}`}><ArrowDown className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/community/questions/${p.id}`} className="font-medium hover:underline">{p.title}</Link>
                <p className="text-sm text-ink-600 dark:text-ink-400 line-clamp-2 mt-1">{p.body}</p>
                <div className="text-xs text-ink-400 dark:text-ink-500 mt-1.5 flex items-center gap-2">
                  <Link href={`/u/${p.author_id}`}>
                    <LaurelFrame frameId={p.author_avatar_frame || 'none'} size={24}>
                      {p.author_image ? <img src={p.author_image} className="w-4 h-4 rounded-full" /> : <span className="w-4 h-4 rounded-full bg-accent-500 text-white text-[8px] font-medium flex items-center justify-center">{(p.author_name || '?').slice(0,1).toUpperCase()}</span>}
                    </LaurelFrame>
                  </Link>
                  <span>by <Link href={`/u/${p.author_id}`} className="hover:underline">{p.author_name}</Link></span>
                  <span>·</span>
                  <span>{new Date(p.created_at).toLocaleString()}</span>
                  <span>·</span>
                  <span>{p.comment_count} answers</span>
                  {p.tags && (() => { try { return (JSON.parse(p.tags) as string[]).map((t) => <span key={t} className="px-1.5 py-0.5 rounded bg-ink-100 dark:bg-ink-700 text-ink-600 dark:text-ink-300 mr-1">#{t}</span>); } catch { return null; } })()}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showNew && (
        <div className="fixed inset-0 z-50 bg-ink-900/40 flex items-center justify-center p-4" onClick={() => setShowNew(false)}>
          <div className="bg-white dark:bg-ink-800 rounded-2xl shadow-2xl max-w-xl w-full p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-3">Ask a question</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-ink-200 dark:border-ink-600 bg-white dark:bg-ink-900 dark:text-ink-100 rounded-md p-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Body (Markdown OK)</label>
                <textarea value={body} onChange={(e) => setBody(e.target.value)} className="w-full border border-ink-200 dark:border-ink-600 bg-white dark:bg-ink-900 dark:text-ink-100 rounded-md p-2 text-sm min-h-[120px] font-mono" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tags (comma separated)</label>
                <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="biology, photosynthesis" className="w-full border border-ink-200 dark:border-ink-600 bg-white dark:bg-ink-900 dark:text-ink-100 rounded-md p-2 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowNew(false)} className="px-3 py-1.5 rounded text-sm hover:bg-ink-100 dark:hover:bg-ink-700">Cancel</button>
              <button onClick={submit} disabled={!title.trim() || !body.trim() || posting} className="px-3 py-1.5 rounded bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 disabled:opacity-50 flex items-center gap-1.5">
                {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {posting ? 'Posting…' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
