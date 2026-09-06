'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, Send, Smile, Paperclip, Megaphone, Pin, Trash2, Edit2, Loader2, X, Settings, Plus, ThumbsDown, Quote, RotateCcw } from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';
import { t } from '@/lib/translations';
import { LaurelFrame } from '@/components/LaurelFrame';

type Group = { id: string; name: string; description: string | null; privacy: string; invite_code: string | null; owner_id: string; created_at: number };
type Member = { id: string; name: string; image: string | null; avatar_frame: string | null; role: string; joined_at: number };
type Message = { id: string; author_id: string; author_name: string; author_image: string | null; author_avatar_frame: string | null; content: string; msg_type: string; file_url: string | null; file_name: string | null; created_at: number };
type Announcement = { id: string; author_id: string; author_name: string; title: string; body: string; is_pinned: number; created_at: number; updated_at: number | null };

const QUICK_EMOJI = ['👍', '❤️', '😊', '🎉', '📚', '✅', '🔥', '💡', '😂', '🙏', '👏', '💪'];

export default function GroupDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { locale } = useLanguage();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [myRole, setMyRole] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [me, setMe] = useState<{ id: string; role: string | null } | null>(null);
  const [tab, setTab] = useState<'chat' | 'announcements' | 'members'>('chat');
  const [msgInput, setMsgInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAnnModal, setShowAnnModal] = useState(false);
  const [editAnn, setEditAnn] = useState<Announcement | null>(null);
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [announcing, setAnnouncing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; message: Message } | null>(null);
  const [quoting, setQuoting] = useState<Message | null>(null);
  const [dissolving, setDissolving] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  async function load() {
    const r = await fetch(`/api/groups/${params.id}`);
    if (r.status === 401) { router.push('/login'); return; }
    if (r.status === 404 || r.status === 403) { router.push('/community/groups'); return; }
    const d = await r.json();
    setGroup(d.group);
    setMembers(d.members || []);
    setIsMember(d.isMember);
    setMyRole(d.myRole || '');
    if (d.isMember) {
      const [msgRes, annRes] = await Promise.all([
        fetch(`/api/groups/${params.id}/messages`),
        fetch(`/api/groups/${params.id}/announcements`),
      ]);
      if (msgRes.ok) { const md = await msgRes.json(); setMessages(md.messages || []); }
      if (annRes.ok) { const ad = await annRes.json(); setAnnouncements(ad.announcements || []); }
    }
  }

  useEffect(() => { load(); }, [params.id]);
  useEffect(() => {
    fetch('/api/auth').then((r) => r.json()).then((d) => setMe(d.user || null)).catch(() => {});
  }, []);

  // Poll messages every 5s
  useEffect(() => {
    if (!isMember) return;
    const interval = setInterval(async () => {
      const r = await fetch(`/api/groups/${params.id}/messages`);
      if (r.ok) { const d = await r.json(); setMessages(d.messages || []); }
    }, 5000);
    return () => clearInterval(interval);
  }, [params.id, isMember]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isOwner = Boolean(me && group && group.owner_id === me.id);
  const isAdmin = isOwner || myRole === 'admin';

  async function sendMessage() {
    if (!msgInput.trim() || sending) return;
    setSending(true);
    try {
      const payload: Record<string, unknown> = { content: msgInput, msg_type: 'text' };
      if (quoting) {
        payload.quoted_message_id = quoting.id;
        payload.content = `> ${quoting.author_name}: ${quoting.content}\n\n${msgInput}`;
      }
      const r = await fetch(`/api/groups/${params.id}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (r.ok) { setMsgInput(''); setQuoting(null); await load(); }
    } finally { setSending(false); }
  }

  async function sendEmoji(emoji: string) {
    const r = await fetch(`/api/groups/${params.id}/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: emoji, msg_type: 'emoji' }),
    });
    if (r.ok) { setShowEmoji(false); await load(); }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    const uploadRes = await fetch('/api/upload-image', { method: 'POST', body: formData });
    if (!uploadRes.ok) return;
    const uploadData = await uploadRes.json();
    await fetch(`/api/groups/${params.id}/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: file.name, msg_type: 'file', file_url: uploadData.url, file_name: file.name }),
    });
    await load();
  }

  async function joinGroup() {
    const r = await fetch(`/api/groups/${params.id}/join`, { method: 'POST' });
    if (r.ok) load();
    else { const d = await r.json(); alert(d.error || 'Failed to join'); }
  }

  async function leaveGroup() {
    if (!confirm(t(locale, 'group.leaveConfirm'))) return;
    const r = await fetch(`/api/groups/${params.id}/leave`, { method: 'POST' });
    if (r.ok) router.push('/community/groups');
  }

  async function saveSettings() {
    setSaving(true);
    try {
      const r = await fetch(`/api/groups/${params.id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: editName, description: editDesc }),
      });
      if (r.ok) { setShowSettings(false); await load(); }
    } finally { setSaving(false); }
  }

  async function postAnnouncement() {
    if (!annTitle.trim() || !annBody.trim()) return;
    setAnnouncing(true);
    try {
      const url = editAnn ? `/api/groups/${params.id}/announcements` : `/api/groups/${params.id}/announcements`;
      const method = editAnn ? 'PUT' : 'POST';
      const body = editAnn
        ? { announcement_id: editAnn.id, title: annTitle, body: annBody }
        : { title: annTitle, body: annBody };
      const r = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      if (r.ok) { setShowAnnModal(false); setEditAnn(null); setAnnTitle(''); setAnnBody(''); await load(); }
    } finally { setAnnouncing(false); }
  }

  async function deleteAnnouncement(id: string) {
    if (!confirm(t(locale, 'group.deleteAnnouncement') + '?')) return;
    await fetch(`/api/groups/${params.id}/announcements`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ announcement_id: id }),
    });
    await load();
  }

  async function removeMember(userId: string) {
    if (!confirm(t(locale, 'group.removeMember') + '?')) return;
    // TODO: implement remove member API
  }

  function openEditAnn(a: Announcement) {
    setEditAnn(a);
    setAnnTitle(a.title);
    setAnnBody(a.body);
    setShowAnnModal(true);
  }

  function handleContextMenu(e: React.MouseEvent, message: Message) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, message });
  }

  async function recallMessage(message: Message) {
    if (!confirm(t(locale, 'group.recall') + '?')) return;
    await fetch(`/api/groups/${params.id}/messages`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message_id: message.id }),
    });
    setContextMenu(null);
    await load();
  }

  function quoteMessage(message: Message) {
    setQuoting(message);
    setContextMenu(null);
  }

  async function dissolveGroup() {
    if (!confirm(t(locale, 'group.dissolveConfirm'))) return;
    setDissolving(true);
    try {
      const r = await fetch(`/api/groups/${params.id}`, { method: 'DELETE' });
      if (r.ok) { router.push('/community/groups'); }
    } finally { setDissolving(false); }
  }

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [contextMenu]);

  if (!group) return <div className="text-ink-400 dark:text-ink-500 text-sm">{t(locale, 'common.loading')}</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/community/groups" className="text-ink-400 hover:text-ink-600 dark:hover:text-ink-300">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                {group.name}
                {group.privacy === 'public' ? (
                  <span className="px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700">{t(locale, 'group.public')}</span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-xs bg-ink-100 dark:bg-ink-700 text-ink-600 dark:text-ink-300">{t(locale, 'group.private')}</span>
                )}
              </h1>
              {group.description && <p className="text-sm text-ink-500 dark:text-ink-400 mt-0.5">{group.description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-400 dark:text-ink-500">{members.length} {t(locale, 'group.members')}</span>
            {isMember && !isOwner && (
              <button onClick={leaveGroup} className="px-3 py-1.5 rounded border border-ink-200 dark:border-ink-600 text-sm text-ink-600 dark:text-ink-400 hover:bg-ink-50 dark:hover:bg-ink-700">{t(locale, 'group.leave')}</button>
            )}
            {isOwner && (
              <button onClick={() => { setEditName(group.name); setEditDesc(group.description || ''); setShowSettings(true); }} className="p-1.5 rounded hover:bg-ink-100 dark:hover:bg-ink-700 text-ink-400">
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        {!isMember && (
          <div className="mt-3">
            <button onClick={joinGroup} className="px-4 py-2 rounded-lg bg-accent-500 text-white text-sm font-medium hover:bg-accent-600">{t(locale, 'group.join')}</button>
          </div>
        )}
      </div>

      {isMember && (
        <>
          {/* Tab Bar */}
          <div className="flex gap-1 bg-ink-100 dark:bg-ink-700 p-1 rounded-lg">
            {(['chat', 'announcements', 'members'] as const).map((key) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                  tab === key ? 'bg-white dark:bg-ink-800 shadow-sm text-accent-600 dark:text-accent-400' : 'text-ink-500 dark:text-ink-400 hover:text-ink-700 dark:hover:text-ink-300'
                }`}
              >
                {key === 'chat' ? t(locale, 'group.chat') : key === 'announcements' ? t(locale, 'group.announcements') : t(locale, 'group members')}
              </button>
            ))}
          </div>

          {/* Chat Tab */}
          {tab === 'chat' && (
            <div className="rounded-2xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 flex flex-col" style={{ height: 'calc(100vh - 300px)', minHeight: '400px' }}>
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center text-ink-400 dark:text-ink-500 text-sm py-8">{t(locale, 'group.noMessages')}</div>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={`flex gap-2 ${m.author_id === me?.id ? 'flex-row-reverse' : ''}`}>
                      <Link href={`/u/${m.author_id}`} className="shrink-0 mt-0.5">
                        <LaurelFrame frameId={m.author_avatar_frame || 'none'} size={28}>
                          {m.author_image ? <img src={m.author_image} className="w-5 h-5 rounded-full" /> : <span className="w-5 h-5 rounded-full bg-accent-500 text-white text-[8px] font-medium flex items-center justify-center">{(m.author_name || '?').slice(0,1).toUpperCase()}</span>}
                        </LaurelFrame>
                      </Link>
                      <div className={`max-w-[70%] ${m.author_id === me?.id ? 'text-right' : ''}`}>
                        <div className="text-[11px] text-ink-400 dark:text-ink-500 mb-0.5">
                          <Link href={`/u/${m.author_id}`} className="hover:underline">{m.author_name}</Link>
                          <span className="ml-1.5">{new Date(m.created_at).toLocaleTimeString(locale === 'zh' ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {m.msg_type === 'emoji' ? (
                          <div className="text-3xl leading-loose">{m.content}</div>
                        ) : m.msg_type === 'file' ? (
                          <a href={m.file_url || '#'} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-700 border border-ink-200 dark:border-ink-600 text-sm hover:bg-ink-100 dark:hover:bg-ink-600">
                            <Paperclip className="w-3.5 h-3.5" /> {m.file_name || 'File'}
                          </a>
                        ) : (
                          <div
                            onContextMenu={(e) => handleContextMenu(e, m)}
                            className={`inline-block px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap cursor-default select-text ${
                              m.author_id === me?.id
                                ? 'bg-accent-500 text-white rounded-br-md'
                                : 'bg-ink-100 dark:bg-ink-700 text-ink-800 dark:text-ink-100 rounded-bl-md'
                            }`}
                          >{m.content}</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              {/* Input */}
              <div className="border-t border-ink-100 dark:border-ink-700 p-3">
                {quoting && (
                  <div className="mb-2 px-3 py-2 bg-accent-50 dark:bg-accent-900/20 border-l-2 border-accent-400 rounded text-xs text-ink-600 dark:text-ink-400 flex items-center justify-between">
                    <span className="truncate"><span className="font-medium">{quoting.author_name}:</span> {quoting.content}</span>
                    <button onClick={() => setQuoting(null)} className="ml-2 shrink-0"><X className="w-3 h-3" /></button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button onClick={() => setShowEmoji(!showEmoji)} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-700 text-ink-400">
                      <Smile className="w-5 h-5" />
                    </button>
                    {showEmoji && (
                      <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-ink-800 border border-ink-200 dark:border-ink-600 rounded-xl shadow-xl p-3 grid grid-cols-6 gap-2 z-10 w-[280px]">
                        {QUICK_EMOJI.map((e) => (
                          <button key={e} onClick={() => sendEmoji(e)} className="text-2xl p-2 hover:bg-ink-100 dark:hover:bg-ink-700 rounded-lg transition-colors">{e}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <label className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-700 text-ink-400 cursor-pointer">
                    <Paperclip className="w-5 h-5" />
                    <input type="file" className="hidden" onChange={handleFileUpload} />
                  </label>
                  <input
                    value={msgInput}
                    onChange={(e) => setMsgInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder={t(locale, 'group.typeMessage')}
                    className="flex-1 border border-ink-200 dark:border-ink-600 bg-white dark:bg-ink-900 dark:text-ink-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-400"
                  />
                  <button onClick={sendMessage} disabled={!msgInput.trim() || sending} className="p-2 rounded-full bg-accent-500 text-white hover:bg-accent-600 disabled:opacity-50">
                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Announcements Tab */}
          {tab === 'announcements' && (
            <div className="space-y-3">
              {isAdmin && (
                <button onClick={() => { setEditAnn(null); setAnnTitle(''); setAnnBody(''); setShowAnnModal(true); }} className="px-3 py-1.5 rounded bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> {t(locale, 'group.createAnnouncement')}
                </button>
              )}
              {announcements.length === 0 ? (
                <div className="rounded-xl border border-dashed border-ink-200 dark:border-ink-600 p-6 text-center text-sm text-ink-400 dark:text-ink-500">{t(locale, 'group.noAnnouncements')}</div>
              ) : (
                <ul className="space-y-2">
                  {announcements.map((a) => (
                    <li key={a.id} className={`rounded-xl border p-4 ${a.is_pinned ? 'border-accent-200 dark:border-accent-800 bg-accent-50/40 dark:bg-accent-900/20' : 'border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {a.is_pinned ? <Pin className="w-4 h-4 text-accent-500 shrink-0" /> : <Megaphone className="w-4 h-4 text-ink-400 shrink-0" />}
                            <span className="font-medium">{a.title}</span>
                            {a.is_pinned ? <span className="px-1.5 py-0.5 rounded bg-accent-100 dark:bg-accent-900/40 text-accent-700 dark:text-accent-300 text-[10px] font-medium">{t(locale, 'group.pinned')}</span> : null}
                          </div>
                          <div className="text-xs text-ink-400 dark:text-ink-500 mt-1">
                            <span>{a.author_name}</span> · <span>{new Date(a.created_at).toLocaleString()}</span>
                          </div>
                          {a.body && <p className="text-sm text-ink-600 dark:text-ink-400 mt-2 whitespace-pre-wrap">{a.body}</p>}
                        </div>
                        {(isOwner || me?.id === a.author_id) && (
                          <div className="flex items-center gap-1 shrink-0">
                            {isOwner && <button onClick={() => openEditAnn(a)} className="p-1.5 rounded hover:bg-ink-100 dark:hover:bg-ink-700 text-ink-400"><Edit2 className="w-3.5 h-3.5" /></button>}
                            {(isOwner || me?.id === a.author_id) && <button onClick={() => deleteAnnouncement(a.id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Members Tab */}
          {tab === 'members' && (
            <div className="space-y-3">
              {group.invite_code && isOwner && (
                <div className="rounded-xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-3 flex items-center gap-3">
                  <span className="text-sm text-ink-500 dark:text-ink-400">{t(locale, 'group.inviteCode')}:</span>
                  <span className="font-mono text-lg tracking-widest text-accent-600 dark:text-accent-400">{group.invite_code}</span>
                </div>
              )}
              <ul className="space-y-2">
                {members.map((m) => (
                  <li key={m.id} className="rounded-xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-3 flex items-center gap-3">
                    <LaurelFrame frameId={m.avatar_frame || 'none'} size={32}>
                      {m.image ? <img src={m.image} className="w-6 h-6 rounded-full" /> : <span className="w-6 h-6 rounded-full bg-accent-500 text-white text-[10px] font-medium flex items-center justify-center">{(m.name || '?').slice(0,1).toUpperCase()}</span>}
                    </LaurelFrame>
                    <Link href={`/u/${m.id}`} className="font-medium text-sm hover:underline flex-1">{m.name}</Link>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${m.role === 'owner' ? 'bg-accent-100 dark:bg-accent-900/40 text-accent-700 dark:text-accent-300' : m.role === 'admin' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'bg-ink-100 dark:bg-ink-700 text-ink-500 dark:text-ink-400'}`}>
                      {m.role === 'owner' ? t(locale, 'group.owner') : m.role === 'admin' ? t(locale, 'group.admin') : t(locale, 'group.member')}
                    </span>
                    {isOwner && m.id !== me?.id && (
                      <button onClick={() => removeMember(m.id)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30">{t(locale, 'group.removeMember')}</button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white dark:bg-ink-800 border border-ink-200 dark:border-ink-600 rounded-xl shadow-xl py-1 min-w-[120px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.message.author_id === me?.id && (
            <button
              onClick={() => recallMessage(contextMenu.message)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-ink-100 dark:hover:bg-ink-700 flex items-center gap-2 text-ink-700 dark:text-ink-300"
            >
              <RotateCcw className="w-4 h-4" />
              {t(locale, 'group.recall')}
            </button>
          )}
          {contextMenu.message.author_id !== me?.id && (
            <>
              <button
                onClick={() => setContextMenu(null)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-ink-100 dark:hover:bg-ink-700 flex items-center gap-2 text-ink-700 dark:text-ink-300"
              >
                👍 {t(locale, 'group.like')}
              </button>
              <button
                onClick={() => setContextMenu(null)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-ink-100 dark:hover:bg-ink-700 flex items-center gap-2 text-ink-700 dark:text-ink-300"
              >
                👎 {t(locale, 'group.dislike')}
              </button>
            </>
          )}
          <button
            onClick={() => quoteMessage(contextMenu.message)}
            className="w-full px-3 py-2 text-left text-sm hover:bg-ink-100 dark:hover:bg-ink-700 flex items-center gap-2 text-ink-700 dark:text-ink-300"
          >
            <Quote className="w-4 h-4" />
            {t(locale, 'group.quote')}
          </button>
        </div>
      )}

      {/* Announcement Modal */}
      {showAnnModal && (
        <div className="fixed inset-0 z-50 bg-ink-900/40 flex items-center justify-center p-4" onClick={() => setShowAnnModal(false)}>
          <div className="bg-white dark:bg-ink-800 rounded-2xl shadow-2xl max-w-xl w-full p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">{editAnn ? t(locale, 'group.editAnnouncement') : t(locale, 'group.createAnnouncement')}</h3>
              <button onClick={() => setShowAnnModal(false)} className="p-1 hover:bg-ink-100 dark:hover:bg-ink-700 rounded"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">{t(locale, 'group.announcementTitle')}</label>
                <input value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} className="w-full border border-ink-200 dark:border-ink-600 bg-white dark:bg-ink-900 dark:text-ink-100 rounded-md p-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t(locale, 'group.announcementBody')}</label>
                <textarea value={annBody} onChange={(e) => setAnnBody(e.target.value)} className="w-full border border-ink-200 dark:border-ink-600 bg-white dark:bg-ink-900 dark:text-ink-100 rounded-md p-2 text-sm min-h-[120px]" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowAnnModal(false)} className="px-3 py-1.5 rounded text-sm hover:bg-ink-100 dark:hover:bg-ink-700">{t(locale, 'common.cancel')}</button>
              <button onClick={postAnnouncement} disabled={!annTitle.trim() || !annBody.trim() || announcing} className="px-3 py-1.5 rounded bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 disabled:opacity-50 flex items-center gap-1.5">
                {announcing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {announcing ? t(locale, 'group.creating') : t(locale, 'common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-ink-900/40 flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
          <div className="bg-white dark:bg-ink-800 rounded-2xl shadow-2xl max-w-md w-full p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-3">{t(locale, 'group.settings')}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">{t(locale, 'group.groupName')}</label>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full border border-ink-200 dark:border-ink-600 bg-white dark:bg-ink-900 dark:text-ink-100 rounded-md p-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t(locale, 'group.groupDesc')}</label>
                <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="w-full border border-ink-200 dark:border-ink-600 bg-white dark:bg-ink-900 dark:text-ink-100 rounded-md p-2 text-sm min-h-[60px]" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowSettings(false)} className="px-3 py-1.5 rounded text-sm hover:bg-ink-100 dark:hover:bg-ink-700">{t(locale, 'common.cancel')}</button>
              {isOwner && (
                <button onClick={dissolveGroup} disabled={dissolving} className="px-3 py-1.5 rounded bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 flex items-center gap-1.5">
                  {dissolving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  {t(locale, 'group.dissolve')}
                </button>
              )}
              <button onClick={saveSettings} disabled={!editName.trim() || saving} className="px-3 py-1.5 rounded bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 disabled:opacity-50 flex items-center gap-1.5">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {t(locale, 'common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
