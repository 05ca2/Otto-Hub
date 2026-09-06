'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { Sparkles, MessageSquare, FileText } from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';
import { t } from '@/lib/translations';
import { LaurelFrame } from '@/components/LaurelFrame';

type Profile = { id: string; name: string; email: string; bio: string | null; image: string | null; created_at: number; document_count: number; public_cheats: number; post_count: number; avatar_frame: string; wallpaper: string; wallpaper_css: string };
type PublicCheat = { id: string; kind: string; content: string; created_at: number; doc_title: string; score: number };
type UserPost = { id: string; title: string; body: string; created_at: number; comment_count: number; score: number };

export default function ProfilePage() {
  const params = useParams<{ id: string }>();
  const { locale } = useLanguage();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [cheats, setCheats] = useState<PublicCheat[]>([]);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [tab, setTab] = useState<'cheats' | 'posts'>('cheats');

  useEffect(() => {
    fetch(`/api/u/${params.id}`).then((r) => r.json()).then((d) => {
      setProfile(d.profile);
      setCheats(d.cheats || []);
      setPosts(d.posts || []);
    });
  }, [params.id]);

  if (!profile) return <div className="text-ink-400 text-sm">{t(locale, 'profile.loading')}</div>;
  return (
    <div className="space-y-6">
      <div
        className="rounded-2xl border border-ink-100 bg-white p-6 flex items-center gap-4"
        style={profile.wallpaper_css ? { background: profile.wallpaper_css, backgroundBlendMode: 'overlay' } : undefined}
      >
        <LaurelFrame frameId={profile.avatar_frame} size={80}>
          {profile.image ? <img src={profile.image} className="w-16 h-16 rounded-full object-cover" /> : (
            <span className="w-16 h-16 rounded-full bg-accent-500 text-white text-2xl font-medium flex items-center justify-center">{(profile.name || '?').slice(0, 1).toUpperCase()}</span>
          )}
        </LaurelFrame>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{profile.name}</h1>
          {profile.bio && <p className="text-ink-600 text-sm mt-1">{profile.bio}</p>}
          <div className="text-xs text-ink-400 mt-1">{t(locale, 'profile.joined')} {new Date(profile.created_at).toLocaleDateString()}</div>
        </div>
        <div className="text-right text-sm">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{profile.document_count} {t(locale, 'profile.docs')}</span>
            <span className="flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" />{profile.public_cheats} {t(locale, 'profile.public')}</span>
            <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" />{profile.post_count} {t(locale, 'profile.questionsCount')}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {(['cheats', 'posts'] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)} className={`px-3 py-1.5 rounded text-sm font-medium border ${tab === k ? 'bg-accent-500 text-white border-accent-500' : 'border-ink-200 text-ink-600 hover:bg-ink-50'}`}>
            {k === 'cheats' ? t(locale, 'profile.publicCheatsTab') : t(locale, 'profile.questionsTab')}
          </button>
        ))}
      </div>

      {tab === 'cheats' ? (
        cheats.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-200 p-6 text-center text-sm text-ink-400">{t(locale, 'profile.noCheats')}</div>
        ) : (
          <ul className="space-y-3">
            {cheats.map((c) => (
              <li key={c.id} className="rounded-xl border border-ink-100 bg-white p-4">
                <div className="flex items-center justify-between text-xs text-ink-400 mb-2">
                  <span>{c.doc_title}</span>
                  <span>{new Date(c.created_at).toLocaleString()} · {t(locale, 'profile.score')} {c.score}</span>
                </div>
                <div className="markdown-body text-sm max-h-40 overflow-hidden relative">
                  <MarkdownRenderer>{c.content.slice(0, 800)}</MarkdownRenderer>
                  {c.content.length > 800 && <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent" />}
                </div>
              </li>
            ))}
          </ul>
        )
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-200 p-6 text-center text-sm text-ink-400">{t(locale, 'profile.noQuestions')}</div>
      ) : (
        <ul className="space-y-2">
          {posts.map((p) => (
            <li key={p.id} className="rounded-xl border border-ink-100 bg-white p-3">
              <Link href={`/community/questions/${p.id}`} className="font-medium hover:underline">{p.title}</Link>
              <div className="text-xs text-ink-400 mt-0.5">{p.comment_count} {t(locale, 'profile.answers')} · {t(locale, 'profile.score')} {p.score} · {new Date(p.created_at).toLocaleString()}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
