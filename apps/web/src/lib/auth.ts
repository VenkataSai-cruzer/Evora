/**
 * Centralized server-side auth module.
 *
 * This is the ONLY way server components should check authentication.
 * Client components use useAuth() from auth-provider.tsx.
 *
 * Both call the same getSession() API — session is the single source of truth,
 * viewed from two contexts (server render + client hydration).
 *
 * Usage (server component):
 *   const user = await requireAuth();        // redirects to login if no session
 *   const admin = await requireRole('ADMIN'); // redirects to /dashboard if not admin
 */
import { redirect } from 'next/navigation';
import { getSession, type SessionUser } from './api-client';

export type { SessionUser };

/**
 * Require authentication. Redirects to login if no valid session exists.
 * Returns the session user on success.
 */
export async function requireAuth(callbackPath?: string): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    const callback = callbackPath ? `?callbackUrl=${encodeURIComponent(callbackPath)}` : '';
    redirect(`/auth/login${callback}`);
  }
  return session;
}

/**
 * Require a specific role. Redirects to login if unauthenticated,
 * or to /dashboard if the user doesn't have the required role.
 */
export async function requireRole(
  ...roles: string[]
): Promise<SessionUser> {
  const session = await requireAuth();
  if (!roles.includes(session.role)) {
    redirect('/');
  }
  return session;
}

/**
 * Get the current session without redirecting.
 * Same as getSession() from api-client, but provided here so all
 * server-side auth checks come from one module.
 */
export async function getServerSession(): Promise<SessionUser | null> {
  return getSession();
}
