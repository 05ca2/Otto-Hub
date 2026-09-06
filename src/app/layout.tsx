import './globals.css';
import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { ThemeProvider } from '@/components/ThemeProvider';
import { LanguageProvider } from '@/components/LanguageProvider';
import { getSessionUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: {
    default: 'Otto-Hub — AI Study Assistant',
    template: '%s | Otto-Hub',
  },
  description: 'Upload your study materials, get AI-generated cheatsheets, practice questions, and explore shared summaries from the community. Your personal AI-powered learning hub.',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  openGraph: {
    title: 'Otto-Hub — AI Study Assistant',
    description: 'Upload your study materials, get AI-generated cheatsheets, practice questions, and explore shared summaries from the community.',
    url: 'https://otto-hub.com',
    siteName: 'Otto-Hub',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Otto-Hub — AI Study Assistant',
    description: 'Upload your study materials, get AI-generated cheatsheets, practice questions, and explore shared summaries from the community.',
  },
  metadataBase: new URL('https://otto-hub.com'),
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const me = await getSessionUser();
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <LanguageProvider>
            <Header
              initialMe={
                me ? { id: me.id, name: me.name || '', email: me.email || '', image: me.image, role: me.role, avatar_frame: me.avatar_frame } : null
              }
            />
            <div className="flex">
              <Sidebar />
              <main className="flex-1 min-w-0 px-6 py-6">{children}</main>
            </div>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
