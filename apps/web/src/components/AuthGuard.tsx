'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-provider';
import { getDefaultRouteForRole } from '@/lib/auth-routes';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  fallback?: React.ReactNode;
}

/**
 * Client-side AuthGuard.
 *
 * Protects pages from unauthorized access by checking:
 * 1. Is the user authenticated? If not → redirect to login.
 * 2. Does the user have the required role? If not → redirect to /unauthorized.
 *
 * Works reliably in Cloudflare Workers cross-domain cookie auth where server-side
 * redirect() is not supported.
 *
 * Usage:
 *   <AuthGuard requiredRole="ADMIN">
 *     <AdminPage />
 *   </AuthGuard>
 *   <AuthGuard requiredRole={['ADMIN', 'ORGANIZER']}>
 *     <SharedPage />
 *   </AuthGuard>
 */
export function AuthGuard({ children, requiredRole, fallback }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace(`/auth/login?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }

    if (requiredRole) {
      const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (!allowed.includes(user.role)) {
        // Role mismatch — redirect to /unauthorized with the user's default route
        const defaultRoute = getDefaultRouteForRole(user.role);
        router.replace(`/unauthorized?redirect=${encodeURIComponent(defaultRoute)}`);
      }
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
  if (requiredRole) {
    const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!allowed.includes(user.role)) return null;
  }

  return <>{children}</>;
}
