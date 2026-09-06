'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { LaurelFrame } from '@/components/LaurelFrame';
import { ArrowUp, ArrowDown, Loader2, Check, Send, ArrowLeft, Pencil, Trash2, Flag } from 'lucide-react';
import Link from 'next/link';

type Comment = {
  id: string;
  body: string;
  author_id: string;
  author_name: string;
  author_image: string | null;
  author_avatar_frame: string | null;
  created_at: number;
  score: number;
  my_vote: number;
};

type Post = {
  id: string;
  title: string;
  body: string;
  tags: string | null;
  author_id: string;
  author_name: string;
  author_image: string | null;
  author_avatar_frame: string | null;
  created_at: number;
  best_answer_id: string | null;
  score: number;
  my_vote: number;
};

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [me, setMe] = useState<{ id: string; role: string | null } | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);

  async function load() {
    const r = await fetch(`/api/posts/${params.id}`);
    if (r.status === 401) { router.push('/login'); return; }
    if (r.status === 404) { setPost(null); return; }
    const d = await r.json();
    setPost(d.post);
    setComments(d.comments || []);
  }
  useEffect(() => { load(); }, [params.id]);
  useEffect(() => {
    fetch('/api/auth').then((r) => r.json()).then((d) => setMe(d.user || null)).catch(() => {});
  }, []);

  const canEdit = me && post && (post.author_id === me.id || me.role === 'admin');

  function openEdit() {
    if (!post) return;
    setEditTitle(post.title);
    setEditBody(post.body);
    setEditing(true);
  }

  async function saveEdit() {
    if (!editTitle.trim() || !editBody.trim()) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/posts/${params.id}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: editTitle, body: editBody }),
      });
      if (r.ok) { setEditing(false); await load(); }
    } finally { setSaving(false); }
  }

  async function remove() {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    const r = await fetch(`/api/posts/${params.id}`, { method: 'DELETE' });
    if (r.ok) router.push('/community/questions');
  }

  async function vote(target: 'post' | 'comment', id: string, value: 1 | -1 | 0) {
    const url = target === 'post' ? `/api/posts/${params.id}` : '/api/vote';
    const body = target === 'post'
      ? { action: 'vote', value }
      : { target_type: 'comment', target_id: id, value };
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (r.ok) load();
  }

  async function submit() {
    if (!body.trim()) return;
    setPosting(true);
    try {
      const r = await fetch(`/api/posts/${params.id}`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'comment', body }),
      });
      if (r.ok) { setBody(''); await load(); }
    } finally { setPosting(false); }
  }

  async function markBest(commentId: string) {
    const r = await fetch(`/api/posts/${params.id}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'best_answer', comment_id: commentId }),
    });
    if (r.ok) load();
  }

  async function report() {
    if (!reportReason.trim()) return;
    setReporting(true);
    try {
      const r = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ post_id: params.id, reason: reportReason }),
      });
      const d = await r.json();
      if (r.ok) {
        setReportOpen(false);
        setReportReason('');
        alert('Report submitted. Thank you!');
      } else {
        alert(d.error || 'Failed to report');
      }
    } catch {
      alert('Failed to report');
    } finally { setReporting(false); }
  }

  if (!post) return <div className="text-ink-400 dark:text-ink-500 text-sm">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/community/questions" className="text-sm text-ink-600 dark:text-ink-400 hover:underline flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Back to forum</Link>
      </div>
      <article className="rounded-2xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-6">
        <div className="flex gap-4">
          <div className="flex flex-col items-center text-sm text-ink-600 dark:text-ink-400 w-10">
            <button onClick={() => vote('post', post.id, post.my_vote === 1 ? 0 : 1)} className={`p-1 rounded hover:bg-ink-100 dark:hover:bg-ink-700 ${post.my_vote === 1 ? 'text-accent-600' : ''}`}><ArrowUp className="w-5 h-5" /></button>
            <span className="tabular-nums">{post.score}</span>
            <button onClick={() => vote('post', post.id, post.my_vote === -1 ? 0 : -1)} className={`p-1 rounded hover:bg-ink-100 dark:hover:bg-ink-700 ${post.my_vote === -1 ? 'text-red-500' : ''}`}><ArrowDown className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-semibold dark:text-ink-100">{post.title}</h1>
              <div className="flex items-center gap-1 shrink-0">
                {canEdit && (
                  <>
                    <button onClick={openEdit} title="Edit post" className="p-1.5 rounded hover:bg-ink-100 dark:hover:bg-ink-700 text-ink-600 dark:text-ink-400"><Pencil className="w-4 h-4" /></button>
                    <button onClick={remove} title="Delete post" className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </>
                )}
                {me && me.id !== post.author_id && (
                  <button onClick={() => setReportOpen(true)} title="Report post" className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-ink-400 dark:text-ink-500 hover:text-red-600 flex items-center gap-1 text-xs">
                    <Flag className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="text-xs text-ink-400 dark:text-ink-500 mt-1 flex items-center gap-2">
              <Link href={`/u/${post.author_id}`}>
                <LaurelFrame frameId={post.author_avatar_frame || 'none'} size={24}>
                  {post.author_image ? <img src={post.author_image} className="w-4 h-4 rounded-full" /> : <span className="w-4 h-4 rounded-full bg-accent-500 text-white text-[8px] font-medium flex items-center justify-center">{(post.author_name || '?').slice(0,1).toUpperCase()}</span>}
                </LaurelFrame>
              </Link>
              <span>asked by <Link href={`/u/${post.author_id}`} className="hover:underline">{post.author_name}</Link></span>
              <span>·</span>
              <span>{new Date(post.created_at).toLocaleString()}</span>
              {post.tags && (() => { try { return (JSON.parse(post.tags) as string[]).map((t) => <span key={t} className="px-1.5 py-0.5 rounded bg-ink-100 dark:bg-ink-700 text-ink-600 dark:text-ink-300 mr-1">#{t}</span>); } catch { return null; } })()}
            </div>
            <div className="markdown-body text-sm mt-4">
              <MarkdownRenderer>{post.body}</MarkdownRenderer>
            </div>
          </div>
        </div>
      </article>

      <section>
        <h2 className="text-lg font-semibold mb-3 dark:text-ink-100">{comments.length} {comments.length === 1 ? 'answer' : 'answers'}</h2>
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className={`rounded-xl border ${post.best_answer_id === c.id ? 'border-green-300 dark:border-green-700 bg-green-50/40 dark:bg-green-900/20' : 'border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800'} p-4 flex gap-3`}>
              <div className="flex flex-col items-center text-sm text-ink-600 dark:text-ink-400 w-10">
                <button onClick={() => vote('comment', c.id, c.my_vote === 1 ? 0 : 1)} className={`p-1 rounded hover:bg-ink-100 dark:hover:bg-ink-700 ${c.my_vote === 1 ? 'text-accent-600' : ''}`}><ArrowUp className="w-4 h-4" /></button>
                <span className="tabular-nums">{c.score}</span>
                <button onClick={() => vote('comment', c.id, c.my_vote === -1 ? 0 : -1)} className={`p-1 rounded hover:bg-ink-100 dark:hover:bg-ink-700 ${c.my_vote === -1 ? 'text-red-500' : ''}`}><ArrowDown className="w-4 h-4" /></button>
                {post.author_id && c.id && post.author_id && (
                  post.best_answer_id === c.id ? (
                    <span title="Best answer" className="text-green-600 mt-1"><Check className="w-4 h-4" /></span>
                  ) : null
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="markdown-body text-sm">
                  <MarkdownRenderer>{c.body}</MarkdownRenderer>
                </div>
                <div className="text-xs text-ink-400 dark:text-ink-500 mt-2 flex items-center gap-2">
                  <Link href={`/u/${c.author_id}`}>
                    <LaurelFrame frameId={c.author_avatar_frame || 'none'} size={24}>
                      {c.author_image ? <img src={c.author_image} className="w-4 h-4 rounded-full" /> : <span className="w-4 h-4 rounded-full bg-accent-500 text-white text-[8px] font-medium flex items-center justify-center">{(c.author_name || '?').slice(0,1).toUpperCase()}</span>}
                    </LaurelFrame>
                  </Link>
                  <span>by <Link href={`/u/${c.author_id}`} className="hover:underline">{c.author_name}</Link></span>
                  <span>·</span>
                  <span>{new Date(c.created_at).toLocaleString()}</span>
                  {post.best_answer_id !== c.id && (
                    <button onClick={() => markBest(c.id)} className="ml-auto text-xs text-accent-600 hover:underline flex items-center gap-1">
                      <Check className="w-3 h-3" /> Mark as best answer
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 rounded-xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-4">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your answer (Markdown OK)…"
            className="w-full border border-ink-200 dark:border-ink-600 bg-white dark:bg-ink-900 dark:text-ink-100 rounded-md p-2 text-sm min-h-[100px] font-mono"
          />
          <div className="flex justify-end mt-2">
            <button onClick={submit} disabled={!body.trim() || posting} className="px-3 py-1.5 rounded bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 disabled:opacity-50 flex items-center gap-1.5">
              {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {posting ? 'Posting…' : 'Answer'}
            </button>
          </div>
        </div>
      </section>

      {editing && (
        <div className="fixed inset-0 z-50 bg-ink-900/40 flex items-center justify-center p-4" onClick={() => setEditing(false)}>
          <div className="bg-white dark:bg-ink-800 rounded-2xl shadow-2xl max-w-xl w-full p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-3 dark:text-ink-100">Edit post</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-ink-200">Title</label>
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full border border-ink-200 dark:border-ink-600 bg-white dark:bg-ink-900 dark:text-ink-100 rounded-md p-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-ink-200">Body (Markdown OK)</label>
                <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} className="w-full border border-ink-200 dark:border-ink-600 bg-white dark:bg-ink-900 dark:text-ink-100 rounded-md p-2 text-sm min-h-[200px] font-mono" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setEditing(false)} className="px-3 py-1.5 rounded text-sm hover:bg-ink-100 dark:hover:bg-ink-700">Cancel</button>
              <button onClick={saveEdit} disabled={!editTitle.trim() || !editBody.trim() || saving} className="px-3 py-1.5 rounded bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 disabled:opacity-50 flex items-center gap-1.5">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setReportOpen(false)}>
          <div className="bg-white dark:bg-ink-800 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-3 dark:text-ink-100">Report this post</h3>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Why is this post inappropriate? (e.g. spam, hate speech, explicit content…)"
              className="w-full border border-ink-200 dark:border-ink-600 bg-white dark:bg-ink-900 dark:text-ink-100 rounded-lg p-3 text-sm min-h-[100px]"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setReportOpen(false)} className="px-4 py-2 text-sm rounded-lg hover:bg-ink-100 dark:hover:bg-ink-700">Cancel</button>
              <button onClick={report} disabled={reporting || !reportReason.trim()} className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50">
                {reporting ? 'Submitting…' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
