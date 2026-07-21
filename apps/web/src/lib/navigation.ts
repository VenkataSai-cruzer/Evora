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

export const USER_NAV: NavItem[] = [
  { label: 'My Event', href: '/my-event' },
  { label: 'My Ticket', href: '/my-ticket' },
  { label: 'Announcements', href: '/announcements' },
  { label: 'Profile', href: '/profile' },
];

export const ADMIN_NAV: NavItem[] = [
  { label: 'Overview', href: '/admin', icon: '✦' },
  { label: 'Events', href: '/admin/events', icon: '✦' },
  { label: 'Payments', href: '/admin/payments', icon: '✦' },
  { label: 'Verifications', href: '/admin/verifications', icon: '✦' },
  { label: 'Check-in', href: '/admin/check-in', icon: '✦' },
  { label: 'Users', href: '/admin/users', icon: '✦' },
  { label: 'Content', href: '/admin/content', icon: '✦' },
  { label: 'Gallery', href: '/admin/gallery', icon: '✦' },
  { label: 'Settings', href: '/admin/settings', icon: '✦' },
];

export const FOOTER_NAV: NavItem[] = [
  { label: 'Events', href: '/events' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'Privacy', href: '/legal/privacy' },
  { label: 'Terms', href: '/legal/terms' },
];

export function isActive(href: string, pathname: string): boolean {
  if (href === '/admin') return pathname === '/admin';
  if (href === '/my-event') return pathname === '/my-event';
  return pathname === href || pathname.startsWith(href + '/');
}
