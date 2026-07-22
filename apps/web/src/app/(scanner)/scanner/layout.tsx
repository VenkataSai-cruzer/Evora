'use client';

import { AuthGuard } from '@/components/AuthGuard';

export default function ScannerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requiredRole={['SCANNER', 'ADMIN']}>
      <div className="min-h-screen bg-background">
        {children}
      </div>
    </AuthGuard>
  );
}
