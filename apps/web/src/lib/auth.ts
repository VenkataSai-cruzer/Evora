/**
 * Server-side auth helpers.
 *
 * These functions fetch the session but do NOT redirect — server-side
 * redirect() from next/navigation doesn't work reliably in Cloudflare
 * Workers/OpenNext. Client-side auth redirect is handled by the AuthGuard
 * component (components/AuthGuard.tsx).
 *
 * Usage:
 *   const user = await requireAuth();    // returns SessionUser | null
 *   const admin = await requireRole('ADMIN'); // returns SessionUser | null (null if wrong role)
 */
import { getSession, type SessionUser } from './api-client';

export type { SessionUser };

/**
 * Get the current session. Returns null if not authenticated.
 * AuthGuard handles client-side redirect for unauthenticated users.
 */
export async function requireAuth(): Promise<SessionUser | null> {
  try {
    return await getSession();
  } catch {
    return null;
  }
}

/**
 * Get the current session and check role. Returns null if not authenticated
 * or if the user doesn't have the required role.
 * AuthGuard handles client-side redirect for unauthorized users.
 */
export async function requireRole(...roles: string[]): Promise<SessionUser | null> {
  try {
    const session = await getSession();
    if (!session) return null;
    if (!roles.includes(session.role)) return null;
    return session;
  } catch {
    return null;
  }
}
