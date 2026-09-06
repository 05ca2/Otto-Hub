'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, FileText, Compass, Users, MessageSquare, Clock, ArrowRight, Bell, BookOpen, Settings, Loader2 } from 'lucide-react';
import { CountdownWidget } from '@/components/CountdownWidget';
import { useLanguage } from '@/components/LanguageProvider';
import { t } from '@/lib/translations';

type Doc = { id: string; title: string; created_at: number; content_length: number };
type Post = { id: string; title: string; body: string; created_at: number; author_name: string; comment_count: number };
type Room = { id: string; name: string; member_count: number };
type Announcement = { id: string; title: string; body: string; is_pinned: number; created_at: number; author_name: string };

function timeAgo(ts: number, locale: string): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return locale === 'zh' ? '刚刚' : 'just now';
  if (mins < 60) return `${mins}${locale === 'zh' ? '分钟前' : 'm ago'}`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}${locale === 'zh' ? '小时前' : 'h ago'}`;
  const days = Math.floor(hrs / 24);
  return `${days}${locale === 'zh' ? '天前' : 'd ago'}`;
}

export default function DashboardPage() {
  const { locale } = useLanguage();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/documents').then(r => r.ok ? r.json() : { documents: [] }),
      fetch('/api/posts?scope=feed').then(r => r.ok ? r.json() : { posts: [] }),
      fetch('/api/rooms').then(r => r.ok ? r.json() : { mine: [], publicRooms: [] }),
      fetch('/api/announcements').then(r => r.ok ? r.json() : { announcements: [] }),
    ]).then(([d, p, rm, a]) => {
      setDocs((d.documents || []).slice(0, 5));
      setPosts((p.posts || []).filter((x: Post & { visibility: string }) => (x as Post & { visibility: string }).visibility === 'public').slice(0, 5));
      setRooms([...(rm.mine || []), ...(rm.publicRooms || [])].slice(0, 5));
      setAnnouncements((a.announcements || []).slice(0, 5));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-2xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-6">
        <h1 className="text-2xl font-semibold mb-1 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-accent-500" /> {t(locale, 'dashboard.title')}
        </h1>
        <p className="text-ink-600 dark:text-ink-400 text-sm">
          {t(locale, 'dashboard.description')}
        </p>
      </section>

      {/* Quick Links */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/', icon: FileText, label: t(locale, 'nav.documents'), desc: locale === 'zh' ? '上传与管理' : 'Upload & manage' },
          { href: '/explore', icon: Compass, label: t(locale, 'nav.explore'), desc: locale === 'zh' ? '社区内容' : 'Community content' },
          { href: '/community', icon: Users, label: t(locale, 'nav.community'), desc: locale === 'zh' ? '学习房间' : 'Study rooms' },
          { href: '/settings', icon: Settings, label: t(locale, 'nav.settings'), desc: locale === 'zh' ? '账户与 AI' : 'Account & AI' },
        ].map(({ href, icon: Icon, label, desc }) => (
          <Link
            key={href}
            href={href}
            className="rounded-xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-4 hover:border-accent-400 dark:hover:border-accent-500 transition-colors group"
          >
            <Icon className="w-5 h-5 text-accent-500 mb-2" />
            <div className="font-medium text-sm group-hover:text-accent-600">{label}</div>
            <div className="text-xs text-ink-400 dark:text-ink-500">{desc}</div>
          </Link>
        ))}
      </section>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Documents + Posts + Rooms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Documents */}
          <section className="rounded-2xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-accent-500" /> {t(locale, 'dashboard.recentDocs')}
              </h2>
              <Link href="/" className="text-xs text-accent-600 hover:underline flex items-center gap-1">
                {t(locale, 'dashboard.viewAll')} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 text-ink-400 text-sm py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading...
              </div>
            ) : docs.length === 0 ? (
              <p className="text-sm text-ink-400 py-4">{t(locale, 'dashboard.noDocs')} <Link href="/" className="text-accent-600 hover:underline">{locale === 'zh' ? '上传一个 →' : 'Upload one →'}</Link></p>
            ) : (
              <ul className="space-y-2">
                {docs.map(d => (
                  <li key={d.id}>
                    <Link href={`/reader/${d.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-ink-50 dark:hover:bg-ink-700 transition-colors">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{d.title}</div>
                        <div className="text-xs text-ink-400">{(d.content_length / 1000).toFixed(1)}k chars · {timeAgo(d.created_at, locale)}</div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-ink-300 shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Community Activity */}
          <section className="rounded-2xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-accent-500" /> {t(locale, 'dashboard.communityFeed')}
              </h2>
              <Link href="/explore" className="text-xs text-accent-600 hover:underline flex items-center gap-1">
                {t(locale, 'dashboard.viewAll')} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 text-ink-400 text-sm py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading...
              </div>
            ) : posts.length === 0 ? (
              <p className="text-sm text-ink-400 py-4">{t(locale, 'dashboard.noPosts')}</p>
            ) : (
              <ul className="space-y-2">
                {posts.map(p => (
                  <li key={p.id}>
                    <Link href={`/explore/${p.id}`} className="block p-2 rounded-lg hover:bg-ink-50 dark:hover:bg-ink-700 transition-colors">
                      <div className="font-medium text-sm truncate">{p.title}</div>
                      <div className="text-xs text-ink-400 mt-0.5">
                        {p.author_name} · {p.comment_count} {locale === 'zh' ? '评论' : 'comments'} · {timeAgo(p.created_at, locale)}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Study Rooms */}
          <section className="rounded-2xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-accent-500" /> {t(locale, 'dashboard.myRooms')}
              </h2>
              <Link href="/community" className="text-xs text-accent-600 hover:underline flex items-center gap-1">
                {t(locale, 'dashboard.viewAll')} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 text-ink-400 text-sm py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading...
              </div>
            ) : rooms.length === 0 ? (
              <p className="text-sm text-ink-400 py-4">{t(locale, 'dashboard.noRooms')} <Link href="/community" className="text-accent-600 hover:underline">{locale === 'zh' ? '创建一个 →' : 'Create one →'}</Link></p>
            ) : (
              <ul className="space-y-2">
                {rooms.map(r => (
                  <li key={r.id}>
                    <Link href={`/community/rooms/${r.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-ink-50 dark:hover:bg-ink-700 transition-colors">
                      <div>
                        <div className="font-medium text-sm">{r.name}</div>
                        <div className="text-xs text-ink-400">{r.member_count} {locale === 'zh' ? '成员' : 'members'}</div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-ink-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Right: Announcements + Countdown + Tips */}
        <div className="space-y-6">
          {/* Announcements */}
          <section className="rounded-2xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" /> {t(locale, 'dashboard.announcements')}
              </h2>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 text-ink-400 text-sm py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading...
              </div>
            ) : announcements.length === 0 ? (
              <p className="text-sm text-ink-400 py-4">{t(locale, 'dashboard.noAnnouncements')}</p>
            ) : (
              <ul className="space-y-3">
                {announcements.map(a => (
                  <li key={a.id} className="p-2 rounded-lg bg-ink-50 dark:bg-ink-700/50">
                    <div className="flex items-center gap-2">
                      {a.is_pinned ? <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-medium">Pinned</span> : null}
                      <span className="font-medium text-sm truncate">{a.title}</span>
                    </div>
                    <p className="text-xs text-ink-500 dark:text-ink-400 mt-1 line-clamp-2">{a.body}</p>
                    <div className="text-[10px] text-ink-400 dark:text-ink-500 mt-1">
                      {a.author_name} · {timeAgo(a.created_at, locale)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <CountdownWidget />

          {/* Tips */}
          <section className="rounded-2xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4 text-accent-500" /> {locale === 'zh' ? '提示' : 'Tips'}
            </h2>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <BookOpen className="w-4 h-4 text-accent-500 mt-0.5 shrink-0" />
                <span>{locale === 'zh' ? '上传任何文档，让 AI 生成笔记、摘要和练习题。' : 'Upload any document and let AI generate cheatsheets, summaries, and practice questions.'}</span>
              </li>
              <li className="flex items-start gap-2">
                <Compass className="w-4 h-4 text-accent-500 mt-0.5 shrink-0" />
                <span>{locale === 'zh' ? '浏览探索页面，查找社区共享的学习资料。' : 'Browse the Explore page to find community-shared study materials.'}</span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-accent-500 mt-0.5 shrink-0" />
                <span>{locale === 'zh' ? '添加考试日期到倒计时，保持学习节奏。' : 'Add exam dates to the countdown timer to stay on track.'}</span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
