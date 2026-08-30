'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowUp, ArrowDown, Sparkles, Search, PenLine, Loader2, MessageSquare } from 'lucide-react';

type FeedItem = {
  type: 'generation' | 'post';
  id: string;
  kind: string;
  title: string;
  content: string;
  created_at: number;
  author_id: string;
  author_name: string;
  author_image: string | null;
  score: number;
  my_vote: number;
  comment_count: number;
  tags: string[] | null;
};

type GenRow = {
  id: string;
  kind: string;
  content: string;
  created_at: number;
  doc_title: string;
  author_id: string;
  author_name: string;
  author_image: string | null;
  score: number;
  my_vote: number;
};

type PostRow = {
  id: string;
  title: string;
  body: string;
  tags: string | null;
  visibility: string;
  created_at: number;
  author_id: string;
  author_name: string;
  author_image: string | null;
  score: number;
  my_vote: number;
  comment_count: number;
};

export default function ExplorePage() {
  const [gens, setGens] = useState<GenRow[] | null>(null);
  const [posts, setPosts] = useState<PostRow[] | null>(null);
  const [kind, setKind] = useState<'cheatsheet' | 'summary'>('cheatsheet');
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [posting, setPosting] = useState(false);

  async function loadGens() {
    const r = await fetch(`/api/explore?kind=${kind}`);
    if (r.status === 401) { window.location.href = '/login'; return; }
    const data = await r.json();
    setGens(data.cheatsheets);
  }

  async function loadPosts() {
    const r = await fetch('/api/posts?scope=feed');
    if (r.status === 401) { window.location.href = '/login'; return; }
    const data = await r.json();
    setPosts(data.posts.filter((p: PostRow) => p.visibility === 'public'));
  }

  useEffect(() => { loadGens(); }, [kind]);
  useEffect(() => { loadPosts(); }, []);

  const feed = useMemo<FeedItem[]>(() => {
    const g: FeedItem[] = (gens || []).map((x) => ({
      type: 'generation',
      id: x.id,
      kind: x.kind,
      title: x.doc_title,
      content: x.content,
      created_at: x.created_at,
      author_id: x.author_id,
      author_name: x.author_name,
      author_image: x.author_image,
      score: x.score,
      my_vote: x.my_vote,
      comment_count: 0,
      tags: null,
    }));
    const p: FeedItem[] = (posts || []).map((x) => {
      let parsedTags: string[] | null = null;
      try { parsedTags = x.tags ? (JSON.parse(x.tags) as string[]) : null; } catch { parsedTags = null; }
      return {
        type: 'post',
        id: x.id,
        kind: 'post',
        title: x.title,
        content: x.body,
        created_at: x.created_at,
        author_id: x.author_id,
        author_name: x.author_name,
        author_image: x.author_image,
        score: x.score,
        my_vote: x.my_vote,
        comment_count: x.comment_count,
        tags: parsedTags,
      };
    });
    return [...g, ...p].sort((a, b) => b.created_at - a.created_at);
  }, [gens, posts]);

  async function vote(item: FeedItem, value: 1 | -1 | 0) {
    const r = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ target_type: item.type === 'generation' ? 'cheatsheet' : 'post', target_id: item.id, value }),
    });
    if (r.ok) {
      if (item.type === 'generation') await loadGens();
      else await loadPosts();
    }
  }

  async function submit() {
    setPosting(true);
    try {
      const r = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title,
          body,
          tags: tags.split(',').map((s) => s.trim()).filter(Boolean),
          visibility: 'public',
        }),
      });
      if (r.ok) { setShowNew(false); setTitle(''); setBody(''); setTags(''); await loadPosts(); }
    } finally { setPosting(false); }
  }

  const filtered = feed.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const tagsText = c.tags?.join(' ') || '';
    return c.content.toLowerCase().includes(q) || c.title.toLowerCase().includes(q) || c.author_name.toLowerCase().includes(q) || tagsText.toLowerCase().includes(q);
  });

  const loaded = gens !== null || posts !== null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent-500" /> Explore
          </h1>
          <p className="text-ink-600 dark:text-ink-400 text-sm mt-1">Public cheatsheets, summaries, and posts shared by the community.</p>
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={() => setShowNew(true)} className="px-3 py-1.5 rounded bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 flex items-center gap-1.5">
            <PenLine className="w-4 h-4" /> New Post
          </button>
          <div className="flex gap-2">
            {(['cheatsheet', 'summary'] as const).map((k) => (
              <button key={k} onClick={() => setKind(k)}
                className={`px-3 py-1.5 rounded text-sm font-medium border ${kind === k ? 'bg-accent-500 text-white border-accent-500' : 'border-ink-200 dark:border-ink-600 text-ink-600 dark:text-ink-400 hover:bg-ink-50 dark:hover:bg-ink-700'}`}>
                {k}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 dark:text-ink-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by content, title, or author..."
          className="w-full pl-10 pr-4 py-2.5 border border-ink-200 dark:border-ink-600 dark:bg-ink-900 dark:text-ink-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-400"
        />
      </div>

      {!loaded ? (
        <div className="text-ink-400 dark:text-ink-500 text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-200 dark:border-ink-600 p-8 text-center text-sm text-ink-400 dark:text-ink-500">
          {search ? <p>No results for &quot;{search}&quot;</p> : <p>No public content yet.</p>}
        </div>
      ) : (
        <ul className="space-y-4">
          {filtered.map((c) => (
            <li key={`${c.type}-${c.id}`} className="rounded-2xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-5">
              <div className="flex items-center justify-between mb-3 gap-2">
                <div className="flex items-center gap-2 text-sm min-w-0">
                  <Avatar name={c.author_name} image={c.author_image} />
                  <Link href={`/u/${c.author_id}`} className="font-medium hover:underline shrink-0">{c.author_name}</Link>
                  <span className="text-ink-400 dark:text-ink-500">·</span>
                  {c.type === 'generation' ? (
                    <>
                      <span className="text-ink-600 dark:text-ink-400 truncate">{c.title}</span>
                      <span className="text-ink-400 dark:text-ink-500">·</span>
                      <span className="text-xs uppercase tracking-wide text-accent-600 font-medium shrink-0">{c.kind}</span>
                    </>
                  ) : (
                    <span className="text-ink-400 dark:text-ink-500 shrink-0 flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> post</span>
                  )}
                  <span className="text-ink-400 dark:text-ink-500">·</span>
                  <span className="text-xs text-ink-400 dark:text-ink-500 shrink-0">{new Date(c.created_at).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => vote(c, c.my_vote === 1 ? 0 : 1)} className={`p-1 rounded hover:bg-ink-100 dark:hover:bg-ink-700 ${c.my_vote === 1 ? 'text-accent-600' : 'text-ink-400 dark:text-ink-500'}`} aria-label="Upvote"><ArrowUp className="w-4 h-4" /></button>
                  <span className="text-sm tabular-nums w-6 text-center">{c.score}</span>
                  <button onClick={() => vote(c, c.my_vote === -1 ? 0 : -1)} className={`p-1 rounded hover:bg-ink-100 dark:hover:bg-ink-700 ${c.my_vote === -1 ? 'text-red-500' : 'text-ink-400 dark:text-ink-500'}`} aria-label="Downvote"><ArrowDown className="w-4 h-4" /></button>
                </div>
              </div>

              <Link href={`/explore/${c.id}`} className="block group">
                {c.type === 'post' && (
                  <h2 className="font-semibold mb-1 group-hover:text-accent-600 transition-colors">{c.title}</h2>
                )}
                <div className="markdown-body text-sm max-h-72 overflow-hidden relative">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{c.content.slice(0, 1500)}</ReactMarkdown>
                  {c.content.length > 1500 && (
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white dark:from-ink-800 to-transparent" />
                  )}
                </div>
                {c.type === 'post' && (
                  <div className="mt-2 text-xs text-ink-400 dark:text-ink-500 flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" /> {c.comment_count} {c.comment_count === 1 ? 'comment' : 'comments'}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {showNew && (
        <div className="fixed inset-0 z-50 bg-ink-900/40 flex items-center justify-center p-4" onClick={() => setShowNew(false)}>
          <div className="bg-white dark:bg-ink-800 rounded-2xl shadow-2xl max-w-xl w-full p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-3">Create a new post</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-ink-200 dark:border-ink-600 dark:bg-ink-900 dark:text-ink-100 rounded-md p-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Body (Markdown OK)</label>
                <textarea value={body} onChange={(e) => setBody(e.target.value)} className="w-full border border-ink-200 dark:border-ink-600 dark:bg-ink-900 dark:text-ink-100 rounded-md p-2 text-sm min-h-[140px] font-mono" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tags (comma separated)</label>
                <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="biology, photosynthesis" className="w-full border border-ink-200 dark:border-ink-600 dark:bg-ink-900 dark:text-ink-100 rounded-md p-2 text-sm" />
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

function Avatar({ name, image }: { name: string; image: string | null }) {
  if (image) return <img src={image} alt="" className="w-5 h-5 rounded-full" />;
  return <span className="w-5 h-5 rounded-full bg-accent-500 text-white text-[10px] font-medium flex items-center justify-center">{(name || '?').slice(0, 1).toUpperCase()}</span>;
}
