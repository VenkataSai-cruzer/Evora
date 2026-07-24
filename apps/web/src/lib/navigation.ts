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
  { label: 'Orders', href: '/admin/orders' },
  { label: 'Tickets', href: '/admin/tickets' },
  { label: 'Complimentary', href: '/admin/complimentary' },
  { label: 'Check-in', href: '/admin/check-in' },
  { label: 'Users', href: '/admin/users' },
  { label: 'Audit Logs', href: '/admin/audit-logs' },
  { label: 'Payments', href: '/admin/payments' },
  { label: 'Content', href: '/admin/content' },
  { label: 'Gallery', href: '/admin/gallery' },
  { label: 'Settings', href: '/admin/settings' },
];

export const ORGANIZER_NAV: NavItem[] = [
  { label: 'Overview', href: '/organizer' },
  { label: 'My Events', href: '/organizer/events' },
  { label: 'Orders', href: '/organizer/orders' },
  { label: 'Attendees', href: '/organizer/attendees' },
  { label: 'Check-in', href: '/organizer/check-in' },
  { label: 'Exports', href: '/organizer/exports' },
  { label: 'Account', href: '/organizer/account' },
];

export function isActive(href: string, pathname: string): boolean {
  if (href === '/admin') return pathname === '/admin';
  if (href === '/admin/tickets') return pathname === '/admin/tickets' || pathname.startsWith('/admin/tickets/');
  if (href === '/my-bookings') return pathname === '/my-bookings' || pathname.startsWith('/my-bookings/');
  if (href === '/tickets') return pathname === '/tickets' || pathname.startsWith('/tickets/');
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(href + '/');
}
