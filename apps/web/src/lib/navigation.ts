/**
 * Centralized Navigation Configuration
 *
 * Single source of truth for all navigation links.
 * Used by: Navbar, DashboardNav, MobileMenu, breadcrumbs.
 *
 * Never define navigation arrays in individual components.
 * Always derive from this configuration.
 */

export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  /** Which user roles can see this link */
  roles?: ('GUEST' | 'ATTENDEE' | 'ADMIN')[];
  /** If true, only show when explicitly included (not in automatic lists) */
  adminOnly?: boolean;
}

/**
 * Public website navigation — shown to all users on public pages.
 * Guests see Login/Register in the action area, not in the nav links.
 */
export const PUBLIC_NAV: NavItem[] = [
  { label: 'Events', href: '/events' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'About', href: '/about' },
  { label: 'FAQs', href: '/faqs' },
  { label: 'Contact', href: '/contact' },
];

/**
 * Authenticated user navigation — shown in the compact user navbar.
 */
export const USER_NAV: NavItem[] = [
  { label: 'Events', href: '/events' },
  { label: 'My Tickets', href: '/tickets' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Profile', href: '/profile' },
];

/**
 * Admin navigation — shown in the admin sidebar.
 */
export const ADMIN_SIDEBAR: NavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: '✦' },
  { label: 'Events', href: '/dashboard/events', icon: '✦' },
  { label: 'Payments', href: '/dashboard/payments', icon: '✦' },
  { label: 'Check-in', href: '/dashboard/check-in', icon: '✦' },
  { label: 'Messages', href: '/dashboard/contact-requests', icon: '✦' },
];

/**
 * User sidebar navigation — shown in the user sidebar.
 */
export const USER_SIDEBAR: NavItem[] = [
  { label: 'My Tickets', href: '/tickets', icon: '✦' },
  { label: 'Profile', href: '/profile', icon: '✦' },
];

/**
 * Admin top-right action items (not sidebar, not nav links).
 */
export const ADMIN_ACTIONS: NavItem[] = [
  { label: 'Manage', href: '/dashboard/events' },
];

/**
 * User top-right action items.
 */
export const USER_ACTIONS: NavItem[] = [
  { label: 'My Tickets', href: '/tickets' },
];

/**
 * Footer navigation links.
 */
export const FOOTER_NAV: NavItem[] = [
  { label: 'Events', href: '/events' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'Legal', href: '/legal' },
];

/**
 * Check if a nav item is active for the current pathname.
 * Avoids false-positives for similarly-named paths.
 */
export function isNavActive(href: string, pathname: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(href + '/');
}
