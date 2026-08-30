import './globals.css';
import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import { ThemeProvider } from '@/components/ThemeProvider';
import { getSessionUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Otto-Hub',
  description: 'AI-powered study assistant — upload, study, ask, share.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const me = await getSessionUser();
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <Header
            initialMe={
              me ? { id: me.id, name: me.name || '', email: me.email || '', image: me.image, role: me.role } : null
            }
          />
          <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
