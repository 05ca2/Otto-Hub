'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, UserPlus, UserCheck, UserX, Loader2, Users } from 'lucide-react';

type Friend = { id: string; name: string; email: string; image: string | null; friends_since: number };
type PendingRequest = { from_user_id?: string; to_user_id?: string; name: string; email: string; image: string | null; created_at: number };

export default function FriendsPage() {
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingReceived, setPendingReceived] = useState<PendingRequest[]>([]);
  const [pendingSent, setPendingSent] = useState<PendingRequest[]>([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string; email: string; image: string | null }>>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'find'>('friends');

  async function load() {
    setLoading(true);
    const r = await fetch('/api/friends');
    if (r.status === 401) { router.push('/login'); return; }
    const d = await r.json();
    setFriends(d.friends || []);
    setPendingReceived(d.pendingReceived || []);
    setPendingSent(d.pendingSent || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function searchUsers() {
    if (!search.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const r = await fetch(`/api/users/search?q=${encodeURIComponent(search)}`);
      if (r.ok) {
        const d = await r.json();
        setSearchResults(d.users || []);
      }
    } finally {
      setSearching(false);
    }
  }

  useEffect(() => { searchUsers(); }, [search]);

  async function sendRequest(friendId: string) {
    await fetch('/api/friends', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ friendId }),
    });
    await load();
  }

  async function acceptRequest(fromUserId: string) {
    await fetch('/api/friends', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fromUserId, action: 'accept' }),
    });
    await load();
  }

  async function rejectRequest(fromUserId: string) {
    await fetch('/api/friends', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fromUserId, action: 'reject' }),
    });
    await load();
  }

  async function removeFriend(friendId: string) {
    if (!confirm('Remove this friend?')) return;
    await fetch('/api/friends', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ friendId }),
    });
    await load();
  }

  function isFriend(userId: string) {
    return friends.some((f) => f.id === userId);
  }

  function hasPendingRequest(userId: string) {
    return pendingSent.some((p) => p.to_user_id === userId);
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-accent-500" /> Friends
          </h1>
          <p className="text-ink-600 dark:text-ink-400 text-sm mt-1">Connect with other learners.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-ink-100 dark:border-ink-700 pb-2">
        <button
          onClick={() => setActiveTab('friends')}
          className={`px-4 py-2 rounded text-sm font-medium ${activeTab === 'friends' ? 'bg-accent-500 text-white' : 'text-ink-600 dark:text-ink-400 hover:bg-ink-50 dark:hover:bg-ink-700'}`}
        >
          Friends ({friends.length})
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded text-sm font-medium ${activeTab === 'requests' ? 'bg-accent-500 text-white' : 'text-ink-600 dark:text-ink-400 hover:bg-ink-50 dark:hover:bg-ink-700'}`}
        >
          Requests ({pendingReceived.length})
        </button>
        <button
          onClick={() => setActiveTab('find')}
          className={`px-4 py-2 rounded text-sm font-medium ${activeTab === 'find' ? 'bg-accent-500 text-white' : 'text-ink-600 dark:text-ink-400 hover:bg-ink-50 dark:hover:bg-ink-700'}`}
        >
          Find Friends
        </button>
      </div>

      {loading ? (
        <div className="text-ink-400 dark:text-ink-500 text-sm">Loading…</div>
      ) : (
        <>
          {/* Friends List */}
          {activeTab === 'friends' && (
            <div>
              {friends.length === 0 ? (
                <div className="rounded-xl border border-dashed border-ink-200 dark:border-ink-600 p-8 text-center text-sm text-ink-400 dark:text-ink-500">
                  <p>No friends yet. Find and add friends to connect!</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {friends.map((f) => (
                    <li key={f.id} className="rounded-xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-4 flex items-center gap-4">
                      <Link href={`/u/${f.id}`}>
                        {f.image ? (
                          <img src={f.image} alt="" className="w-10 h-10 rounded-full" />
                        ) : (
                          <span className="w-10 h-10 rounded-full bg-accent-500 text-white font-medium flex items-center justify-center">
                            {(f.name || '?').slice(0, 1).toUpperCase()}
                          </span>
                        )}
                      </Link>
                      <div className="flex-1">
                        <Link href={`/u/${f.id}`} className="font-medium hover:underline dark:text-ink-100">{f.name || f.email}</Link>
                        <div className="text-xs text-ink-400 dark:text-ink-500">Friends since {new Date(f.friends_since).toLocaleDateString()}</div>
                      </div>
                      <button
                        onClick={() => removeFriend(f.id)}
                        className="px-3 py-1.5 rounded text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Pending Requests */}
          {activeTab === 'requests' && (
            <div>
              {pendingReceived.length === 0 ? (
                <div className="rounded-xl border border-dashed border-ink-200 dark:border-ink-600 p-8 text-center text-sm text-ink-400 dark:text-ink-500">
                  <p>No pending friend requests.</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {pendingReceived.map((p) => (
                    <li key={p.from_user_id} className="rounded-xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-4 flex items-center gap-4">
                      <Link href={`/u/${p.from_user_id}`}>
                        {p.image ? (
                          <img src={p.image} alt="" className="w-10 h-10 rounded-full" />
                        ) : (
                          <span className="w-10 h-10 rounded-full bg-accent-500 text-white font-medium flex items-center justify-center">
                            {(p.name || '?').slice(0, 1).toUpperCase()}
                          </span>
                        )}
                      </Link>
                      <div className="flex-1">
                        <Link href={`/u/${p.from_user_id}`} className="font-medium hover:underline dark:text-ink-100">{p.name || p.email}</Link>
                        <div className="text-xs text-ink-400 dark:text-ink-500">Sent {new Date(p.created_at).toLocaleDateString()}</div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => acceptRequest(p.from_user_id!)}
                          className="px-3 py-1.5 rounded bg-green-500 text-white text-sm font-medium hover:bg-green-600 flex items-center gap-1"
                        >
                          <UserCheck className="w-4 h-4" /> Accept
                        </button>
                        <button
                          onClick={() => rejectRequest(p.from_user_id!)}
                          className="px-3 py-1.5 rounded text-red-600 text-sm hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-1"
                        >
                          <UserX className="w-4 h-4" /> Reject
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Find Friends */}
          {activeTab === 'find' && (
            <div>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 dark:text-ink-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search users by name or email..."
                  className="w-full pl-10 pr-4 py-2.5 border border-ink-200 dark:border-ink-600 rounded-lg text-sm bg-white dark:bg-ink-900 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-accent-400"
                />
              </div>

              {searching ? (
                <div className="text-ink-400 dark:text-ink-500 text-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Searching...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="rounded-xl border border-dashed border-ink-200 dark:border-ink-600 p-8 text-center text-sm text-ink-400 dark:text-ink-500">
                  {search ? 'No users found' : 'Search for users to add as friends'}
                </div>
              ) : (
                <ul className="space-y-3">
                  {searchResults.map((u) => (
                    <li key={u.id} className="rounded-xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-4 flex items-center gap-4">
                      <Link href={`/u/${u.id}`}>
                        {u.image ? (
                          <img src={u.image} alt="" className="w-10 h-10 rounded-full" />
                        ) : (
                          <span className="w-10 h-10 rounded-full bg-accent-500 text-white font-medium flex items-center justify-center">
                            {(u.name || '?').slice(0, 1).toUpperCase()}
                          </span>
                        )}
                      </Link>
                      <div className="flex-1">
                        <Link href={`/u/${u.id}`} className="font-medium hover:underline dark:text-ink-100">{u.name || u.email}</Link>
                        <div className="text-xs text-ink-400 dark:text-ink-500">{u.email}</div>
                      </div>
                      {isFriend(u.id) ? (
                        <span className="px-3 py-1.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium flex items-center gap-1">
                          <UserCheck className="w-4 h-4" /> Friends
                        </span>
                      ) : hasPendingRequest(u.id) ? (
                        <span className="px-3 py-1.5 rounded bg-ink-100 dark:bg-ink-700 text-ink-600 dark:text-ink-300 text-sm font-medium">
                          Request Sent
                        </span>
                      ) : (
                        <button
                          onClick={() => sendRequest(u.id)}
                          className="px-3 py-1.5 rounded bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 flex items-center gap-1"
                        >
                          <UserPlus className="w-4 h-4" /> Add Friend
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
