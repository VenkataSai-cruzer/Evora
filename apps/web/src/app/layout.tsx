import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { Providers } from '@/providers';
import { AppShell } from '@/components/layout/AppShell';
import { OfflineBanner } from '@/components/ui/OfflineBanner';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'Jamming — Where Music Happens',
    template: '%s — Jamming',
  },
  description: "Discover, book, and jam with Austin's best musicians.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className="min-h-screen bg-[var(--color-bg)] font-sans antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
          <OfflineBanner />
        </Providers>
      </body>
    </html>
  );
}
