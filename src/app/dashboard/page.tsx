'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight, Bell, BookOpen, Calendar, Clock, Coins, Compass,
  FileText, Lightbulb, Loader2, MessageSquare, MessagesSquare,
  Settings, ShoppingBag, Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { CountdownWidget } from '@/components/CountdownWidget';
import { useLanguage } from '@/components/LanguageProvider';
import { t, type Locale } from '@/lib/translations';

type Doc = { id: string; title: string; created_at: number; content_length: number };
type Post = { id: string; title: string; body: string; created_at: number; author_name: string; comment_count: number };
type Room = { id: string; name: string; member_count: number };
type Announcement = { id: string; title: string; body: string; is_pinned: number; created_at: number; author_name: string };

const CARD =
  'rounded-2xl border border-ink-100 dark:border-ink-700 bg-gradient-to-b from-white to-ink-50/70 dark:from-ink-800 dark:to-ink-800/60 p-5 shadow-sm';

function timeAgo(ts: number, locale: Locale): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t(locale, 'dashboard.justNow');
  if (mins < 60) return `${mins}${t(locale, 'dashboard.minutesAgo')}`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}${t(locale, 'dashboard.hoursAgo')}`;
  const days = Math.floor(hrs / 24);
  return `${days}${t(locale, 'dashboard.daysAgo')}`;
}

function SectionTitle({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <h2 className="font-semibold text-ink-800 dark:text-ink-100 flex items-center gap-2.5">
      <span className="w-7 h-7 rounded-lg bg-accent-500/10 dark:bg-accent-400/10 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-accent-600 dark:text-accent-400" />
      </span>
      {children}
    </h2>
  );
}

function LoadingRow({ locale }: { locale: Locale }) {
  return (
    <div className="flex items-center gap-2 text-ink-400 dark:text-ink-500 text-sm py-4">
      <Loader2 className="w-4 h-4 animate-spin" /> {t(locale, 'common.loading')}
    </div>
  );
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

  const quickLinks = [
    { href: '/', icon: FileText, label: t(locale, 'nav.documents'), desc: t(locale, 'dashboard.documentsDesc') },
    { href: '/explore', icon: Compass, label: t(locale, 'nav.explore'), desc: t(locale, 'dashboard.exploreDesc') },
    { href: '/community', icon: MessagesSquare, label: t(locale, 'nav.community'), desc: t(locale, 'dashboard.communityDesc') },
    { href: '/community/groups', icon: Users, label: t(locale, 'group.title'), desc: t(locale, 'dashboard.groupsDesc') },
    { href: '/shop', icon: ShoppingBag, label: t(locale, 'nav.shop'), desc: t(locale, 'dashboard.shopDesc') },
    { href: '/shop?tab=tasks', icon: Coins, label: t(locale, 'dashboard.ohbit'), desc: t(locale, 'dashboard.ohbitDesc') },
    { href: '/settings', icon: Settings, label: t(locale, 'nav.settings'), desc: t(locale, 'dashboard.settingsDesc') },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="relative overflow-hidden rounded-2xl border border-ink-100 dark:border-ink-700 bg-gradient-to-br from-white via-white to-accent-500/[0.06] dark:from-ink-800 dark:via-ink-800 dark:to-accent-500/10 p-6 shadow-sm">
        <div className="pointer-events-none absolute -top-10 -right-10 w-44 h-44 rounded-full bg-accent-500/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-accent-500/10 dark:bg-accent-400/10 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 text-accent-600 dark:text-accent-400" />
          </span>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-ink-800 dark:text-ink-100 leading-tight">
              {t(locale, 'dashboard.title')}
            </h1>
            <p className="text-ink-500 dark:text-ink-400 text-sm mt-0.5">
              {t(locale, 'dashboard.description')}
            </p>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickLinks.map(({ href, icon: Icon, label, desc }) => (
          <Link
            key={href}
            href={href}
            className="group relative overflow-hidden rounded-xl border border-ink-100 dark:border-ink-700 bg-gradient-to-b from-white to-ink-50/80 dark:from-ink-800 dark:to-ink-800/60 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-accent-400 dark:hover:border-accent-500 transition-all duration-200"
          >
            <div className="w-10 h-10 rounded-lg bg-accent-500/10 dark:bg-accent-400/10 flex items-center justify-center mb-3 group-hover:bg-accent-500/20 dark:group-hover:bg-accent-400/20 group-hover:scale-105 transition-all duration-200">
              <Icon className="w-5 h-5 text-accent-600 dark:text-accent-400" />
            </div>
            <div className="font-medium text-sm text-ink-800 dark:text-ink-100 group-hover:text-accent-600 dark:group-hover:text-accent-400 transition-colors">
              {label}
            </div>
            <div className="text-xs text-ink-400 dark:text-ink-500 mt-0.5">{desc}</div>
          </Link>
        ))}
      </section>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Documents + Posts + Rooms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Documents */}
          <section className={CARD}>
            <div className="flex items-center justify-between mb-4">
              <SectionTitle icon={FileText}>{t(locale, 'dashboard.recentDocs')}</SectionTitle>
              <Link href="/" className="text-xs text-accent-600 dark:text-accent-400 hover:underline flex items-center gap-1 shrink-0">
                {t(locale, 'dashboard.viewAll')} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {loading ? (
              <LoadingRow locale={locale} />
            ) : docs.length === 0 ? (
              <p className="text-sm text-ink-400 dark:text-ink-500 py-4">
                {t(locale, 'dashboard.noDocs')}{' '}
                <Link href="/" className="text-accent-600 dark:text-accent-400 hover:underline">{t(locale, 'dashboard.uploadOne')}</Link>
              </p>
            ) : (
              <ul className="space-y-2">
                {docs.map(d => (
                  <li key={d.id}>
                    <Link href={`/reader/${d.id}`} className="group/item flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-ink-50 dark:hover:bg-ink-700/60 transition-colors">
                      <div className="min-w-0">
                        <div className="font-medium text-sm text-ink-800 dark:text-ink-100 truncate">{d.title}</div>
                        <div className="text-xs text-ink-400 dark:text-ink-500 mt-0.5">
                          {(d.content_length / 1000).toFixed(1)}{t(locale, 'dashboard.kChars')} · {timeAgo(d.created_at, locale)}
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-ink-300 dark:text-ink-500 shrink-0 group-hover/item:translate-x-0.5 group-hover/item:text-accent-500 transition-all" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Community Activity */}
          <section className={CARD}>
            <div className="flex items-center justify-between mb-4">
              <SectionTitle icon={MessageSquare}>{t(locale, 'dashboard.communityFeed')}</SectionTitle>
              <Link href="/explore" className="text-xs text-accent-600 dark:text-accent-400 hover:underline flex items-center gap-1 shrink-0">
                {t(locale, 'dashboard.viewAll')} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {loading ? (
              <LoadingRow locale={locale} />
            ) : posts.length === 0 ? (
              <p className="text-sm text-ink-400 dark:text-ink-500 py-4">{t(locale, 'dashboard.noPosts')}</p>
            ) : (
              <ul className="space-y-2">
                {posts.map(p => (
                  <li key={p.id}>
                    <Link href={`/explore/${p.id}`} className="group/item block p-2 rounded-lg hover:bg-ink-50 dark:hover:bg-ink-700/60 transition-colors">
                      <div className="font-medium text-sm text-ink-800 dark:text-ink-100 truncate">{p.title}</div>
                      <div className="text-xs text-ink-400 dark:text-ink-500 mt-0.5">
                        {p.author_name} · {p.comment_count} {t(locale, 'dashboard.comments')} · {timeAgo(p.created_at, locale)}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Study Rooms */}
          <section className={CARD}>
            <div className="flex items-center justify-between mb-4">
              <SectionTitle icon={Users}>{t(locale, 'dashboard.myRooms')}</SectionTitle>
              <Link href="/community" className="text-xs text-accent-600 dark:text-accent-400 hover:underline flex items-center gap-1 shrink-0">
                {t(locale, 'dashboard.viewAll')} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {loading ? (
              <LoadingRow locale={locale} />
            ) : rooms.length === 0 ? (
              <p className="text-sm text-ink-400 dark:text-ink-500 py-4">
                {t(locale, 'dashboard.noRooms')}{' '}
                <Link href="/community" className="text-accent-600 dark:text-accent-400 hover:underline">{t(locale, 'dashboard.createOne')}</Link>
              </p>
            ) : (
              <ul className="space-y-2">
                {rooms.map(r => (
                  <li key={r.id}>
                    <Link href={`/community/rooms/${r.id}`} className="group/item flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-ink-50 dark:hover:bg-ink-700/60 transition-colors">
                      <div className="min-w-0">
                        <div className="font-medium text-sm text-ink-800 dark:text-ink-100 truncate">{r.name}</div>
                        <div className="text-xs text-ink-400 dark:text-ink-500 mt-0.5">{r.member_count} {t(locale, 'dashboard.members')}</div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-ink-300 dark:text-ink-500 shrink-0 group-hover/item:translate-x-0.5 group-hover/item:text-accent-500 transition-all" />
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
          <section className={CARD}>
            <div className="flex items-center justify-between mb-4">
              <SectionTitle icon={Bell}>{t(locale, 'dashboard.announcements')}</SectionTitle>
            </div>
            {loading ? (
              <LoadingRow locale={locale} />
            ) : announcements.length === 0 ? (
              <p className="text-sm text-ink-400 dark:text-ink-500 py-4">{t(locale, 'dashboard.noAnnouncements')}</p>
            ) : (
              <ul className="space-y-3">
                {announcements.map(a => (
                  <li key={a.id} className="p-3 rounded-xl bg-ink-50 dark:bg-ink-700/40 border border-ink-100 dark:border-ink-700/60">
                    <div className="flex items-center gap-2">
                      {a.is_pinned ? (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-medium uppercase tracking-wide shrink-0">
                          {t(locale, 'dashboard.pinned')}
                        </span>
                      ) : null}
                      <span className="font-medium text-sm text-ink-800 dark:text-ink-100 truncate">{a.title}</span>
                    </div>
                    <p className="text-xs text-ink-500 dark:text-ink-400 mt-1.5 line-clamp-2 leading-relaxed">{a.body}</p>
                    <div className="text-[10px] text-ink-400 dark:text-ink-500 mt-1.5">
                      {a.author_name} · {timeAgo(a.created_at, locale)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <CountdownWidget />

          {/* Tips */}
          <section className={CARD}>
            <SectionTitle icon={Lightbulb}>{t(locale, 'dashboard.tips')}</SectionTitle>
            <ul className="space-y-3 text-sm mt-4">
              <li className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-md bg-accent-500/10 dark:bg-accent-400/10 flex items-center justify-center shrink-0 mt-0.5">
                  <BookOpen className="w-3.5 h-3.5 text-accent-600 dark:text-accent-400" />
                </span>
                <span className="text-ink-600 dark:text-ink-300 leading-relaxed">{t(locale, 'dashboard.tipUpload')}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-md bg-accent-500/10 dark:bg-accent-400/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Compass className="w-3.5 h-3.5 text-accent-600 dark:text-accent-400" />
                </span>
                <span className="text-ink-600 dark:text-ink-300 leading-relaxed">{t(locale, 'dashboard.tipExplore')}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-md bg-accent-500/10 dark:bg-accent-400/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-accent-600 dark:text-accent-400" />
                </span>
                <span className="text-ink-600 dark:text-ink-300 leading-relaxed">{t(locale, 'dashboard.tipCountdown')}</span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
