/**
 * Centralized role-routing utility for Evora.
 *
 * Every role-based redirect in the application must use these functions.
 * Do not duplicate role-checking logic across pages or components.
 */

export type UserRole = 'ADMIN' | 'ORGANIZER' | 'SCANNER' | 'ATTENDEE';

/**
 * Allowed portal prefixes per role.
 * These are the URL prefixes each role is permitted to access.
 */
const ROLE_PORTALS: Record<UserRole, string[]> = {
  ADMIN: ['/admin', '/scanner', '/organizer', '/my-event', '/my-ticket', '/tickets', '/profile'],
  ORGANIZER: ['/organizer', '/my-event', '/my-ticket', '/profile'],
  SCANNER: ['/scanner', '/profile'],
  ATTENDEE: ['/dashboard', '/my-bookings', '/tickets', '/profile', '/announcements'],
};

/**
 * Get the default landing route for a given role after login.
 */
export function getDefaultRouteForRole(role: string): string {
  switch (role) {
    case 'ADMIN':
      return '/admin';
    case 'ORGANIZER':
      return '/organizer';
    case 'SCANNER':
      return '/scanner';
    case 'ATTENDEE':
      return '/dashboard';
    default:
      return '/';
  }
}

/**
 * Check whether a user with the given role is allowed to access a path.
 * Matches against the allowed portal prefixes.
 */
export function isRoleAllowedForPath(role: string, pathname: string): boolean {
  const portals = ROLE_PORTALS[role as UserRole];
  if (!portals) return false;

  // Exact match or prefix match
  return portals.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/'),
  );
}

/**
 * Sanitize a callback URL after login.
 *
 * Rules:
 * - If the callback URL is not allowed for the user's role, return their default route.
 * - If the callback URL is allowed, return it.
 * - Never blindly redirect to a URL that the role shouldn't access.
 */
export function sanitizeCallbackUrl(callbackUrl: string | null | undefined, role: string): string {
  if (!callbackUrl) return getDefaultRouteForRole(role);

  // Only allow relative URLs (same-origin)
  if (callbackUrl.startsWith('http://') || callbackUrl.startsWith('https://')) {
    return getDefaultRouteForRole(role);
  }

  // Prevent redirect to auth pages (would cause loop)
  if (callbackUrl.startsWith('/auth/')) {
    return getDefaultRouteForRole(role);
  }

  // Check if the role is allowed to access this path
  if (isRoleAllowedForPath(role, callbackUrl)) {
    return callbackUrl;
  }

  // Fallback to default route
  return getDefaultRouteForRole(role);
}
