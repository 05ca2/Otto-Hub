'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2, CheckCircle2, Upload, Lock, Check, Star, FileText, MessageSquare, ThumbsUp, LogIn } from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';
import { t } from '@/lib/translations';
import { LaurelFrame, LaurelFramePreview } from '@/components/LaurelFrame';

type PersonalizationData = {
  frames: Array<{ id: string; name: string; name_zh?: string; css_class: string; requirement_type: string; requirement_value: number; sort_order: number }>;
  wallpapers: Array<{ id: string; name: string; name_zh?: string; css_value: string; requirement_type: string; requirement_value: number; sort_order: number }>;
  currentFrame: string;
  currentWallpaper: string;
  tasks: Array<{ id: string; task_type: string; progress: number; target: number; completed: number }>;
  stats: { documents: number; posts: number; upvotes: number; loginDays: number };
};

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { locale } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Personalization state
  const [personal, setPersonal] = useState<PersonalizationData | null>(null);
  const [selectedFrame, setSelectedFrame] = useState('none');
  const [selectedWallpaper, setSelectedWallpaper] = useState('default');
  const [savingPersonal, setSavingPersonal] = useState(false);

  useEffect(() => {
    fetch('/api/auth').then((r) => r.json()).then((d) => {
      if (d.user) {
        setName(d.user.name || '');
        setBio(d.user.bio || '');
        setImageUrl(d.user.image || '');
      }
      setLoading(false);
    });

    // Load personalization data
    fetch('/api/user/personalization').then((r) => r.ok ? r.json() : null).then((d) => {
      if (d) {
        setPersonal(d);
        setSelectedFrame(d.currentFrame);
        setSelectedWallpaper(d.currentWallpaper);
      }
    }).catch(() => {});
  }, []);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload-image', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setImageUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/auth', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, bio, image: imageUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function savePersonalization() {
    setSavingPersonal(true);
    try {
      const res = await fetch('/api/user/personalization', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ avatar_frame: selectedFrame, wallpaper: selectedWallpaper }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Save failed');
      }
      // Reload page to show new frame/wallpaper
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSavingPersonal(false);
    }
  }

  function getRequirementLabel(type: string, value: number): string {
    const labels: Record<string, string> = {
      documents: `${value} ${locale === 'zh' ? '文档' : 'documents'}`,
      posts: `${value} ${locale === 'zh' ? '帖子' : 'posts'}`,
      upvotes: `${value} ${locale === 'zh' ? '点赞' : 'upvotes'}`,
      login_days: `${value} ${locale === 'zh' ? '登录天数' : 'login days'}`,
      none: '',
    };
    return labels[type] || '';
  }

  function isUnlocked(type: string, value: number): boolean {
    if (!personal || type === 'none') return true;
    const s = personal.stats;
    switch (type) {
      case 'documents': return s.documents >= value;
      case 'posts': return s.posts >= value;
      case 'upvotes': return s.upvotes >= value;
      case 'login_days': return s.loginDays >= value;
      default: return true;
    }
  }

  function getTaskLabel(type: string): string {
    const labels: Record<string, string> = {
      daily_login: t(locale, 'task.dailyLogin'),
      upload_document: t(locale, 'task.uploadDocument'),
      post_question: t(locale, 'task.postQuestion'),
      receive_upvote: t(locale, 'task.receiveUpvote'),
      answer_question: t(locale, 'task.answerQuestion'),
    };
    return labels[type] || type;
  }

  function getTaskIcon(type: string) {
    const icons: Record<string, React.ReactNode> = {
      daily_login: <LogIn className="w-4 h-4" />,
      upload_document: <FileText className="w-4 h-4" />,
      post_question: <MessageSquare className="w-4 h-4" />,
      receive_upvote: <ThumbsUp className="w-4 h-4" />,
      answer_question: <Star className="w-4 h-4" />,
    };
    return icons[type] || null;
  }

  if (loading) {
    return <div className="text-ink-400 dark:text-ink-500 text-sm">{t(locale, 'common.loading')}</div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Profile Info */}
      <div className="rounded-2xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-6">
        <h1 className="text-2xl font-semibold mb-1">{t(locale, 'profile.editProfile')}</h1>
        <p className="text-ink-600 dark:text-ink-400 text-sm mb-5">
          {locale === 'zh' ? '更新你的显示名称、个人简介和头像。' : 'Update your display name, bio, and avatar.'}
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t(locale, 'profile.displayName')}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={locale === 'zh' ? '你的名称' : 'Your name'}
              className="w-full border border-ink-200 dark:border-ink-600 rounded-md p-2 text-sm bg-white dark:bg-ink-900 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-accent-400"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">{t(locale, 'profile.bio')}</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={locale === 'zh' ? '介绍一下你自己...' : 'Tell us about yourself...'}
              className="w-full border border-ink-200 dark:border-ink-600 rounded-md p-2 text-sm min-h-[80px] bg-white dark:bg-ink-900 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-accent-400"
            />
          </div>

          {/* Avatar Upload */}
          <div>
            <label className="block text-sm font-medium mb-1">{t(locale, 'profile.avatar')}</label>
            <div className="flex items-center gap-4">
              <LaurelFrame frameId={selectedFrame} size={80}>
                {imageUrl ? (
                  <img src={imageUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-ink-100 dark:bg-ink-700 flex items-center justify-center text-ink-400 text-2xl font-bold">
                    {(name || '?').slice(0, 1).toUpperCase()}
                  </div>
                )}
              </LaurelFrame>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-4 py-2 rounded bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 disabled:opacity-50 flex items-center gap-2"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? (locale === 'zh' ? '上传中...' : 'Uploading...') : t(locale, 'profile.avatarUpload')}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <p className="text-xs text-ink-400 dark:text-ink-500">{t(locale, 'profile.avatarHint')}</p>
              </div>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400 mt-4">{error}</p>}
        {saved && <p className="text-sm text-green-600 dark:text-green-400 mt-4 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Profile updated.</p>}

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded bg-accent-500 text-white font-medium hover:bg-accent-600 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? (locale === 'zh' ? '保存中...' : 'Saving…') : t(locale, 'common.save')}
          </button>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 rounded text-ink-600 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-700"
          >
            {t(locale, 'common.cancel')}
          </button>
        </div>
      </div>

      {/* Personalization Section */}
      {personal && (
        <div className="rounded-2xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-6">
          <h2 className="text-xl font-semibold mb-1">{t(locale, 'personal.title')}</h2>
          <p className="text-ink-600 dark:text-ink-400 text-sm mb-5">
            {locale === 'zh' ? '自定义你的头像边框和个人主页背景。完成任务解锁更多选项！' : 'Customize your avatar frame and profile background. Complete tasks to unlock more options!'}
          </p>

          {/* Avatar Frames */}
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-3">{t(locale, 'personal.avatarFrame')}</h3>
            <div className="grid grid-cols-4 gap-3">
              {personal.frames.map((frame) => {
                const unlocked = isUnlocked(frame.requirement_type, frame.requirement_value);
                const selected = selectedFrame === frame.id;
                return (
                  <button
                    key={frame.id}
                    onClick={() => unlocked && setSelectedFrame(frame.id)}
                    disabled={!unlocked}
                    className={`relative p-3 rounded-xl border-2 text-center transition-all ${
                      selected
                        ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/20'
                        : unlocked
                        ? 'border-ink-200 dark:border-ink-600 hover:border-ink-300 dark:hover:border-ink-500 bg-white dark:bg-ink-700'
                        : 'border-ink-100 dark:border-ink-700 bg-ink-50 dark:bg-ink-800 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex justify-center mb-2">
                      <LaurelFramePreview frameId={frame.id} size={48} />
                    </div>
                    <div className="text-xs font-medium">
                      {locale === 'zh' && frame.name_zh ? frame.name_zh : frame.name}
                    </div>
                    {frame.requirement_type !== 'none' && (
                      <div className="text-[10px] text-ink-400 dark:text-ink-500 mt-0.5">
                        {unlocked ? (
                          <span className="text-green-500 flex items-center justify-center gap-0.5"><Check className="w-3 h-3" /> {t(locale, 'personal.unlocked')}</span>
                        ) : (
                          <span className="flex items-center justify-center gap-0.5"><Lock className="w-3 h-3" /> {getRequirementLabel(frame.requirement_type, frame.requirement_value)}</span>
                        )}
                      </div>
                    )}
                    {selected && <div className="absolute top-1 right-1"><CheckCircle2 className="w-4 h-4 text-accent-500" /></div>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Wallpapers */}
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-3">{t(locale, 'personal.wallpaper')}</h3>
            <div className="grid grid-cols-4 gap-3">
              {personal.wallpapers.map((wp) => {
                const unlocked = isUnlocked(wp.requirement_type, wp.requirement_value);
                const selected = selectedWallpaper === wp.id;
                return (
                  <button
                    key={wp.id}
                    onClick={() => unlocked && setSelectedWallpaper(wp.id)}
                    disabled={!unlocked}
                    className={`relative p-3 rounded-xl border-2 text-center transition-all ${
                      selected
                        ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/20'
                        : unlocked
                        ? 'border-ink-200 dark:border-ink-600 hover:border-ink-300 dark:hover:border-ink-500 bg-white dark:bg-ink-700'
                        : 'border-ink-100 dark:border-ink-700 bg-ink-50 dark:bg-ink-800 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div
                      className="w-full h-10 rounded-lg mb-2"
                      style={{ background: wp.css_value || '#e5e7eb' }}
                    />
                    <div className="text-xs font-medium">
                      {locale === 'zh' && wp.name_zh ? wp.name_zh : wp.name}
                    </div>
                    {wp.requirement_type !== 'none' && (
                      <div className="text-[10px] text-ink-400 dark:text-ink-500 mt-0.5">
                        {unlocked ? (
                          <span className="text-green-500 flex items-center justify-center gap-0.5"><Check className="w-3 h-3" /> {t(locale, 'personal.unlocked')}</span>
                        ) : (
                          <span className="flex items-center justify-center gap-0.5"><Lock className="w-3 h-3" /> {getRequirementLabel(wp.requirement_type, wp.requirement_value)}</span>
                        )}
                      </div>
                    )}
                    {selected && <div className="absolute top-1 right-1"><CheckCircle2 className="w-4 h-4 text-accent-500" /></div>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tasks */}
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-3">{t(locale, 'personal.tasks')}</h3>
            <div className="space-y-2">
              {['daily_login', 'upload_document', 'post_question', 'receive_upvote', 'answer_question'].map((taskType) => {
                const task = personal.tasks.find((t) => t.task_type === taskType);
                const progress = task?.progress || 0;
                const target = task?.target || 1;
                const completed = !!task?.completed;
                const pct = Math.min(Math.round((progress / target) * 100), 100);
                return (
                  <div key={taskType} className="flex items-center gap-3 p-3 rounded-lg bg-ink-50 dark:bg-ink-700/50">
                    <div className={`p-2 rounded-lg ${completed ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-ink-100 dark:bg-ink-600 text-ink-500 dark:text-ink-400'}`}>
                      {getTaskIcon(taskType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{getTaskLabel(taskType)}</div>
                      <div className="text-xs text-ink-400 dark:text-ink-500">
                        {progress}/{target}
                      </div>
                    </div>
                    <div className="w-24">
                      <div className="h-2 rounded-full bg-ink-200 dark:bg-ink-600 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${completed ? 'bg-green-500' : 'bg-accent-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    {completed && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stats summary */}
          {personal.stats && (
            <div className="grid grid-cols-4 gap-2 text-center text-xs text-ink-500 dark:text-ink-400 mb-4">
              <div><span className="text-lg font-bold text-ink-700 dark:text-ink-200">{personal.stats.documents}</span><br/>{t(locale, 'profile.documents')}</div>
              <div><span className="text-lg font-bold text-ink-700 dark:text-ink-200">{personal.stats.posts}</span><br/>{t(locale, 'profile.posts')}</div>
              <div><span className="text-lg font-bold text-ink-700 dark:text-ink-200">{personal.stats.upvotes}</span><br/>{locale === 'zh' ? '点赞' : 'upvotes'}</div>
              <div><span className="text-lg font-bold text-ink-700 dark:text-ink-200">{personal.stats.loginDays}</span><br/>{locale === 'zh' ? '登录天数' : 'login days'}</div>
            </div>
          )}

          <button
            onClick={savePersonalization}
            disabled={savingPersonal}
            className="px-4 py-2 rounded bg-accent-500 text-white font-medium hover:bg-accent-600 disabled:opacity-50 flex items-center gap-2"
          >
            {savingPersonal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {savingPersonal ? (locale === 'zh' ? '保存中...' : 'Saving…') : t(locale, 'common.save')}
          </button>
        </div>
      )}
    </div>
  );
}
