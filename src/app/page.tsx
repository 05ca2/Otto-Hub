'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upload, FileText, Trash2, Loader2, Sparkles, Users } from 'lucide-react';

type DocListItem = {
  id: string;
  title: string;
  source_type: string;
  mime: string | null;
  size: number | null;
  created_at: number;
  content_length: number;
};

export default function HomePage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<DocListItem[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch('/api/documents', { cache: 'no-store' });
    if (res.status === 401) {
      setItems([]);
      return;
    }
    const data = await res.json();
    setItems(data.documents || []);
  }

  useEffect(() => { load(); }, []);

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = inputRef.current?.files?.[0];
    if (!f) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', f);
    try {
      const res = await fetch('/api/documents', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) { router.push('/login'); return; }
        throw new Error(data.error || 'Upload failed');
      }
      await load();
      router.push(`/reader/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function onDelete(id: string) {
    if (!confirm('Delete this document and all its generated content?')) return;
    await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    await load();
  }

  if (items === null) {
    return <div className="text-ink-400 dark:text-ink-500 text-sm">Loading…</div>;
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="rounded-2xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-6">
        <h1 className="text-2xl font-semibold mb-1">Welcome to Otto-Hub</h1>
        <p className="text-ink-600 dark:text-ink-400 mb-5">
          Your AI-powered study assistant. Upload any document — PDF, DOCX, PPTX, or text — and let AI 
          generate cheatsheets, summaries, and practice questions instantly. Select text to 
          ask Otter AI questions and get instant explanations.
        </p>
        <div className="grid sm:grid-cols-3 gap-4 mb-5">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-ink-50 dark:bg-ink-700/50">
            <Sparkles className="w-5 h-5 text-accent-500 mt-0.5" />
            <div>
              <div className="font-medium text-sm">AI Generation</div>
              <div className="text-xs text-ink-500 dark:text-ink-400">Cheatsheets, summaries, and practice questions</div>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-ink-50 dark:bg-ink-700/50">
            <FileText className="w-5 h-5 text-accent-500 mt-0.5" />
            <div>
              <div className="font-medium text-sm">Smart Reader</div>
              <div className="text-xs text-ink-500 dark:text-ink-400">Select text and ask Otter AI to explain</div>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-ink-50 dark:bg-ink-700/50">
            <Users className="w-5 h-5 text-accent-500 mt-0.5" />
            <div>
              <div className="font-medium text-sm">Collaborate</div>
              <div className="text-xs text-ink-500 dark:text-ink-400">Join study rooms and share knowledge</div>
            </div>
          </div>
        </div>
        <form onSubmit={onUpload} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.pptx,.ppt,.txt,.md,.markdown,.rst,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/markdown"
            className="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-accent-500 file:text-white hover:file:bg-accent-600 file:cursor-pointer border border-ink-200 dark:border-ink-600 rounded-md p-1 dark:bg-ink-700 dark:text-ink-200"
          />
          <button
            type="submit"
            disabled={uploading}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-accent-500 text-white px-4 py-2 font-medium hover:bg-accent-600 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </form>
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        <p className="text-xs text-ink-400 dark:text-ink-500 mt-3">Supports PDF, DOCX, PPTX, TXT, and Markdown files.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent-500" /> Your documents
        </h2>
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-200 dark:border-ink-600 p-6 text-center text-sm text-ink-400">
            <p>No documents yet. Upload one above to get started.</p>
            <p className="mt-2">
              <Link href="/explore" className="text-accent-600 hover:underline">Browse community cheatsheets →</Link>
            </p>
          </div>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-3">
            {items.map((d) => (
              <li key={d.id} className="rounded-xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-4 flex items-start gap-3">
                <FileText className="w-5 h-5 text-accent-500 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <Link href={`/reader/${d.id}`} className="block font-medium hover:underline truncate dark:text-ink-100">
                    {d.title}
                  </Link>
                  <div className="text-xs text-ink-400 dark:text-ink-500 mt-0.5">
                    {(d.content_length / 1000).toFixed(1)}k chars · {new Date(d.created_at).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => onDelete(d.id)}
                  className="p-1.5 rounded hover:bg-ink-100 dark:hover:bg-ink-700 text-ink-400 hover:text-red-600"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
