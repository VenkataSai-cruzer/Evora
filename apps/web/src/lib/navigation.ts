export interface NavItem {
  label: string;
  href: string;
  icon?: string;
}

export const GUEST_NAV: NavItem[] = [
  { label: 'Events', href: '/events' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export const SCANNER_NAV: NavItem[] = [
  { label: 'Scanner', href: '/scanner' },
  { label: 'Profile', href: '/profile' },
];

export const USER_NAV: NavItem[] = [
  { label: 'My Event', href: '/my-event' },
  { label: 'My Ticket', href: '/my-ticket' },
  { label: 'Announcements', href: '/announcements' },
  { label: 'Profile', href: '/profile' },
];

export const ADMIN_NAV: NavItem[] = [
  { label: 'Overview', href: '/admin' },
  { label: 'Events', href: '/admin/events' },
  { label: 'Verifications', href: '/admin/verifications' },
  { label: 'Complimentary', href: '/admin/complimentary' },
  { label: 'Check-in', href: '/admin/check-in' },
  { label: 'Users', href: '/admin/users' },
  { label: 'Audit Logs', href: '/admin/audit-logs' },
  { label: 'Payments', href: '/admin/payments' },
  { label: 'Content', href: '/admin/content' },
  { label: 'Gallery', href: '/admin/gallery' },
  { label: 'Settings', href: '/admin/settings' },
];

export function isActive(href: string, pathname: string): boolean {
  if (href === '/admin') return pathname === '/admin';
  if (href === '/my-event') return pathname === '/my-event';
  return pathname === href || pathname.startsWith(href + '/');
}
