'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, FileText, Compass, Users, MessageSquare, Clock, ArrowRight, Bell, BookOpen, Settings, Loader2 } from 'lucide-react';
import { CountdownWidget } from '@/components/CountdownWidget';

type Doc = { id: string; title: string; created_at: number; content_length: number };
type Post = { id: string; title: string; body: string; created_at: number; author_name: string; comment_count: number };
type Room = { id: string; name: string; member_count: number };

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function DashboardPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/documents').then(r => r.ok ? r.json() : { documents: [] }),
      fetch('/api/posts?scope=feed').then(r => r.ok ? r.json() : { posts: [] }),
      fetch('/api/rooms').then(r => r.ok ? r.json() : { mine: [], publicRooms: [] }),
    ]).then(([d, p, rm]) => {
      setDocs((d.documents || []).slice(0, 5));
      setPosts((p.posts || []).filter((x: Post & { visibility: string }) => (x as Post & { visibility: string }).visibility === 'public').slice(0, 5));
      setRooms([...(rm.mine || []), ...(rm.publicRooms || [])].slice(0, 5));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-2xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-6">
        <h1 className="text-2xl font-semibold mb-1 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-accent-500" /> Dashboard
        </h1>
        <p className="text-ink-600 dark:text-ink-400 text-sm">
          Your learning hub at a glance — documents, community, and upcoming events.
        </p>
      </section>

      {/* Quick Links */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/', icon: FileText, label: 'Documents', desc: 'Upload & manage' },
          { href: '/explore', icon: Compass, label: 'Explore', desc: 'Community content' },
          { href: '/community', icon: Users, label: 'Community', desc: 'Study rooms' },
          { href: '/settings', icon: Settings, label: 'Settings', desc: 'Account & AI' },
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
                <FileText className="w-4 h-4 text-accent-500" /> Recent Documents
              </h2>
              <Link href="/" className="text-xs text-accent-600 hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 text-ink-400 text-sm py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading...
              </div>
            ) : docs.length === 0 ? (
              <p className="text-sm text-ink-400 py-4">No documents yet. <Link href="/" className="text-accent-600 hover:underline">Upload one →</Link></p>
            ) : (
              <ul className="space-y-2">
                {docs.map(d => (
                  <li key={d.id}>
                    <Link href={`/reader/${d.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-ink-50 dark:hover:bg-ink-700 transition-colors">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{d.title}</div>
                        <div className="text-xs text-ink-400">{(d.content_length / 1000).toFixed(1)}k chars · {timeAgo(d.created_at)}</div>
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
                <MessageSquare className="w-4 h-4 text-accent-500" /> Community Activity
              </h2>
              <Link href="/explore" className="text-xs text-accent-600 hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 text-ink-400 text-sm py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading...
              </div>
            ) : posts.length === 0 ? (
              <p className="text-sm text-ink-400 py-4">No posts yet.</p>
            ) : (
              <ul className="space-y-2">
                {posts.map(p => (
                  <li key={p.id}>
                    <Link href={`/explore/${p.id}`} className="block p-2 rounded-lg hover:bg-ink-50 dark:hover:bg-ink-700 transition-colors">
                      <div className="font-medium text-sm truncate">{p.title}</div>
                      <div className="text-xs text-ink-400 mt-0.5">
                        {p.author_name} · {p.comment_count} comments · {timeAgo(p.created_at)}
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
                <Users className="w-4 h-4 text-accent-500" /> Study Rooms
              </h2>
              <Link href="/community" className="text-xs text-accent-600 hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 text-ink-400 text-sm py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading...
              </div>
            ) : rooms.length === 0 ? (
              <p className="text-sm text-ink-400 py-4">No rooms yet. <Link href="/community" className="text-accent-600 hover:underline">Create one →</Link></p>
            ) : (
              <ul className="space-y-2">
                {rooms.map(r => (
                  <li key={r.id}>
                    <Link href={`/community/rooms/${r.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-ink-50 dark:hover:bg-ink-700 transition-colors">
                      <div>
                        <div className="font-medium text-sm">{r.name}</div>
                        <div className="text-xs text-ink-400">{r.member_count} members</div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-ink-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Right: Countdown + Tips */}
        <div className="space-y-6">
          <CountdownWidget />

          {/* Tips */}
          <section className="rounded-2xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4 text-accent-500" /> Tips
            </h2>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <BookOpen className="w-4 h-4 text-accent-500 mt-0.5 shrink-0" />
                <span>Upload any document and let AI generate cheatsheets, summaries, and practice questions.</span>
              </li>
              <li className="flex items-start gap-2">
                <Compass className="w-4 h-4 text-accent-500 mt-0.5 shrink-0" />
                <span>Browse the Explore page to find community-shared study materials.</span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-accent-500 mt-0.5 shrink-0" />
                <span>Add exam dates to the countdown timer to stay on track.</span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
