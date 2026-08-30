'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Settings as SettingsIcon, BookOpen, Compass, MessageSquare, Users, LogOut, LogIn, UserPlus, Shield, User, Sun, Moon, Calendar } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { CreditsDisplay } from './CreditsDisplay';

type Me = { id: string; name: string; email: string; image: string | null; role: string | null } | null;

export function Header({ initialMe }: { initialMe: Me }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<Me>(initialMe);
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    // Refresh on focus so login state stays current.
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
    <header className="border-b border-ink-100 dark:border-ink-700 bg-white/80 dark:bg-ink-800/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <BookOpen className="w-5 h-5 text-accent-500" />
          <span>Otto-Hub</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <NavLink href="/dashboard" active={pathname === '/dashboard'}>
            <Calendar className="w-3.5 h-3.5 inline mr-1" />Dashboard
          </NavLink>
          <NavLink href="/" active={pathname === '/'}>Documents</NavLink>
          <NavLink href="/explore" active={pathname?.startsWith('/explore') ?? false}>
            <Compass className="w-3.5 h-3.5 inline mr-1" />Explore
          </NavLink>
          <NavLink href="/community" active={pathname?.startsWith('/community') ?? false}>
            <Users className="w-3.5 h-3.5 inline mr-1" />Community
          </NavLink>
          <NavLink href="/settings" active={pathname === '/settings'}>
            <SettingsIcon className="w-3.5 h-3.5 inline mr-1" />Settings
          </NavLink>
          
          {/* Credits display (hidden for admins) */}
          {me && me.role !== 'admin' && <CreditsDisplay />}
          
          {/* Dark mode toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded hover:bg-ink-100 dark:hover:bg-ink-700 text-ink-600 dark:text-ink-400"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          
          {me ? (
            <div className="relative ml-2">
              <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-2 px-2 py-1 rounded hover:bg-ink-100 dark:hover:bg-ink-700"
              >
                <Avatar name={me.name || me.email} image={me.image} />
                <span className="hidden sm:inline">{me.name}</span>
                {me.role === 'admin' && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-400 text-white rounded">ADMIN</span>
                )}
              </button>
              {open && (
                <div className="absolute right-0 mt-1 w-56 rounded-lg border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 shadow-lg py-1 z-50"
                  onMouseLeave={() => setOpen(false)}>
                  <Link href={`/u/${me.id}`} className="block px-3 py-2 text-sm hover:bg-ink-50 dark:hover:bg-ink-700 flex items-center gap-2">
                    <User className="w-3.5 h-3.5" />Profile
                  </Link>
                  <Link href="/settings/profile" className="block px-3 py-2 text-sm hover:bg-ink-50 dark:hover:bg-ink-700">Edit Profile</Link>
                  <Link href="/friends" className="block px-3 py-2 text-sm hover:bg-ink-50 dark:hover:bg-ink-700 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" />Friends
                  </Link>
                  <Link href="/settings" className="block px-3 py-2 text-sm hover:bg-ink-50 dark:hover:bg-ink-700">Settings</Link>
                  {me.role === 'admin' && (
                    <Link href="/admin" className="block px-3 py-2 text-sm hover:bg-ink-50 dark:hover:bg-ink-700 flex items-center gap-2 text-amber-600">
                      <Shield className="w-3.5 h-3.5" />Admin Panel
                    </Link>
                  )}
                  <button onClick={logout} className="w-full text-left px-3 py-2 text-sm hover:bg-ink-50 dark:hover:bg-ink-700 flex items-center gap-2 text-red-600">
                    <LogOut className="w-3.5 h-3.5" />Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="ml-2 px-3 py-1.5 rounded text-ink-600 dark:text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-700 flex items-center gap-1">
                <LogIn className="w-3.5 h-3.5" />Sign in
              </Link>
              <Link href="/register" className="px-3 py-1.5 rounded bg-accent-500 text-white hover:bg-accent-600 flex items-center gap-1">
                <UserPlus className="w-3.5 h-3.5" />Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={`px-3 py-1.5 rounded hover:bg-ink-100 dark:hover:bg-ink-700 ${active ? 'bg-ink-100 dark:bg-ink-700 font-medium' : ''}`}>
      {children}
    </Link>
  );
}

function Avatar({ name, image }: { name: string; image: string | null }) {
  if (image) return <img src={image} alt="" className="w-6 h-6 rounded-full" />;
  const initial = (name || '?').slice(0, 1).toUpperCase();
  return <span className="w-6 h-6 rounded-full bg-accent-500 text-white text-xs font-medium flex items-center justify-center">{initial}</span>;
}
