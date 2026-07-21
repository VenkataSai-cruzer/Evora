import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { Providers } from '@/providers';
import { AppShell } from '@/components/layout/AppShell';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { StagingBanner } from '@/components/StagingBanner';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: '7 NOTES — Official Event Platform',
    template: '%s — 7 NOTES',
  },
  description: 'Discover events, book tickets, and experience live music with 7 NOTES.',
  openGraph: {
    siteName: '7 NOTES',
    type: 'website',
  },
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
          <StagingBanner />
          <AppShell>{children}</AppShell>
          <OfflineBanner />
        </Providers>
      </body>
    </html>
  );
}
