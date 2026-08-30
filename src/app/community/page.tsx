'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Users as UsersIcon, MessageSquare, Loader2, Search } from 'lucide-react';

type Room = { id: string; name: string; description: string | null; invite_code: string; is_public: number; role?: string; member_count: number };

export default function CommunityPage() {
  const router = useRouter();
  const [mine, setMine] = useState<Room[]>([]);
  const [publicRooms, setPublicRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    const r = await fetch('/api/rooms');
    if (r.status === 401) { router.push('/login'); return; }
    const d = await r.json();
    setMine(d.mine || []);
    setPublicRooms(d.publicRooms || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    setCreating(true);
    try {
      const r = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, description, is_public: isPublic }),
      });
      const d = await r.json();
      if (r.ok) router.push(`/community/rooms/${d.id}`);
    } finally {
      setCreating(false);
    }
  }

  const filteredMine = mine.filter((r) => {
    if (!search.trim()) return true;
    return r.name.toLowerCase().includes(search.toLowerCase());
  });

  const filteredPublic = publicRooms.filter((r) => {
    if (!search.trim()) return true;
    return r.name.toLowerCase().includes(search.toLowerCase()) || (r.description || '').toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-accent-500" /> Community
          </h1>
          <p className="text-ink-600 dark:text-ink-400 text-sm mt-1">Study rooms for collaboration, plus the Q&amp;A forum.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/community/questions" className="px-3 py-1.5 rounded border border-ink-200 dark:border-ink-600 hover:bg-ink-50 dark:hover:bg-ink-700 text-sm flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4" /> Q&amp;A Forum
          </Link>
          <button onClick={() => setShowCreate(true)} className="px-3 py-1.5 rounded bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Create room
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 dark:text-ink-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search rooms by name..."
          className="w-full pl-10 pr-4 py-2.5 border border-ink-200 dark:border-ink-600 dark:bg-ink-900 dark:text-ink-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-400"
        />
      </div>

      {loading ? (
        <div className="text-ink-400 dark:text-ink-500 text-sm">Loading…</div>
      ) : (
        <>
          <section>
            <h2 className="text-lg font-semibold mb-3">Your rooms</h2>
            {filteredMine.length === 0 ? (
              <div className="rounded-xl border border-dashed border-ink-200 dark:border-ink-600 p-6 text-center text-sm text-ink-400 dark:text-ink-500">
                {search ? 'No matching rooms' : "You haven't joined any rooms yet. Create one or join via an invite code."}
              </div>
            ) : (
              <ul className="grid sm:grid-cols-2 gap-3">
                {filteredMine.map((r) => (
                  <li key={r.id} className="rounded-xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-4">
                    <div className="flex items-center justify-between">
                      <Link href={`/community/rooms/${r.id}`} className="font-medium hover:underline">{r.name}</Link>
                      <span className="text-xs text-ink-400 dark:text-ink-500">{r.member_count} members</span>
                    </div>
                    {r.description && <p className="text-sm text-ink-600 dark:text-ink-400 mt-1 line-clamp-2">{r.description}</p>}
                    <div className="text-xs text-ink-400 dark:text-ink-500 mt-2 flex items-center gap-2">
                      <span>role: {r.role}</span>
                      {r.is_public ? <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700">public</span> : <span className="px-1.5 py-0.5 rounded bg-ink-100 dark:bg-ink-700 text-ink-600 dark:text-ink-300">private</span>}
                      <span className="ml-auto font-mono">{r.invite_code}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Public rooms you can join</h2>
            {filteredPublic.length === 0 ? (
              <p className="text-sm text-ink-400 dark:text-ink-500">{search ? 'No matching public rooms' : 'No public rooms right now.'}</p>
            ) : (
              <ul className="grid sm:grid-cols-2 gap-3">
                {filteredPublic.map((r) => (
<li key={r.id} className="rounded-xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-4">
                      <div className="flex items-center justify-between">
                        <Link href={`/community/rooms/${r.id}`} className="font-medium hover:underline">{r.name}</Link>
                        <span className="text-xs text-ink-400 dark:text-ink-500">{r.member_count} members</span>
                      </div>
                      {r.description && <p className="text-sm text-ink-600 dark:text-ink-400 mt-1 line-clamp-2">{r.description}</p>}
                    </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-ink-900/40 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white dark:bg-ink-800 rounded-2xl shadow-2xl max-w-md w-full p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-3">Create a study room</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-ink-200 dark:border-ink-600 dark:bg-ink-900 dark:text-ink-100 rounded-md p-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description (optional)</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border border-ink-200 dark:border-ink-600 dark:bg-ink-900 dark:text-ink-100 rounded-md p-2 text-sm min-h-[60px]" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
                Public — anyone can see and request to join
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 rounded text-sm hover:bg-ink-100 dark:hover:bg-ink-700">Cancel</button>
              <button onClick={create} disabled={!name.trim() || creating} className="px-3 py-1.5 rounded bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 disabled:opacity-50 flex items-center gap-1.5">
                {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
