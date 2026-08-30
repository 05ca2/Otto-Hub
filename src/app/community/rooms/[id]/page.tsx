'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users as UsersIcon, ArrowLeft, Plus, ArrowUp, ArrowDown, Megaphone, Pin, Trash2, Loader2 } from 'lucide-react';

type Member = { id: string; name: string; image: string | null; role: string; joined_at: number };
type Room = { id: string; name: string; description: string | null; invite_code: string; is_public: number; owner_id: string };
type Post = { id: string; title: string; body: string; created_at: number; author_id: string; author_name: string; author_image: string | null; score: number; my_vote: number; comment_count: number };
type Announcement = { id: string; author_id: string; author_name: string; author_image: string | null; room_id: string | null; title: string; body: string; is_pinned: number; created_at: number };

export default function RoomDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [me, setMe] = useState<{ id: string; role: string | null } | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showAnn, setShowAnn] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [announcing, setAnnouncing] = useState(false);

  async function load() {
    const r = await fetch(`/api/rooms/${params.id}`);
    if (r.status === 401) { router.push('/login'); return; }
    if (r.status === 404 || r.status === 403) { router.push('/community'); return; }
    const d = await r.json();
    setRoom(d.room); setMembers(d.members); setIsMember(d.isMember);
    const p = await fetch(`/api/posts?scope=room&roomId=${params.id}`);
    const pd = await p.json();
    setPosts(pd.posts || []);
    if (d.isMember) {
      const a = await fetch(`/api/announcements?roomId=${params.id}`);
      const ad = await a.json();
      setAnnouncements(ad.announcements || []);
    } else {
      setAnnouncements([]);
    }
  }
  useEffect(() => { load(); }, [params.id]);
  useEffect(() => {
    fetch('/api/auth').then((r) => r.json()).then((d) => setMe(d.user || null)).catch(() => {});
  }, []);

  const isOwner = Boolean(me && room && room.owner_id === me.id);

  async function postAnnouncement() {
    if (!annTitle.trim() || !annBody.trim()) return;
    setAnnouncing(true);
    try {
      const r = await fetch('/api/announcements', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: annTitle, body: annBody, roomId: params.id }),
      });
      if (r.ok) { setShowAnn(false); setAnnTitle(''); setAnnBody(''); load(); }
      else { const d = await r.json(); alert(d.error || 'Failed to post announcement'); }
    } finally { setAnnouncing(false); }
  }

  async function deleteAnnouncement(id: string) {
    if (!confirm('Delete this announcement?')) return;
    await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
    load();
  }

  async function joinWithCode() {
    const code = prompt('Enter the 6-character invite code:');
    if (!code) return;
    const r = await fetch(`/api/rooms/${params.id}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ invite_code: code }),
    });
    if (r.ok) load();
    else { const d = await r.json(); alert(d.error || 'Failed to join'); }
  }

  async function leave() {
    if (!confirm('Leave this room?')) return;
    const r = await fetch(`/api/rooms/${params.id}`, { method: 'DELETE' });
    const d = await r.json();
    if (d.dissolved) alert('Room dissolved (no members left).');
    router.push('/community');
  }

  async function dissolve() {
    if (!confirm('Dissolve this room? This will delete the room, all members, and all room posts. This cannot be undone.')) return;
    const r = await fetch(`/api/rooms/${params.id}?dissolve=true`, { method: 'DELETE' });
    if (r.ok) { alert('Room dissolved.'); router.push('/community'); }
  }

  async function submit() {
    const r = await fetch('/api/posts', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title, body, tags: tags.split(',').map(s => s.trim()).filter(Boolean), visibility: 'room', roomId: params.id }),
    });
    if (r.ok) { setShowNew(false); setTitle(''); setBody(''); setTags(''); load(); }
  }

  if (!room) return <div className="text-ink-400 dark:text-ink-500 text-sm">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/community" className="text-sm text-ink-600 dark:text-ink-400 hover:underline flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Back to community</Link>
      </div>

      <div className="rounded-2xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2"><UsersIcon className="w-5 h-5 text-accent-500" />{room.name}</h1>
            {room.description && <p className="text-ink-600 dark:text-ink-400 text-sm mt-1">{room.description}</p>}
          </div>
          <div className="flex items-center gap-2">
            {isMember ? (
              <>
                <button onClick={() => setShowNew(true)} className="px-3 py-1.5 rounded bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> New question
                </button>
                <button onClick={leave} className="px-3 py-1.5 rounded border border-ink-200 dark:border-ink-600 text-sm text-ink-600 dark:text-ink-400 hover:bg-ink-50 dark:hover:bg-ink-700">Leave</button>
                {isOwner && (
                  <button onClick={dissolve} className="px-3 py-1.5 rounded border border-red-200 dark:border-red-800 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30">Dissolve room</button>
                )}
              </>
            ) : (
              <button onClick={joinWithCode} className="px-3 py-1.5 rounded bg-accent-500 text-white text-sm font-medium hover:bg-accent-600">Join with code</button>
            )}
          </div>
        </div>
        <div className="mt-3 text-xs text-ink-500 dark:text-ink-400 flex items-center gap-3">
          <span>{members.length} members</span>
          <span>·</span>
          <span className="font-mono">invite: {room.invite_code}</span>
          {room.is_public ? <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700">public</span> : <span className="px-1.5 py-0.5 rounded bg-ink-100 dark:bg-ink-700 text-ink-600 dark:text-ink-300">private</span>}
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Megaphone className="w-4 h-4 text-accent-500" /> Announcements</h2>
          {isOwner && (
            <button onClick={() => setShowAnn(true)} className="px-3 py-1.5 rounded bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Post announcement
            </button>
          )}
        </div>
        {announcements.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-200 dark:border-ink-600 p-6 text-center text-sm text-ink-400 dark:text-ink-500">
            No announcements yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {announcements.map((a) => (
              <li key={a.id} className={`rounded-xl border dark:border-ink-700 p-4 ${a.is_pinned ? 'border-accent-200 dark:border-accent-800 bg-accent-50/40 dark:bg-accent-900/20' : 'border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {a.is_pinned ? <Pin className="w-4 h-4 text-accent-500 shrink-0" /> : <Megaphone className="w-4 h-4 text-ink-400 dark:text-ink-500 shrink-0" />}
                      <span className="font-medium">{a.title}</span>
                    </div>
                    <div className="text-xs text-ink-400 dark:text-ink-500 mt-1 flex items-center gap-2">
                      <span>by {a.author_name}</span>
                      <span>·</span>
                      <span>{new Date(a.created_at).toLocaleString()}</span>
                      {a.is_pinned ? <span className="px-1.5 py-0.5 rounded bg-accent-100 dark:bg-accent-900/40 text-accent-700 dark:text-accent-300 text-[10px] font-medium">pinned</span> : null}
                    </div>
                    {a.body && <p className="text-sm text-ink-600 dark:text-ink-400 mt-2 whitespace-pre-wrap">{a.body}</p>}
                  </div>
                  {(isOwner || (me && me.id === a.author_id) || (me && me.role === 'admin')) && (
                    <button onClick={() => deleteAnnouncement(a.id)} title="Delete announcement" className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-400 hover:text-red-600 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Members</h2>
        <ul className="grid sm:grid-cols-3 gap-2">
          {members.map((m) => (
            <li key={m.id} className="rounded-lg border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-2 flex items-center gap-2 text-sm">
              {m.image ? <img src={m.image} className="w-6 h-6 rounded-full" /> : <span className="w-6 h-6 rounded-full bg-accent-500 text-white text-[10px] font-medium flex items-center justify-center">{(m.name || '?').slice(0, 1).toUpperCase()}</span>}
              <Link href={`/u/${m.id}`} className="hover:underline flex-1">{m.name}</Link>
              <span className="text-xs text-ink-400 dark:text-ink-500">{m.role}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Questions in this room</h2>
        {posts === null ? (
          <div className="text-ink-400 dark:text-ink-500 text-sm">Loading…</div>
        ) : posts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-200 dark:border-ink-600 p-6 text-center text-sm text-ink-400 dark:text-ink-500">
            No questions yet. {isMember ? 'Be the first to ask.' : 'Join the room to post.'}
          </div>
        ) : (
          <ul className="space-y-2">
            {posts.map((p) => (
              <li key={p.id} className="rounded-xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-3 flex gap-3">
                <div className="flex flex-col items-center text-sm text-ink-600 dark:text-ink-400 w-10">
                  <ArrowUp className="w-3.5 h-3.5" />
                  <span className="tabular-nums">{p.score}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/community/questions/${p.id}`} className="font-medium hover:underline">{p.title}</Link>
                  <div className="text-xs text-ink-400 dark:text-ink-500 mt-0.5">by {p.author_name} · {p.comment_count} answers · {new Date(p.created_at).toLocaleString()}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {showNew && (
        <div className="fixed inset-0 z-50 bg-ink-900/40 flex items-center justify-center p-4" onClick={() => setShowNew(false)}>
          <div className="bg-white dark:bg-ink-800 rounded-2xl shadow-2xl max-w-xl w-full p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-3">Ask in {room.name}</h3>
            <div className="space-y-3">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full border border-ink-200 dark:border-ink-600 dark:bg-ink-900 dark:text-ink-100 rounded-md p-2 text-sm" />
              <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Body (Markdown OK)" className="w-full border border-ink-200 dark:border-ink-600 dark:bg-ink-900 dark:text-ink-100 rounded-md p-2 text-sm min-h-[120px] font-mono" />
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tags (comma separated)" className="w-full border border-ink-200 dark:border-ink-600 dark:bg-ink-900 dark:text-ink-100 rounded-md p-2 text-sm" />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowNew(false)} className="px-3 py-1.5 rounded text-sm hover:bg-ink-100 dark:hover:bg-ink-700">Cancel</button>
              <button onClick={submit} disabled={!title.trim() || !body.trim()} className="px-3 py-1.5 rounded bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 disabled:opacity-50">Post</button>
            </div>
          </div>
        </div>
      )}

      {showAnn && (
        <div className="fixed inset-0 z-50 bg-ink-900/40 flex items-center justify-center p-4" onClick={() => setShowAnn(false)}>
          <div className="bg-white dark:bg-ink-800 rounded-2xl shadow-2xl max-w-xl w-full p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-3">Post an announcement in {room.name}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} className="w-full border border-ink-200 dark:border-ink-600 dark:bg-ink-900 dark:text-ink-100 rounded-md p-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Body</label>
                <textarea value={annBody} onChange={(e) => setAnnBody(e.target.value)} className="w-full border border-ink-200 dark:border-ink-600 dark:bg-ink-900 dark:text-ink-100 rounded-md p-2 text-sm min-h-[120px]" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowAnn(false)} className="px-3 py-1.5 rounded text-sm hover:bg-ink-100 dark:hover:bg-ink-700">Cancel</button>
              <button onClick={postAnnouncement} disabled={!annTitle.trim() || !annBody.trim() || announcing} className="px-3 py-1.5 rounded bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 disabled:opacity-50 flex items-center gap-1.5">
                {announcing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {announcing ? 'Posting…' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
