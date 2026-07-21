'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-provider';
import { USER_NAV } from '@/lib/navigation';

export function UserNav() {
  const { user, signOut } = useAuth();

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/my-event" className="flex items-center gap-2 text-lg font-bold text-white">
          ✦ 7 NOTES
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="User">
          {USER_NAV.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm text-text-secondary hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-text-muted sm:inline">{user?.name}</span>
          <button
            onClick={() => signOut()}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-text-secondary hover:text-white"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
