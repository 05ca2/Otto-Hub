'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upload, FileText, Trash2, Loader2, Sparkles, Users, CheckCircle2, XCircle } from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';
import { t } from '@/lib/translations';

type DocListItem = {
  id: string;
  title: string;
  source_type: string;
  mime: string | null;
  size: number | null;
  created_at: number;
  content_length: number;
};

type UploadItem = {
  file: File;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
  docId?: string;
};

export default function HomePage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { locale } = useLanguage();
  const [items, setItems] = useState<DocListItem[] | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<UploadItem[]>([]);
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

  function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newItems: UploadItem[] = Array.from(files).map(file => ({ file, status: 'pending' as const }));
    setSelectedFiles(prev => [...prev, ...newItems]);
    if (inputRef.current) inputRef.current.value = '';
  }

  function removeSelectedFile(index: number) {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }

  function clearSelectedFiles() {
    setSelectedFiles([]);
  }

  async function onUpload() {
    if (selectedFiles.length === 0) return;
    setError(null);
    setUploading(true);

    // Upload all files in a single request
    const fd = new FormData();
    for (const item of selectedFiles) {
      fd.append('files', item.file);
    }

    // Set all files to uploading state
    setSelectedFiles(prev => prev.map(f => ({ ...f, status: 'uploading' as const })));

    try {
      const res = await fetch('/api/documents', { method: 'POST', body: fd });
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 401) { router.push('/login'); return; }
        throw new Error(data.error || 'Upload failed');
      }
      
      // Mark all as done
      setSelectedFiles(prev => prev.map(f => ({ ...f, status: 'done', docId: data.id })));
      await load();
      setTimeout(() => setSelectedFiles([]), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      // Mark all as error
      setSelectedFiles(prev => prev.map(f => ({ ...f, status: 'error', error: err instanceof Error ? err.message : 'Upload failed' })));
    } finally {
      setUploading(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm(t(locale, 'home.deleteConfirm'))) return;
    await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    await load();
  }

  if (items === null) {
    return <div className="text-ink-400 dark:text-ink-500 text-sm">{t(locale, 'common.loading')}</div>;
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="rounded-2xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-6">
        <h1 className="text-2xl font-semibold mb-1">{t(locale, 'home.welcome')}</h1>
        <p className="text-ink-600 dark:text-ink-400 mb-5">
          {t(locale, 'home.description')}
        </p>
        <div className="grid sm:grid-cols-3 gap-4 mb-5">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-ink-50 dark:bg-ink-700/50">
            <Sparkles className="w-5 h-5 text-accent-500 mt-0.5" />
            <div>
              <div className="font-medium text-sm">{t(locale, 'home.aiGeneration')}</div>
              <div className="text-xs text-ink-500 dark:text-ink-400">{t(locale, 'home.aiGenDesc')}</div>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-ink-50 dark:bg-ink-700/50">
            <FileText className="w-5 h-5 text-accent-500 mt-0.5" />
            <div>
              <div className="font-medium text-sm">{t(locale, 'home.smartReader')}</div>
              <div className="text-xs text-ink-500 dark:text-ink-400">{t(locale, 'home.smartReaderDesc')}</div>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-ink-50 dark:bg-ink-700/50">
            <Users className="w-5 h-5 text-accent-500 mt-0.5" />
            <div>
              <div className="font-medium text-sm">{t(locale, 'home.collaborate')}</div>
              <div className="text-xs text-ink-500 dark:text-ink-400">{t(locale, 'home.collaborateDesc')}</div>
            </div>
          </div>
        </div>
        
        {/* File Upload Area */}
        <div className="space-y-3">
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.pptx,.ppt,.txt,.md,.markdown,.rst,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/markdown"
            onChange={onFileSelect}
            className="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-accent-500 file:text-white hover:file:bg-accent-600 file:cursor-pointer border border-ink-200 dark:border-ink-600 rounded-md p-1 dark:bg-ink-700 dark:text-ink-200"
          />
          
          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-600 dark:text-ink-400">
                  {selectedFiles.length} {t(locale, 'home.filesSelected')}
                </span>
                <button
                  onClick={clearSelectedFiles}
                  disabled={uploading}
                  className="text-xs text-ink-500 hover:text-red-600 disabled:opacity-50"
                >
                  {t(locale, 'home.clearAll')}
                </button>
              </div>
              <ul className="max-h-40 overflow-y-auto space-y-1">
                {selectedFiles.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm py-1 px-2 rounded bg-ink-50 dark:bg-ink-700/50">
                    {item.status === 'pending' && <span className="w-4 h-4 rounded-full border-2 border-ink-300 dark:border-ink-600" />}
                    {item.status === 'uploading' && <Loader2 className="w-4 h-4 text-accent-500 animate-spin" />}
                    {item.status === 'done' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    {item.status === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
                    <span className="flex-1 truncate dark:text-ink-200">{item.file.name}</span>
                    <span className="text-xs text-ink-400 dark:text-ink-500">
                      {(item.file.size / 1024).toFixed(0)}KB
                    </span>
                    {item.status === 'error' && (
                      <span className="text-xs text-red-500 truncate max-w-[100px]">{item.error}</span>
                    )}
                    {!uploading && (
                      <button
                        onClick={() => removeSelectedFile(i)}
                        className="text-ink-400 hover:text-red-600"
                      >
                        ×
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Upload Button */}
          {selectedFiles.length > 0 && (
            <button
              onClick={onUpload}
              disabled={uploading}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-accent-500 text-white px-4 py-2 font-medium hover:bg-accent-600 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? t(locale, 'home.uploading') : `${t(locale, 'home.uploadFiles')} ${selectedFiles.length} ${t(locale, 'home.files')}`}
            </button>
          )}
        </div>

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        <p className="text-xs text-ink-400 dark:text-ink-500 mt-3">{t(locale, 'home.fileSupport')}</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent-500" /> {t(locale, 'home.yourDocs')}
        </h2>
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-200 dark:border-ink-600 p-6 text-center text-sm text-ink-400">
            <p>{t(locale, 'home.noDocs')}</p>
            <p className="mt-2">
              <Link href="/explore" className="text-accent-600 hover:underline">{t(locale, 'home.browseCommunity')}</Link>
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
                  title={t(locale, 'home.deleteTitle')}
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
