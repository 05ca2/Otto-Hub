'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, Compass, MessageSquare, Users, ShoppingBag, FileText, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useLanguage } from './LanguageProvider';
import { t } from '@/lib/translations';

export function Sidebar() {
  const pathname = usePathname();
  const { locale } = useLanguage();

  // Hide sidebar on login/register pages
  if (pathname === '/login' || pathname === '/register') return null;
  const [collapsed, setCollapsed] = useState(false);
  const [hovering, setHovering] = useState(false);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const links = [
    { href: '/dashboard', icon: <Calendar className="w-5 h-5 flex-shrink-0" />, label: t(locale, 'nav.dashboard') },
    { href: '/', icon: <FileText className="w-5 h-5 flex-shrink-0" />, label: t(locale, 'nav.documents') },
    { href: '/explore', icon: <Compass className="w-5 h-5 flex-shrink-0" />, label: t(locale, 'nav.explore') },
    { href: '/community', icon: <Users className="w-5 h-5 flex-shrink-0" />, label: t(locale, 'nav.community') },
    { href: '/shop', icon: <ShoppingBag className="w-5 h-5 flex-shrink-0" />, label: t(locale, 'nav.shop') },
    { href: '/feedback', icon: <MessageSquare className="w-5 h-5 flex-shrink-0" />, label: t(locale, 'nav.feedback') },
  ];

  const isExpanded = !collapsed || hovering;
  const sidebarWidth = isExpanded ? 'w-56' : 'w-16';

  function handleMouseEnter() {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setHovering(true);
  }

  function handleMouseLeave() {
    hoverTimeout.current = setTimeout(() => setHovering(false), 200);
  }

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    };
  }, []);

  return (
    <aside
      className={`${sidebarWidth} border-r border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 h-[calc(100vh-3.5rem)] sticky top-14 flex-shrink-0 overflow-hidden transition-all duration-200 ease-in-out`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <nav className="p-3 space-y-1">
        {/* Toggle button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-ink-500 dark:text-ink-400 hover:bg-ink-50 dark:hover:bg-ink-700/50 transition-colors"
          title={collapsed ? t(locale, 'sidebar.expand') : t(locale, 'sidebar.collapse')}
        >
          {collapsed && !hovering ? (
            <PanelLeftOpen className="w-5 h-5 flex-shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="w-5 h-5 flex-shrink-0" />
              <span className="whitespace-nowrap overflow-hidden">{t(locale, 'sidebar.collapse')}</span>
            </>
          )}
        </button>

        {/* Divider */}
        <div className="border-t border-ink-100 dark:border-ink-700 my-2" />

        {/* Nav links */}
        {links.map((link) => {
          const active = link.href === '/' ? pathname === '/' : pathname?.startsWith(link.href) ?? false;
          return (
            <Link
              key={link.href}
              href={link.href}
              title={link.label}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-accent-50 dark:bg-accent-900/20 text-accent-600 dark:text-accent-400'
                  : 'text-ink-600 dark:text-ink-400 hover:bg-ink-50 dark:hover:bg-ink-700/50 hover:text-ink-900 dark:hover:text-ink-200'
              }`}
            >
              {link.icon}
              <span className={`whitespace-nowrap overflow-hidden transition-all duration-200 ${collapsed && !hovering ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                {link.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
