'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, Plus, Search, Lock, Globe, Loader2, X } from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';
import { t } from '@/lib/translations';
import { LaurelFrame } from '@/components/LaurelFrame';

type Group = {
  id: string;
  name: string;
  description: string | null;
  privacy: string;
  invite_code: string | null;
  owner_id: string;
  owner_name: string | null;
  owner_image: string | null;
  owner_avatar_frame: string | null;
  member_count: number;
  role?: string;
  created_at: number;
};

export default function GroupsPage() {
  const router = useRouter();
  const { locale } = useLanguage();
  const [mine, setMine] = useState<Group[]>([]);
  const [publicGroups, setPublicGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createPrivacy, setCreatePrivacy] = useState<'public' | 'private'>('public');
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  async function load() {
    setLoading(true);
    const r = await fetch('/api/groups');
    if (r.status === 401) { router.push('/login'); return; }
    const d = await r.json();
    setMine(d.mine || []);
    setPublicGroups(d.publicGroups || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function createGroup() {
    if (!createName.trim()) return;
    setCreating(true);
    try {
      const r = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: createName, description: createDesc, privacy: createPrivacy }),
      });
      const d = await r.json();
      if (r.ok) {
        setShowCreate(false);
        setCreateName('');
        setCreateDesc('');
        setCreatePrivacy('public');
        router.push(`/community/groups/${d.id}`);
      }
    } finally {
      setCreating(false);
    }
  }

  async function joinByCode() {
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      // Search all public groups for invite code match
      const matched = [...mine, ...publicGroups].find(g => g.invite_code === joinCode.trim().toUpperCase());
      if (matched) {
        const r = await fetch(`/api/groups/${matched.id}/join`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ invite_code: joinCode.trim().toUpperCase() }),
        });
        if (r.ok) {
          setShowJoin(false);
          setJoinCode('');
          load();
        } else {
          const d = await r.json();
          alert(d.error || 'Failed to join');
        }
      } else {
        alert(locale === 'zh' ? '未找到该邀请码对应的群组' : 'No group found with this invite code');
      }
    } finally {
      setJoining(false);
    }
  }

  const filteredMine = mine.filter(g => !search.trim() || g.name.toLowerCase().includes(search.toLowerCase()));
  const filteredPublic = publicGroups.filter(g => !search.trim() || g.name.toLowerCase().includes(search.toLowerCase()) || (g.description || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-accent-500" /> {t(locale, 'group.title')}
          </h1>
          <p className="text-ink-600 dark:text-ink-400 text-sm mt-1">{t(locale, 'group.description')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowJoin(true)} className="px-3 py-1.5 rounded border border-ink-200 dark:border-ink-600 hover:bg-ink-50 dark:hover:bg-ink-700 text-sm flex items-center gap-1.5">
            <Lock className="w-4 h-4" /> {t(locale, 'group.joinByCode')}
          </button>
          <button onClick={() => setShowCreate(true)} className="px-3 py-1.5 rounded bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> {t(locale, 'group.createGroup')}
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 dark:text-ink-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t(locale, 'group.searchGroups')}
          className="w-full pl-10 pr-4 py-2.5 border border-ink-200 dark:border-ink-600 bg-white dark:bg-ink-900 dark:text-ink-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-400"
        />
      </div>

      {loading ? (
        <div className="text-ink-400 dark:text-ink-500 text-sm">{t(locale, 'common.loading')}</div>
      ) : (
        <>
          <section>
            <h2 className="text-lg font-semibold mb-3">{t(locale, 'group.yourGroups')}</h2>
            {filteredMine.length === 0 ? (
              <div className="rounded-xl border border-dashed border-ink-200 dark:border-ink-600 p-6 text-center text-sm text-ink-400 dark:text-ink-500">
                {search ? t(locale, 'common.noResults') : t(locale, 'group.noGroups')}
              </div>
            ) : (
              <ul className="grid sm:grid-cols-2 gap-3">
                {filteredMine.map((g) => (
                  <li key={g.id} className="rounded-xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-4">
                    <div className="flex items-center justify-between">
                      <Link href={`/community/groups/${g.id}`} className="font-medium hover:underline">{g.name}</Link>
                      <span className="text-xs text-ink-400 dark:text-ink-500">{g.member_count} {t(locale, 'group.members')}</span>
                    </div>
                    {g.description && <p className="text-sm text-ink-600 dark:text-ink-400 mt-1 line-clamp-2">{g.description}</p>}
                    <div className="text-xs text-ink-400 dark:text-ink-500 mt-2 flex items-center gap-2">
                      <span>{t(locale, 'group.role')}: {g.role}</span>
                      {g.privacy === 'public' ? (
                        <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700">{t(locale, 'group.public')}</span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-ink-100 dark:bg-ink-700 text-ink-600 dark:text-ink-300">{t(locale, 'group.private')}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">{t(locale, 'group.publicGroups')}</h2>
            {filteredPublic.length === 0 ? (
              <p className="text-sm text-ink-400 dark:text-ink-500">{search ? t(locale, 'common.noResults') : t(locale, 'group.noPublicGroups')}</p>
            ) : (
              <ul className="grid sm:grid-cols-2 gap-3">
                {filteredPublic.map((g) => (
                  <li key={g.id} className="rounded-xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-4">
                    <div className="flex items-center justify-between">
                      <Link href={`/community/groups/${g.id}`} className="font-medium hover:underline">{g.name}</Link>
                      <span className="text-xs text-ink-400 dark:text-ink-500">{g.member_count} {t(locale, 'group.members')}</span>
                    </div>
                    {g.description && <p className="text-sm text-ink-600 dark:text-ink-400 mt-1 line-clamp-2">{g.description}</p>}
                    <div className="text-xs text-ink-400 dark:text-ink-500 mt-2 flex items-center gap-2">
                      {g.owner_name && (
                        <span className="flex items-center gap-1">
                          <LaurelFrame frameId={g.owner_avatar_frame || 'none'} size={20}>
                            {g.owner_image ? <img src={g.owner_image} className="w-3.5 h-3.5 rounded-full" /> : <span className="w-3.5 h-3.5 rounded-full bg-accent-500 text-white text-[7px] font-medium flex items-center justify-center">{(g.owner_name || '?').slice(0,1).toUpperCase()}</span>}
                          </LaurelFrame>
                          {g.owner_name}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {/* Create Group Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-ink-900/40 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white dark:bg-ink-800 rounded-2xl shadow-2xl max-w-md w-full p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-3">{t(locale, 'group.createGroup')}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">{t(locale, 'group.groupName')}</label>
                <input value={createName} onChange={(e) => setCreateName(e.target.value)} className="w-full border border-ink-200 dark:border-ink-600 bg-white dark:bg-ink-900 dark:text-ink-100 rounded-md p-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t(locale, 'group.groupDesc')}</label>
                <textarea value={createDesc} onChange={(e) => setCreateDesc(e.target.value)} className="w-full border border-ink-200 dark:border-ink-600 bg-white dark:bg-ink-900 dark:text-ink-100 rounded-md p-2 text-sm min-h-[60px]" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t(locale, 'group.groupPrivacy')}</label>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => setCreatePrivacy('public')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 border transition-colors ${
                      createPrivacy === 'public'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                        : 'border-ink-200 dark:border-ink-600 text-ink-600 dark:text-ink-400 hover:bg-ink-50 dark:hover:bg-ink-700'
                    }`}
                  >
                    <Globe className="w-4 h-4" /> {t(locale, 'group.public')}
                  </button>
                  <button
                    onClick={() => setCreatePrivacy('private')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 border transition-colors ${
                      createPrivacy === 'private'
                        ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-400'
                        : 'border-ink-200 dark:border-ink-600 text-ink-600 dark:text-ink-400 hover:bg-ink-50 dark:hover:bg-ink-700'
                    }`}
                  >
                    <Lock className="w-4 h-4" /> {t(locale, 'group.private')}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 rounded text-sm hover:bg-ink-100 dark:hover:bg-ink-700">{t(locale, 'common.cancel')}</button>
              <button onClick={createGroup} disabled={!createName.trim() || creating} className="px-3 py-1.5 rounded bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 disabled:opacity-50 flex items-center gap-1.5">
                {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {creating ? t(locale, 'group.creating') : t(locale, 'group.createBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join by Code Modal */}
      {showJoin && (
        <div className="fixed inset-0 z-50 bg-ink-900/40 flex items-center justify-center p-4" onClick={() => setShowJoin(false)}>
          <div className="bg-white dark:bg-ink-800 rounded-2xl shadow-2xl max-w-sm w-full p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">{t(locale, 'group.joinGroup')}</h3>
              <button onClick={() => setShowJoin(false)} className="p-1 hover:bg-ink-100 dark:hover:bg-ink-700 rounded"><X className="w-4 h-4" /></button>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t(locale, 'group.inviteCode')}</label>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder={t(locale, 'group.enterInviteCode')}
                maxLength={6}
                className="w-full border border-ink-200 dark:border-ink-600 bg-white dark:bg-ink-900 dark:text-ink-100 rounded-md p-2 text-sm font-mono text-center text-lg tracking-widest uppercase"
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowJoin(false)} className="px-3 py-1.5 rounded text-sm hover:bg-ink-100 dark:hover:bg-ink-700">{t(locale, 'common.cancel')}</button>
              <button onClick={joinByCode} disabled={!joinCode.trim() || joining} className="px-3 py-1.5 rounded bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 disabled:opacity-50 flex items-center gap-1.5">
                {joining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {t(locale, 'group.join')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
