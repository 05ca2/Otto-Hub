'use client';

import { useEffect, useState } from 'react';
import { ShoppingBag, Lock, Check, Star, FileText, MessageSquare, ThumbsUp, LogIn, Loader2, CheckCircle2, Coins } from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';
import { t } from '@/lib/translations';
import { LaurelFramePreview } from '@/components/LaurelFrame';

type PersonalizationData = {
  frames: Array<{ id: string; name: string; name_zh?: string; css_class: string; requirement_type: string; requirement_value: number; sort_order: number; price_ohbit?: number }>;
  wallpapers: Array<{ id: string; name: string; name_zh?: string; css_value: string; requirement_type: string; requirement_value: number; sort_order: number; price_ohbit?: number }>;
  currentFrame: string;
  currentWallpaper: string;
  tasks: Array<{ id: string; task_type: string; progress: number; target: number; completed: number }>;
  stats: { documents: number; posts: number; upvotes: number; loginDays: number };
  ohbitBalance: number;
  purchased: Array<{ item_type: string; item_id: string }>;
};

export default function ShopPage() {
  const { locale } = useLanguage();
  const [data, setData] = useState<PersonalizationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [equipping, setEquipping] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'frames' | 'wallpapers' | 'tasks'>('frames');

  useEffect(() => {
    fetch('/api/user/personalization')
      .then((r) => {
        if (!r.ok) throw new Error('Not logged in');
        return r.json();
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, []);

  async function equip(type: 'frame' | 'wallpaper', id: string) {
    setEquipping(id);
    try {
      const body = type === 'frame' ? { avatar_frame: id } : { wallpaper: id };
      const res = await fetch('/api/user/personalization', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }
      if (data) {
        if (type === 'frame') setData({ ...data, currentFrame: id });
        else setData({ ...data, currentWallpaper: id });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setEquipping(null);
    }
  }

  async function purchase(type: 'frame' | 'wallpaper', id: string, price: number) {
    if (!data || data.ohbitBalance < price) return;
    setEquipping(id);
    try {
      const res = await fetch('/api/user/personalization', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'purchase', item_type: type, item_id: id }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Purchase failed');
      setData({
        ...data,
        ohbitBalance: result.remaining,
        purchased: [...data.purchased, { item_type: type, item_id: id }],
      });
    } catch (err) {
      console.error(err);
    } finally {
      setEquipping(null);
    }
  }

  function isUnlocked(type: string, value: number): boolean {
    if (!data || type === 'none') return true;
    const s = data.stats;
    switch (type) {
      case 'documents': return s.documents >= value;
      case 'posts': return s.posts >= value;
      case 'upvotes': return s.upvotes >= value;
      case 'login_days': return s.loginDays >= value;
      default: return true;
    }
  }

  function getProgress(type: string, value: number): number {
    if (!data || type === 'none') return 100;
    const s = data.stats;
    let current = 0;
    switch (type) {
      case 'documents': current = s.documents; break;
      case 'posts': current = s.posts; break;
      case 'upvotes': current = s.upvotes; break;
      case 'login_days': current = s.loginDays; break;
      default: return 100;
    }
    return Math.min(Math.round((current / value) * 100), 100);
  }

  function isPurchased(type: string, id: string): boolean {
    return !!data?.purchased.some(p => p.item_type === type && p.item_id === id);
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

  function getTaskReward(type: string): number {
    const rewards: Record<string, number> = {
      daily_login: 10, upload_document: 15, post_question: 20,
      receive_upvote: 5, answer_question: 15,
    };
    return rewards[type] || 5;
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

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <ShoppingBag className="w-16 h-16 mx-auto text-ink-300 dark:text-ink-600 mb-4" />
        <h1 className="text-2xl font-bold mb-2">{t(locale, 'shop.title')}</h1>
        <p className="text-ink-500 dark:text-ink-400 mb-6">
          {locale === 'zh' ? '请先登录以访问商店' : 'Please sign in to access the shop'}
        </p>
        <a href="/login" className="px-6 py-2 rounded-lg bg-accent-500 text-white font-medium hover:bg-accent-600">
          {t(locale, 'nav.signIn')}
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-6">
        <div className="flex items-center gap-3 mb-2">
          <ShoppingBag className="w-8 h-8 text-accent-500" />
          <div>
            <h1 className="text-2xl font-bold">{t(locale, 'shop.title')}</h1>
            <p className="text-ink-500 dark:text-ink-400 text-sm">{t(locale, 'shop.subtitle')}</p>
          </div>
        </div>

        {/* Stats + Ohbit Balance */}
        <div className="grid grid-cols-5 gap-4 mt-4 p-4 rounded-xl bg-ink-50 dark:bg-ink-700/50">
          <div className="text-center">
            <div className="text-2xl font-bold text-accent-500">{data.stats.documents}</div>
            <div className="text-xs text-ink-500">{t(locale, 'profile.documents')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent-500">{data.stats.posts}</div>
            <div className="text-xs text-ink-500">{t(locale, 'profile.posts')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent-500">{data.stats.upvotes}</div>
            <div className="text-xs text-ink-500">{locale === 'zh' ? '点赞' : 'Upvotes'}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent-500">{data.stats.loginDays}</div>
            <div className="text-xs text-ink-500">{locale === 'zh' ? '登录天数' : 'Login Days'}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-500 flex items-center justify-center gap-1">
              <Coins className="w-5 h-5" /> {data.ohbitBalance}
            </div>
            <div className="text-xs text-ink-500">Ohbit</div>
          </div>
        </div>
      </div>

      {/* Tab buttons */}
      <div className="flex gap-2">
        {(['frames', 'wallpapers', 'tasks'] as const).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setActiveTab(tabKey)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeTab === tabKey
                ? 'bg-accent-500 text-white'
                : 'bg-ink-100 dark:bg-ink-700 text-ink-600 dark:text-ink-300 hover:bg-ink-200 dark:hover:bg-ink-600'
            }`}
          >
            {tabKey === 'frames' ? t(locale, 'shop.frames') : tabKey === 'wallpapers' ? t(locale, 'shop.wallpapers') : t(locale, 'personal.tasks')}
          </button>
        ))}
      </div>

      {/* Frames Grid */}
      {activeTab === 'frames' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data.frames.map((frame) => {
            const equipped = data.currentFrame === frame.id;
            const hasPrice = frame.price_ohbit && frame.price_ohbit > 0;
            const purchased = isPurchased('frame', frame.id);
            const taskUnlocked = !hasPrice && isUnlocked(frame.requirement_type, frame.requirement_value);
            const canEquip = equipped || purchased || taskUnlocked || (!hasPrice && frame.requirement_type === 'none');
            const progress = getProgress(frame.requirement_type, frame.requirement_value);
            return (
              <div
                key={frame.id}
                className={`rounded-2xl border-2 p-4 text-center transition-all ${
                  equipped
                    ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/20'
                    : canEquip
                    ? 'border-ink-200 dark:border-ink-600 bg-white dark:bg-ink-800 hover:border-accent-300'
                    : 'border-ink-100 dark:border-ink-700 bg-ink-50 dark:bg-ink-800/50'
                }`}
              >
                <div className="flex justify-center mb-3">
                  <LaurelFramePreview frameId={frame.id} size={64} />
                </div>
                <div className="font-medium text-sm mb-1">
                  {locale === 'zh' && frame.name_zh ? frame.name_zh : frame.name}
                </div>

                {hasPrice && !purchased ? (
                  <div className="mt-2">
                    <div className="flex items-center justify-center gap-1 text-xs text-yellow-600 dark:text-yellow-400 mb-1">
                      <Coins className="w-3 h-3" /> {frame.price_ohbit} Ohbit
                    </div>
                    <button
                      onClick={() => purchase('frame', frame.id, frame.price_ohbit!)}
                      disabled={equipping === frame.id || data.ohbitBalance < frame.price_ohbit!}
                      className="w-full py-1.5 rounded-lg text-xs font-medium bg-yellow-500 text-white hover:bg-yellow-600 disabled:opacity-50"
                    >
                      {equipping === frame.id ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : t(locale, 'personal.buy')}
                    </button>
                  </div>
                ) : frame.requirement_type !== 'none' && !hasPrice ? (
                  <div className="mt-2">
                    {taskUnlocked ? (
                      <div className="flex items-center justify-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <Check className="w-3 h-3" /> {t(locale, 'personal.unlocked')}
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-center gap-1 text-xs text-ink-400 mb-1">
                          <Lock className="w-3 h-3" /> {frame.requirement_type === 'documents' ? `${frame.requirement_value} ${locale === 'zh' ? '文档' : 'docs'}` : frame.requirement_type === 'posts' ? `${frame.requirement_value} ${locale === 'zh' ? '帖子' : 'posts'}` : frame.requirement_type === 'upvotes' ? `${frame.requirement_value} ${locale === 'zh' ? '点赞' : 'upvotes'}` : `${frame.requirement_value} ${locale === 'zh' ? '天' : 'days'}`}
                        </div>
                        <div className="h-1.5 rounded-full bg-ink-200 dark:bg-ink-600 overflow-hidden">
                          <div className="h-full rounded-full bg-accent-500 transition-all" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="text-[10px] text-ink-400 mt-1">{progress}%</div>
                      </>
                    )}
                  </div>
                ) : null}

                {canEquip && (
                  <button
                    onClick={() => equip('frame', frame.id)}
                    disabled={equipping === frame.id || equipped}
                    className={`mt-3 w-full py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      equipped
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                        : 'bg-accent-500 text-white hover:bg-accent-600'
                    }`}
                  >
                    {equipping === frame.id ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : equipped ? t(locale, 'shop.equipped') : t(locale, 'shop.equip')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Wallpapers Grid */}
      {activeTab === 'wallpapers' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data.wallpapers.map((wp) => {
            const equipped = data.currentWallpaper === wp.id;
            const hasPrice = wp.price_ohbit && wp.price_ohbit > 0;
            const purchased = isPurchased('wallpaper', wp.id);
            const taskUnlocked = !hasPrice && isUnlocked(wp.requirement_type, wp.requirement_value);
            const canEquip = equipped || purchased || taskUnlocked || (!hasPrice && wp.requirement_type === 'none');
            const progress = getProgress(wp.requirement_type, wp.requirement_value);
            return (
              <div
                key={wp.id}
                className={`rounded-2xl border-2 p-4 text-center transition-all ${
                  equipped
                    ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/20'
                    : canEquip
                    ? 'border-ink-200 dark:border-ink-600 bg-white dark:bg-ink-800 hover:border-accent-300'
                    : 'border-ink-100 dark:border-ink-700 bg-ink-50 dark:bg-ink-800/50'
                }`}
              >
                <div className="w-full h-16 rounded-xl mb-3" style={{ background: wp.css_value || '#e5e7eb' }} />
                <div className="font-medium text-sm mb-1">
                  {locale === 'zh' && wp.name_zh ? wp.name_zh : wp.name}
                </div>

                {hasPrice && !purchased ? (
                  <div className="mt-2">
                    <div className="flex items-center justify-center gap-1 text-xs text-yellow-600 dark:text-yellow-400 mb-1">
                      <Coins className="w-3 h-3" /> {wp.price_ohbit} Ohbit
                    </div>
                    <button
                      onClick={() => purchase('wallpaper', wp.id, wp.price_ohbit!)}
                      disabled={equipping === wp.id || data.ohbitBalance < wp.price_ohbit!}
                      className="w-full py-1.5 rounded-lg text-xs font-medium bg-yellow-500 text-white hover:bg-yellow-600 disabled:opacity-50"
                    >
                      {equipping === wp.id ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : t(locale, 'personal.buy')}
                    </button>
                  </div>
                ) : wp.requirement_type !== 'none' && !hasPrice ? (
                  <div className="mt-2">
                    {taskUnlocked ? (
                      <div className="flex items-center justify-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <Check className="w-3 h-3" /> {t(locale, 'personal.unlocked')}
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-center gap-1 text-xs text-ink-400 mb-1">
                          <Lock className="w-3 h-3" /> {wp.requirement_type === 'documents' ? `${wp.requirement_value} ${locale === 'zh' ? '文档' : 'docs'}` : wp.requirement_type === 'posts' ? `${wp.requirement_value} ${locale === 'zh' ? '帖子' : 'posts'}` : wp.requirement_type === 'upvotes' ? `${wp.requirement_value} ${locale === 'zh' ? '点赞' : 'upvotes'}` : `${wp.requirement_value} ${locale === 'zh' ? '天' : 'days'}`}
                        </div>
                        <div className="h-1.5 rounded-full bg-ink-200 dark:bg-ink-600 overflow-hidden">
                          <div className="h-full rounded-full bg-accent-500 transition-all" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="text-[10px] text-ink-400 mt-1">{progress}%</div>
                      </>
                    )}
                  </div>
                ) : null}

                {canEquip && (
                  <button
                    onClick={() => equip('wallpaper', wp.id)}
                    disabled={equipping === wp.id || equipped}
                    className={`mt-3 w-full py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      equipped
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                        : 'bg-accent-500 text-white hover:bg-accent-600'
                    }`}
                  >
                    {equipping === wp.id ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : equipped ? t(locale, 'shop.equipped') : t(locale, 'shop.equip')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div className="rounded-2xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-6">
          <h2 className="text-lg font-semibold mb-4">{t(locale, 'personal.tasks')}</h2>
          <div className="space-y-3">
            {['daily_login', 'upload_document', 'post_question', 'receive_upvote', 'answer_question'].map((taskType) => {
              const task = data.tasks.find((t) => t.task_type === taskType);
              const progress = task?.progress || 0;
              const target = task?.target || 1;
              const completed = !!task?.completed;
              const pct = Math.min(Math.round((progress / target) * 100), 100);
              const reward = getTaskReward(taskType);
              return (
                <div key={taskType} className="flex items-center gap-4 p-3 rounded-xl bg-ink-50 dark:bg-ink-700/50">
                  <div className={`p-2.5 rounded-xl ${completed ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-ink-100 dark:bg-ink-600 text-ink-500 dark:text-ink-400'}`}>
                    {getTaskIcon(taskType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{getTaskLabel(taskType)}</div>
                    <div className="text-xs text-ink-400 dark:text-ink-500">
                      {progress}/{target}
                    </div>
                  </div>
                  <div className="w-32">
                    <div className="h-2 rounded-full bg-ink-200 dark:bg-ink-600 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${completed ? 'bg-green-500' : 'bg-accent-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                    <Coins className="w-3 h-3" /> +{reward}
                  </div>
                  {completed && <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
