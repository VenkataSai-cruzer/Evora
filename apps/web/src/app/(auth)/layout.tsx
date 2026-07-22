'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-provider';
import { getDefaultRouteForRole } from '@/lib/auth-routes';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace(getDefaultRouteForRole(user.role));
    }
  }, [user, loading, router]);

  // Don't show auth pages to logged-in users
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="mx-auto h-8 w-32 rounded bg-surface-elevated" />
        </div>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex items-center justify-center pt-8">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-white">
          <span className="text-primary">✦</span> 7 NOTES
        </Link>
      </div>
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        {children}
      </main>
    </div>
  );
}
