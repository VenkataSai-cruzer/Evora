'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-provider';
import { GUEST_NAV, isActive } from '@/lib/navigation';
import { getDefaultRouteForRole } from '@/lib/auth-routes';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      {/* ── Header ──────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-white">
            <span className="text-primary">✦</span> 7 NOTES
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {GUEST_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(item.href, pathname)
                    ? 'text-white'
                    : 'text-text-secondary hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {loading ? (
              <div className="h-8 w-20 animate-pulse rounded-lg bg-surface-elevated" />
            ) : user ? (
              <Link
                href={getDefaultRouteForRole(user.role)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
              >
                {user.role === 'ADMIN' ? 'Admin' : 'My Event'}
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/login"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-white"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/register"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Content ────────────────────────────── */}
      <main className="flex-1">{children}</main>

      {/* ── Footer ──────────────────────────────────── */}
      <footer className="border-t border-[var(--color-border)] bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <Link href="/" className="flex items-center gap-2 text-lg font-bold text-white">
                <span className="text-primary">✦</span> 7 NOTES
              </Link>
              <p className="mt-2 text-sm text-text-muted">
                Live music experiences. Book tickets, attend, and remember.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Navigate</h4>
              <ul className="mt-3 space-y-2">
                {GUEST_NAV.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-sm text-text-muted transition-colors hover:text-white">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Support</h4>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link href="/contact" className="text-sm text-text-muted transition-colors hover:text-white">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link href="/faqs" className="text-sm text-text-muted transition-colors hover:text-white">
                    FAQs
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-[var(--color-border)] pt-6 text-center text-xs text-text-muted">
            &copy; {new Date().getFullYear()} 7 NOTES. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
