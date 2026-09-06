'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { ArrowUp, ArrowDown, Sparkles, Search, PenLine, Loader2, MessageSquare, ImagePlus, X, Pencil, Trash2, Maximize2, Minimize2 } from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';
import { t } from '@/lib/translations';

type Me = { id: string; name: string } | null;

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
  const { locale } = useLanguage();
  const [me, setMe] = useState<Me>(null);
  const [gens, setGens] = useState<GenRow[] | null>(null);
  const [posts, setPosts] = useState<PostRow[] | null>(null);
  const [kind, setKind] = useState<'cheatsheet' | 'summary'>('cheatsheet');
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [posting, setPosting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  // Edit state
  const [editingPost, setEditingPost] = useState<FeedItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [deletingPost, setDeletingPost] = useState<FeedItem | null>(null);

  useEffect(() => {
    fetch('/api/auth').then((r) => r.json()).then((d) => setMe(d.user || null)).catch(() => {});
  }, []);

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

  async function onImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch('/api/upload-image', { method: 'POST', body: fd });
      if (!r.ok) { alert('Upload failed'); return; }
      const { url } = await r.json();
      const markdown = `![${file.name}](${url})`;
      // Insert at cursor or append
      const textarea = bodyRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newBody = body.slice(0, start) + markdown + body.slice(end);
        setBody(newBody);
        // Move cursor after inserted text
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + markdown.length;
          textarea.focus();
        }, 0);
      } else {
        setBody(body + '\n' + markdown);
      }
    } finally {
      setImageUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  }

  function startEdit(item: FeedItem) {
    if (item.type !== 'post') return;
    let tagsStr = '';
    try { tagsStr = item.tags?.join(', ') || ''; } catch { tagsStr = ''; }
    setEditingPost(item);
    setEditTitle(item.title);
    setEditBody(item.content);
    setEditTags(tagsStr);
  }

  async function saveEdit() {
    if (!editingPost) return;
    setEditSaving(true);
    try {
      const r = await fetch(`/api/posts/${editingPost.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          body: editBody,
          tags: editTags.split(',').map((s) => s.trim()).filter(Boolean),
        }),
      });
      if (r.ok) {
        setEditingPost(null);
        await loadPosts();
      }
    } finally { setEditSaving(false); }
  }

  async function deletePost() {
    if (!deletingPost) return;
    const r = await fetch(`/api/posts/${deletingPost.id}`, { method: 'DELETE' });
    if (r.ok) {
      setDeletingPost(null);
      await loadPosts();
    }
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
            <Sparkles className="w-5 h-5 text-accent-500" /> {t(locale, 'explore.title')}
          </h1>
          <p className="text-ink-600 dark:text-ink-400 text-sm mt-1">{t(locale, 'explore.description')}</p>
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={() => setShowNew(true)} className="px-3 py-1.5 rounded bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 flex items-center gap-1.5">
            <PenLine className="w-4 h-4" /> {t(locale, 'explore.newPost')}
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
          placeholder={t(locale, 'explore.search')}
          className="w-full pl-10 pr-4 py-2.5 border border-ink-200 dark:border-ink-600 bg-white dark:bg-ink-900 dark:text-ink-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-400"
        />
      </div>

      {!loaded ? (
        <div className="text-ink-400 dark:text-ink-500 text-sm">{t(locale, 'common.loading')}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-200 dark:border-ink-600 p-8 text-center text-sm text-ink-400 dark:text-ink-500">
          {search ? <p>{t(locale, 'explore.noResults')} &quot;{search}&quot;</p> : <p>{t(locale, 'explore.noContent')}</p>}
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
                    <span className="text-ink-400 dark:text-ink-500 shrink-0 flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> {t(locale, 'explore.post')}</span>
                  )}
                  <span className="text-ink-400 dark:text-ink-500">·</span>
                  <span className="text-xs text-ink-400 dark:text-ink-500 shrink-0">{new Date(c.created_at).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {c.type === 'post' && me && c.author_id === me.id && (
                    <>
                      <button onClick={() => startEdit(c)} className="p-1 rounded hover:bg-ink-100 dark:hover:bg-ink-700 text-ink-400 dark:text-ink-500" aria-label={t(locale, 'explore.editPost')}><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => setDeletingPost(c)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-ink-400 dark:text-ink-500 hover:text-red-500" aria-label={t(locale, 'common.delete')}><Trash2 className="w-4 h-4" /></button>
                    </>
                  )}
                  <button onClick={() => vote(c, c.my_vote === 1 ? 0 : 1)} className={`p-1 rounded hover:bg-ink-100 dark:hover:bg-ink-700 ${c.my_vote === 1 ? 'text-accent-600' : 'text-ink-400 dark:text-ink-500'}`} aria-label="Upvote"><ArrowUp className="w-4 h-4" /></button>
                  <span className="text-sm tabular-nums w-6 text-center">{c.score}</span>
                  <button onClick={() => vote(c, c.my_vote === -1 ? 0 : -1)} className={`p-1 rounded hover:bg-ink-100 dark:hover:bg-ink-700 ${c.my_vote === -1 ? 'text-red-500' : 'text-ink-400 dark:text-ink-500'}`} aria-label="Downvote"><ArrowDown className="w-4 h-4" /></button>
                </div>
              </div>

              <Link href={`/explore/${c.id}`} className="block group">
                {c.type === 'post' && (
                  <h2 className="font-semibold mb-1 group-hover:text-accent-600 transition-colors dark:text-ink-100">{c.title}</h2>
                )}
                <div className="markdown-body text-sm max-h-72 overflow-hidden relative">
                  <MarkdownRenderer>{c.content.slice(0, 1500)}</MarkdownRenderer>
                  {c.content.length > 1500 && (
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white dark:from-ink-800 to-transparent" />
                  )}
                </div>
                {c.type === 'post' && (
                  <div className="mt-2 text-xs text-ink-400 dark:text-ink-500 flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" /> {c.comment_count} {c.comment_count === 1 ? t(locale, 'explore.comment') : t(locale, 'explore.comments')}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {showNew && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-ink-900 flex flex-col" onClick={() => setShowNew(false)}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-ink-200 dark:border-ink-700">
            <h3 className="font-semibold dark:text-ink-100">{t(locale, 'explore.createPost')}</h3>
            <button onClick={() => setShowNew(false)} className="p-1.5 rounded hover:bg-ink-100 dark:hover:bg-ink-700"><X className="w-5 h-5 dark:text-ink-300" /></button>
          </div>
          <div className="flex-1 overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="max-w-3xl mx-auto space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-ink-200">{t(locale, 'explore.titleLabel')}</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-ink-200 dark:border-ink-600 dark:bg-ink-800 dark:text-ink-100 rounded-md p-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-ink-200">{t(locale, 'explore.body')}</label>
                <textarea ref={bodyRef} value={body} onChange={(e) => setBody(e.target.value)} className="w-full border border-ink-200 dark:border-ink-600 dark:bg-ink-800 dark:text-ink-100 rounded-md p-3 text-sm min-h-[300px] font-mono leading-relaxed" />
                <div className="flex items-center gap-2 mt-1.5">
                  <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={onImageUpload} />
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={imageUploading}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-ink-200 dark:border-ink-600 text-xs text-ink-600 dark:text-ink-400 hover:bg-ink-50 dark:hover:bg-ink-700 disabled:opacity-50"
                  >
                    {imageUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImagePlus className="w-3 h-3" />}
                    {imageUploading ? t(locale, 'home.uploading') : t(locale, 'explore.insertImage')}
                  </button>
                  <span className="text-xs text-ink-400 dark:text-ink-500">{t(locale, 'explore.imageHint')}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-ink-200">{t(locale, 'explore.tags')}</label>
                <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder={t(locale, 'explore.tagsPlaceholder')} className="w-full border border-ink-200 dark:border-ink-600 dark:bg-ink-800 dark:text-ink-100 rounded-md p-2.5 text-sm" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 px-6 py-3 border-t border-ink-200 dark:border-ink-700">
            <button onClick={() => setShowNew(false)} className="px-3 py-1.5 rounded text-sm hover:bg-ink-100 dark:hover:bg-ink-700">{t(locale, 'common.cancel')}</button>
            <button onClick={submit} disabled={!title.trim() || !body.trim() || posting} className="px-4 py-1.5 rounded bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 disabled:opacity-50 flex items-center gap-1.5">
              {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {posting ? t(locale, 'explore.posting') : t(locale, 'explore.postBtn')}
            </button>
          </div>
        </div>
      )}

      {/* Edit post modal - fullscreen */}
      {editingPost && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-ink-900 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-ink-200 dark:border-ink-700">
            <h3 className="font-semibold dark:text-ink-100">{t(locale, 'explore.editPost')}</h3>
            <button onClick={() => setEditingPost(null)} className="p-1.5 rounded hover:bg-ink-100 dark:hover:bg-ink-700"><X className="w-5 h-5 dark:text-ink-300" /></button>
          </div>
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-3xl mx-auto space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-ink-200">{t(locale, 'explore.titleLabel')}</label>
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full border border-ink-200 dark:border-ink-600 dark:bg-ink-800 dark:text-ink-100 rounded-md p-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-ink-200">{t(locale, 'explore.body')}</label>
                <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} className="w-full border border-ink-200 dark:border-ink-600 dark:bg-ink-800 dark:text-ink-100 rounded-md p-3 text-sm min-h-[300px] font-mono leading-relaxed" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-ink-200">{t(locale, 'explore.tags')}</label>
                <input value={editTags} onChange={(e) => setEditTags(e.target.value)} placeholder={t(locale, 'explore.tagsPlaceholder')} className="w-full border border-ink-200 dark:border-ink-600 dark:bg-ink-800 dark:text-ink-100 rounded-md p-2.5 text-sm" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 px-6 py-3 border-t border-ink-200 dark:border-ink-700">
            <button onClick={() => setEditingPost(null)} className="px-3 py-1.5 rounded text-sm hover:bg-ink-100 dark:hover:bg-ink-700">{t(locale, 'common.cancel')}</button>
            <button onClick={saveEdit} disabled={!editTitle.trim() || !editBody.trim() || editSaving} className="px-4 py-1.5 rounded bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 disabled:opacity-50 flex items-center gap-1.5">
              {editSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {editSaving ? t(locale, 'explore.saving') : t(locale, 'common.save')}
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deletingPost && (
        <div className="fixed inset-0 z-50 bg-ink-900/40 flex items-center justify-center p-4" onClick={() => setDeletingPost(null)}>
          <div className="bg-white dark:bg-ink-800 rounded-2xl shadow-2xl max-w-sm w-full p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold dark:text-ink-100">{t(locale, 'explore.deletePost')}</h3>
            <p className="text-sm text-ink-600 dark:text-ink-400 mt-2">{t(locale, 'explore.deleteConfirm')} &quot;{deletingPost.title}&quot; {t(locale, 'explore.deleteAndAll')}</p>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setDeletingPost(null)} className="px-3 py-1.5 rounded text-sm hover:bg-ink-100 dark:hover:bg-ink-700">{t(locale, 'common.cancel')}</button>
              <button onClick={deletePost} className="px-3 py-1.5 rounded bg-red-500 text-white text-sm font-medium hover:bg-red-600">{t(locale, 'common.delete')}</button>
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
