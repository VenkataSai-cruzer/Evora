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
  { label: 'Overview', href: '/dashboard' },
  { label: 'Bookings', href: '/my-bookings' },
  { label: 'Tickets', href: '/tickets' },
  { label: 'Announcements', href: '/announcements' },
  { label: 'Account', href: '/profile' },
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
  if (href === '/my-bookings') return pathname === '/my-bookings' || pathname.startsWith('/my-bookings/');
  if (href === '/tickets') return pathname === '/tickets' || pathname.startsWith('/tickets/');
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(href + '/');
}
