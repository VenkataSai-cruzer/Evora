'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-provider';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: string;
  fallback?: React.ReactNode;
}

/**
 * Client-side AuthGuard.
 *
 * Protects pages from guest access by redirecting to login if not authenticated.
 * Works reliably in Cloudflare Workers cross-domain cookie auth where server-side
 * redirect() is not supported.
 *
 * Usage in a server component page:
 *   export default function Page() {
 *     return (
 *       <AuthGuard requiredRole="ADMIN">
 *         <PageContent />
 *       </AuthGuard>
 *     );
 *   }
 */
export function AuthGuard({ children, requiredRole, fallback }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/auth/login?callbackUrl=${encodeURIComponent(pathname)}`);
    } else if (requiredRole && user.role !== requiredRole) {
      // Role mismatch — redirect non-admin users away from admin pages
      router.replace('/');
    }
  }, [user, loading, router, pathname, requiredRole]);

  // Show loading skeleton while checking auth
  if (loading) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="animate-pulse space-y-4 text-center">
          <div className="mx-auto h-8 w-48 rounded bg-surface-elevated" />
          <div className="mx-auto h-4 w-32 rounded bg-surface-elevated" />
        </div>
      </div>
    );
  }

  // Not authenticated — render nothing while redirect triggers
  if (!user) {
    return null;
  }

  // Role mismatch — render nothing while redirect triggers
  if (requiredRole && user.role !== requiredRole) {
    return null;
  }

  return <>{children}</>;
}
