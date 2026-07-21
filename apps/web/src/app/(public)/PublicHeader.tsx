'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-provider';
import { GUEST_NAV, USER_NAV } from '@/lib/navigation';

export function PublicHeader() {
  const { user, loading, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const isLoggedIn = !!user;
  const navLinks = isLoggedIn ? USER_NAV : GUEST_NAV;

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-white">
          ✦ 7 NOTES
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="hidden items-center gap-3 md:flex">
          {loading ? (
            <div className="h-8 w-20 animate-pulse rounded-lg bg-surface-elevated" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <Link
                href={user.role === 'ADMIN' ? '/admin' : '/my-event'}
                className="text-sm font-medium text-text-secondary hover:text-white"
              >
                {user.role === 'ADMIN' ? 'Admin' : 'My Event'}
              </Link>
              <button
                onClick={() => signOut()}
                className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-text-secondary hover:text-white"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/auth/login"
                className="rounded-lg px-3 py-1.5 text-sm text-text-secondary hover:text-white"
              >
                Sign in
              </Link>
              <Link
                href="/auth/register"
                className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-hover"
              >
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="rounded-lg p-2 text-text-secondary md:hidden"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-[var(--color-border)] p-4 md:hidden">
          <div className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-text-secondary hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            <hr className="border-[var(--color-border)]" />
            {user ? (
              <>
                <button
                  onClick={() => { signOut(); setMenuOpen(false); }}
                  className="rounded-lg px-3 py-2 text-left text-sm text-text-secondary hover:text-white"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm text-text-secondary hover:text-white">Sign in</Link>
                <Link href="/auth/register" onClick={() => setMenuOpen(false)} className="rounded-lg bg-primary px-3 py-2 text-center text-sm text-white">Register</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
