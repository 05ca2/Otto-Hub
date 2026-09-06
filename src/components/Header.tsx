'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Settings as SettingsIcon, LogOut, LogIn, UserPlus, Shield, User, Sun, Moon, Globe, Users } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { useLanguage } from './LanguageProvider';
import { t } from '@/lib/translations';
import { CreditsDisplay } from './CreditsDisplay';
import { LaurelFrame } from './LaurelFrame';

type Me = { id: string; name: string; email: string; image: string | null; role: string | null; avatar_frame?: string | null } | null;

export function Header({ initialMe }: { initialMe: Me }) {
  const router = useRouter();
  const [me, setMe] = useState<Me>(initialMe);
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale } = useLanguage();

  useEffect(() => {
    const refresh = () => {
      fetch('/api/auth').then((r) => r.json()).then((d) => setMe(d.user || null)).catch(() => {});
    };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  async function logout() {
    await fetch('/api/auth', { method: 'DELETE' });
    setMe(null);
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="border-b border-ink-100 dark:border-ink-700 bg-white/80 dark:bg-ink-800/80 backdrop-blur sticky top-0 z-30 h-14">
      <div className="max-w-full mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <img src="/icon.png" alt="Otto-Hub" className="w-8 h-8 rounded" />
          <span>Otto-Hub</span>
        </Link>

        <div className="flex items-center gap-1 text-sm">
          {/* Credits display */}
          {me && me.role !== 'admin' && me.email !== 'freshpinapple20120518@outlook.com' && <CreditsDisplay />}

          {/* Settings link */}
          <Link
            href="/settings"
            className="p-2 rounded hover:bg-ink-100 dark:hover:bg-ink-700 text-ink-600 dark:text-ink-400"
            title={t(locale, 'nav.settings')}
          >
            <SettingsIcon className="w-4 h-4" />
          </Link>

          {/* Dark mode toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded hover:bg-ink-100 dark:hover:bg-ink-700 text-ink-600 dark:text-ink-400"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Language toggle */}
          <button
            onClick={() => setLocale(locale === 'en' ? 'zh' : 'en')}
            className="p-2 rounded hover:bg-ink-100 dark:hover:bg-ink-700 text-ink-600 dark:text-ink-400"
            title={locale === 'en' ? 'Switch to Chinese' : 'Switch to English'}
          >
            <Globe className="w-4 h-4" />
          </button>

          {me ? (
            <div className="relative ml-2">
              <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-2 px-2 py-1 rounded hover:bg-ink-100 dark:hover:bg-ink-700"
              >
                <Avatar name={me.name || me.email} image={me.image} frame={me.avatar_frame} />
                <span className="hidden sm:inline text-sm">{me.name}</span>
                {(me.role === 'super_admin' || me.email === 'freshpinapple20120518@outlook.com') && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-purple-500 text-white rounded">SUPER ADMIN</span>
                )}
                {me.role === 'admin' && me.email !== 'freshpinapple20120518@outlook.com' && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-400 text-white rounded">ADMIN</span>
                )}
              </button>
              {open && (
                <div className="absolute right-0 mt-1 w-56 rounded-lg border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 shadow-lg py-1 z-50"
                  onMouseLeave={() => setOpen(false)}>
                  <Link href={`/u/${me.id}`} className="block px-3 py-2 text-sm hover:bg-ink-50 dark:hover:bg-ink-700 flex items-center gap-2">
                    <User className="w-3.5 h-3.5" />{t(locale, 'nav.profile')}
                  </Link>
                  <Link href="/settings/profile" className="block px-3 py-2 text-sm hover:bg-ink-50 dark:hover:bg-ink-700">{t(locale, 'nav.editProfile')}</Link>
                  <Link href="/friends" className="block px-3 py-2 text-sm hover:bg-ink-50 dark:hover:bg-ink-700 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" />{t(locale, 'nav.friends')}
                  </Link>
                  <Link href="/settings" className="block px-3 py-2 text-sm hover:bg-ink-50 dark:hover:bg-ink-700">{t(locale, 'nav.settings')}</Link>
                  {(me.role === 'admin' || me.role === 'super_admin' || me.email === 'freshpinapple20120518@outlook.com') && (
                    <Link href="/admin" className="block px-3 py-2 text-sm hover:bg-ink-50 dark:hover:bg-ink-700 flex items-center gap-2 text-amber-600">
                      <Shield className="w-3.5 h-3.5" />{t(locale, 'nav.admin')}
                    </Link>
                  )}
                  <button onClick={logout} className="w-full text-left px-3 py-2 text-sm hover:bg-ink-50 dark:hover:bg-ink-700 flex items-center gap-2 text-red-600">
                    <LogOut className="w-3.5 h-3.5" />{t(locale, 'nav.signOut')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="ml-2 px-3 py-1.5 rounded text-ink-600 dark:text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-700 flex items-center gap-1">
                <LogIn className="w-3.5 h-3.5" />{t(locale, 'nav.signIn')}
              </Link>
              <Link href="/register" className="px-3 py-1.5 rounded bg-accent-500 text-white hover:bg-accent-600 flex items-center gap-1">
                <UserPlus className="w-3.5 h-3.5" />{t(locale, 'nav.signUp')}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Avatar({ name, image, frame }: { name: string; image: string | null; frame?: string | null }) {
  const frameId = frame || 'none';
  const inner = image ? (
    <img src={image} alt="" className="w-6 h-6 rounded-full object-cover" />
  ) : (
    <span className="w-6 h-6 rounded-full bg-accent-500 text-white text-xs font-medium flex items-center justify-center">{(name || '?').slice(0, 1).toUpperCase()}</span>
  );
  if (frameId === 'none') return inner;
  return <LaurelFrame frameId={frameId} size={32}>{inner}</LaurelFrame>;
}
