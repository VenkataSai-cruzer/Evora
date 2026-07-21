'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-provider';
import { ADMIN_SIDEBAR, USER_SIDEBAR, isNavActive } from '@/lib/navigation';

interface ProtectedSidebarProps {
  role: string;
}

export function ProtectedSidebar({ role }: ProtectedSidebarProps) {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const isAdmin = role === 'ADMIN';
  const navItems = isAdmin ? ADMIN_SIDEBAR : USER_SIDEBAR;

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-1 flex-col border-r border-[var(--color-border)] bg-surface">
          {/* Header */}
          <div className="border-b border-[var(--color-border)] p-4">
            <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-white">
              ✦ 7 NOTES
            </Link>
            <p className="mt-1 text-xs text-text-muted capitalize">{role.toLowerCase()}</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-3" aria-label="Sidebar navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isNavActive(item.href, pathname)
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-secondary hover:bg-surface-hover hover:text-white'
                }`}
              >
                {item.icon && <span className="text-xs">{item.icon}</span>}
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Logout */}
          <div className="border-t border-[var(--color-border)] p-3">
            <button
              onClick={() => signOut()}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-text-muted transition-colors hover:bg-surface-hover hover:text-white"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
              Sign out
            </button>
            <Link
              href="/"
              className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-text-muted transition-colors hover:text-white"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Back to site
            </Link>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-surface lg:hidden">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.slice(0, 4).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                isNavActive(item.href, pathname)
                  ? 'text-primary'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {item.icon && <span>{item.icon}</span>}
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
