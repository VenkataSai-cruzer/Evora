import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { Providers } from '@/providers';
import { StagingBanner } from '@/components/StagingBanner';
import { OfflineBanner } from '@/components/ui/OfflineBanner';

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
  description: 'Live music events by 7 NOTES. Book tickets, attend, and experience.',
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
          {children}
          <OfflineBanner />
        </Providers>
      </body>
    </html>
  );
}
