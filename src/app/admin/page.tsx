'use client';

import { useEffect, useState } from 'react';
import { Shield, Users, FileText, MessageSquare, Trash2, Crown, Ban, CheckCircle, Megaphone, Pin, Loader2 } from 'lucide-react';

type Stats = { users: number; documents: number; posts: number; comments: number; rooms: number };
type User = { id: string; name: string; email: string; role: string | null; doc_count: number; post_count: number; created_at: number };
type Doc = { id: string; title: string; source_type: string; owner_name: string; owner_email: string; created_at: number };
type Announcement = { id: string; author_id: string; author_name: string; author_image: string | null; room_id: string | null; title: string; body: string; is_pinned: number; created_at: number };

export default function AdminPage() {
  const [tab, setTab] = useState<'users' | 'docs' | 'announcements' | 'settings'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [announcing, setAnnouncing] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Announcement edit state
  const [editingAnn, setEditingAnn] = useState<Announcement | null>(null);
  const [editAnnTitle, setEditAnnTitle] = useState('');
  const [editAnnBody, setEditAnnBody] = useState('');
  const [editAnnPinned, setEditAnnPinned] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/users').then(r => r.json()),
      fetch('/api/admin/documents').then(r => r.json()),
      fetch('/api/admin/settings').then(r => r.json()),
      fetch('/api/announcements').then(r => r.json()),
    ]).then(([u, d, s, a]) => {
      setUsers(u.users || []);
      setDocs(d.documents || []);
      setStats(s.stats || null);
      setAnnouncements(a.announcements || []);
      setLoading(false);
    }).catch(() => {
      setError('Not authorized or server error');
      setLoading(false);
    });
  }, []);

  async function postAnnouncement() {
    if (!annTitle.trim() || !annBody.trim()) return;
    setAnnouncing(true);
    try {
      const r = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: annTitle, body: annBody }),
      });
      if (r.ok) {
        setAnnTitle(''); setAnnBody('');
        const d = await fetch('/api/announcements').then(r => r.json());
        setAnnouncements(d.announcements || []);
      }
    } finally { setAnnouncing(false); }
  }

  async function deleteAnnouncement(id: string) {
    if (!confirm('Delete this announcement?')) return;
    await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  }

  function openEditAnnouncement(ann: Announcement) {
    setEditingAnn(ann);
    setEditAnnTitle(ann.title);
    setEditAnnBody(ann.body);
    setEditAnnPinned(ann.is_pinned === 1);
  }

  async function saveEditAnnouncement() {
    if (!editingAnn || !editAnnTitle.trim() || !editAnnBody.trim()) return;
    setSavingEdit(true);
    try {
      const r = await fetch(`/api/announcements/${editingAnn.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: editAnnTitle, body: editAnnBody, isPinned: editAnnPinned }),
      });
      if (r.ok) {
        setAnnouncements(prev => prev.map(a => 
          a.id === editingAnn.id 
            ? { ...a, title: editAnnTitle, body: editAnnBody, is_pinned: editAnnPinned ? 1 : 0 }
            : a
        ));
        setEditingAnn(null);
      }
    } finally { setSavingEdit(false); }
  }

  async function toggleRole(userId: string, currentRole: string | null) {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: userId, role: newRole }),
    });
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
  }

  async function banUser(userId: string, currentRole: string | null) {
    const banned = currentRole !== 'banned';
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: userId, banned }),
    });
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: banned ? 'banned' : 'user' } : u));
  }

  async function deleteDoc(docId: string) {
    if (!confirm('Delete this document?')) return;
    await fetch('/api/admin/documents', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: docId }),
    });
    setDocs(prev => prev.filter(d => d.id !== docId));
  }

  if (loading) return <div className="max-w-6xl mx-auto p-6 text-center py-20 text-ink-400 dark:text-ink-500">Loading admin panel...</div>;
  if (error) return <div className="max-w-6xl mx-auto p-6 text-center py-20 text-red-500">{error}</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-6 h-6 text-amber-500" />
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { icon: Users, label: 'Users', value: stats.users },
            { icon: FileText, label: 'Docs', value: stats.documents },
            { icon: MessageSquare, label: 'Posts', value: stats.posts },
            { icon: MessageSquare, label: 'Comments', value: stats.comments },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-lg border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-4 text-center">
              <Icon className="w-4 h-4 mx-auto text-ink-400 dark:text-ink-500 mb-1" />
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-xs text-ink-400 dark:text-ink-500">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-ink-100 dark:border-ink-700 pb-2">
        {(['users', 'docs', 'announcements', 'settings'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded text-sm font-medium ${tab === t ? 'bg-accent-500 text-white' : 'hover:bg-ink-100 dark:hover:bg-ink-700'}`}>
            {t === 'users' ? 'Users' : t === 'docs' ? 'Documents' : t === 'announcements' ? 'Announcements' : 'Settings'}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {tab === 'users' && (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="flex items-center justify-between rounded-lg border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate dark:text-ink-100">{u.name || 'Anonymous'}</span>
                  {u.role === 'admin' && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                  {u.role === 'banned' && <Ban className="w-3.5 h-3.5 text-red-500" />}
                  <span className="text-xs text-ink-400 dark:text-ink-500">{u.email}</span>
                </div>
                <div className="text-xs text-ink-400 dark:text-ink-500 mt-0.5">{u.doc_count} docs · {u.post_count} posts</div>
              </div>
              <div className="flex gap-1 ml-3">
                <button onClick={() => toggleRole(u.id, u.role)}
                  className={`px-2 py-1 text-xs rounded ${u.role === 'admin' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-ink-100 dark:bg-ink-700 text-ink-600 dark:text-ink-300 hover:bg-ink-200 dark:hover:bg-ink-600'}`}>
                  {u.role === 'admin' ? 'Demote' : 'Make Admin'}
                </button>
                <button onClick={() => banUser(u.id, u.role)}
                  className={`px-2 py-1 text-xs rounded ${u.role === 'banned' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'}`}>
                  {u.role === 'banned' ? 'Unban' : 'Ban'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Documents Tab */}
      {tab === 'docs' && (
        <div className="space-y-2">
          {docs.map(d => (
            <div key={d.id} className="flex items-center justify-between rounded-lg border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate dark:text-ink-100">{d.title}</div>
                <div className="text-xs text-ink-400 dark:text-ink-500">
                  by {d.owner_name || d.owner_email} · {d.source_type} · {new Date(d.created_at).toLocaleDateString()}
                </div>
              </div>
              <button onClick={() => deleteDoc(d.id)}
                className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-400 hover:text-red-600 ml-3">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Announcements Tab */}
      {tab === 'announcements' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-4">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><Megaphone className="w-4 h-4 text-amber-500" /> New site-wide announcement</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} className="w-full border border-ink-200 dark:border-ink-600 rounded-md p-2 text-sm bg-white dark:bg-ink-900 dark:text-ink-100" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Body</label>
                <textarea value={annBody} onChange={(e) => setAnnBody(e.target.value)} className="w-full border border-ink-200 dark:border-ink-600 rounded-md p-2 text-sm min-h-[100px] bg-white dark:bg-ink-900 dark:text-ink-100" />
              </div>
            </div>
            <div className="flex justify-end mt-3">
              <button onClick={postAnnouncement} disabled={!annTitle.trim() || !annBody.trim() || announcing} className="px-3 py-1.5 rounded bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 disabled:opacity-50 flex items-center gap-1.5">
                {announcing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Megaphone className="w-3.5 h-3.5" />}
                {announcing ? 'Posting…' : 'Post announcement'}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {announcements.length === 0 ? (
              <div className="rounded-lg border border-dashed border-ink-200 dark:border-ink-600 p-6 text-center text-sm text-ink-400 dark:text-ink-500">
                No announcements yet.
              </div>
            ) : announcements.map(a => (
              <div key={a.id} className="rounded-lg border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {a.is_pinned ? <Pin className="w-3.5 h-3.5 text-amber-500" /> : <Megaphone className="w-3.5 h-3.5 text-ink-400 dark:text-ink-500" />}
                      <span className="font-medium truncate dark:text-ink-100">{a.title}</span>
                      {a.is_pinned ? <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-medium">pinned</span> : null}
                    </div>
                    <div className="text-xs text-ink-400 dark:text-ink-500 mt-0.5">
                      by {a.author_name} · {a.room_id ? 'room announcement' : 'site-wide'} · {new Date(a.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex gap-1 ml-3 shrink-0">
                    <button onClick={() => openEditAnnouncement(a)}
                      className="p-1.5 rounded hover:bg-ink-100 dark:hover:bg-ink-700 text-ink-400 dark:text-ink-500 hover:text-ink-600 dark:hover:text-ink-300">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => deleteAnnouncement(a.id)}
                      className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {a.body && <p className="text-sm text-ink-600 dark:text-ink-400 mt-2 whitespace-pre-wrap">{a.body}</p>}
              </div>
            ))}
          </div>

          {/* Edit Announcement Modal */}
          {editingAnn && (
            <div className="fixed inset-0 z-50 bg-ink-900/40 flex items-center justify-center p-4" onClick={() => setEditingAnn(null)}>
              <div className="bg-white dark:bg-ink-800 rounded-2xl shadow-2xl max-w-lg w-full p-5" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-semibold mb-3">Edit Announcement</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Title</label>
                    <input 
                      value={editAnnTitle} 
                      onChange={(e) => setEditAnnTitle(e.target.value)} 
                      className="w-full border border-ink-200 dark:border-ink-600 rounded-md p-2 text-sm bg-white dark:bg-ink-900 dark:text-ink-100" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Body</label>
                    <textarea 
                      value={editAnnBody} 
                      onChange={(e) => setEditAnnBody(e.target.value)} 
                      className="w-full border border-ink-200 dark:border-ink-600 rounded-md p-2 text-sm min-h-[150px] bg-white dark:bg-ink-900 dark:text-ink-100" 
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="editPinned"
                      checked={editAnnPinned}
                      onChange={(e) => setEditAnnPinned(e.target.checked)}
                      className="rounded border-ink-300 dark:border-ink-600 text-accent-500 focus:ring-accent-400"
                    />
                    <label htmlFor="editPinned" className="text-sm text-ink-600 dark:text-ink-400">Pin this announcement</label>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => setEditingAnn(null)} className="px-3 py-1.5 rounded text-sm hover:bg-ink-100 dark:hover:bg-ink-700">Cancel</button>
                  <button 
                    onClick={saveEditAnnouncement} 
                    disabled={!editAnnTitle.trim() || !editAnnBody.trim() || savingEdit}
                    className="px-3 py-1.5 rounded bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    {savingEdit ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {tab === 'settings' && stats && (
        <div className="rounded-lg border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-6">
          <h2 className="font-semibold mb-4">System Info</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-ink-500 dark:text-ink-400">Total Users</span><span>{stats.users}</span></div>
            <div className="flex justify-between"><span className="text-ink-500 dark:text-ink-400">Total Documents</span><span>{stats.documents}</span></div>
            <div className="flex justify-between"><span className="text-ink-500 dark:text-ink-400">Total Posts</span><span>{stats.posts}</span></div>
            <div className="flex justify-between"><span className="text-ink-500 dark:text-ink-400">Total Comments</span><span>{stats.comments}</span></div>
            <div className="flex justify-between"><span className="text-ink-500 dark:text-ink-400">Study Rooms</span><span>{stats.rooms}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
