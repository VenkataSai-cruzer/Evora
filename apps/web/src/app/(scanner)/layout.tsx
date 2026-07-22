'use client';

import { AuthGuard } from '@/components/AuthGuard';

/**
 * Scanner layout — used by ADMIN, SCANNER, and ORGANIZER roles.
 * Minimalist design: no sidebar, just a header bar and full-width content.
 * Optimized for mobile-first PWA usage at the venue.
 */
export default function ScannerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requiredRole={['ADMIN', 'SCANNER', 'ORGANIZER']}>
      <div className="min-h-screen bg-black">
        {children}
      </div>
    </AuthGuard>
  );
}
