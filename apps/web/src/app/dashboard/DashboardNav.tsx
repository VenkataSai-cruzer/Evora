'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface DashboardNavProps {
  role: string;
}

const ADMIN_NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', icon: '✦' },
  { href: '/dashboard/events', label: 'Events', icon: '✦' },
  { href: '/dashboard/payments', label: 'Payments', icon: '✦' },
  { href: '/dashboard/check-in', label: 'Check-in', icon: '✦' },
  { href: '/dashboard/contact-requests', label: 'Messages', icon: '✦' },
];

const USER_NAV_ITEMS = [
  { href: '/tickets', label: 'My Tickets', icon: '✦' },
  { href: '/profile', label: 'Profile', icon: '✦' },
];

export function DashboardNav({ role }: DashboardNavProps) {
  const pathname = usePathname();
  const isAdmin = role === 'ADMIN';
  const navItems = isAdmin ? ADMIN_NAV_ITEMS : USER_NAV_ITEMS;

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  return (
    <aside className="hidden w-64 flex-shrink-0 border-r border-[var(--color-border)] bg-surface lg:block">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b border-[var(--color-border)] p-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-white">
            ✦ 7 NOTES
          </Link>
          <p className="mt-1 text-xs text-text-muted capitalize">{role.toLowerCase()}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3" aria-label="Dashboard navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-white'
              }`}
            >
              <span className="text-xs">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Back to site */}
        <div className="border-t border-[var(--color-border)] p-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-text-muted transition-colors hover:text-white"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to site
          </Link>
        </div>
      </div>
    </aside>
  );
}
