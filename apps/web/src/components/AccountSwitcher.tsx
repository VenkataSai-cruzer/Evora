'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-provider';

export function AccountSwitcher() {
  const { user, accounts, switchAccount, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (!user) return null;

  const savedAccounts = accounts.filter(a => a.userId !== user.id);

  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div ref={ref} className="relative">
      {/* Avatar Button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
        title={`Signed in as ${user.email}`}
      >
        {initials}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-[var(--color-border)] bg-surface shadow-2xl shadow-black/50 overflow-hidden z-50 animate-slideDown">
          {/* Current Account */}
          <div className="border-b border-[var(--color-border)] px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                <p className="text-xs text-text-muted truncate">{user.email}</p>
              </div>
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-2xs font-medium text-primary">
                Active
              </span>
            </div>
          </div>

          {/* Other Saved Accounts */}
          {savedAccounts.length > 0 && (
            <div className="border-b border-[var(--color-border)] py-1">
              <p className="px-4 py-1.5 text-2xs text-text-muted uppercase tracking-wider font-medium">
                Switch account
              </p>
              {savedAccounts.map(account => {
                const accInitials = account.name
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <button
                    key={account.userId}
                    onClick={() => {
                      setOpen(false);
                      switchAccount(account.userId);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-elevated transition-colors"
                  >
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/5 text-xs font-bold text-text-secondary">
                      {accInitials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white truncate">{account.name}</p>
                      <p className="text-xs text-text-muted truncate">{account.email}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Actions */}
          <div className="p-1">
            <button
              onClick={() => {
                setOpen(false);
                router.push('/auth/login');
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-surface-elevated hover:text-white transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
              </svg>
              Add another account
            </button>
            <button
              onClick={async () => {
                setOpen(false);
                await signOut();
                router.replace('/');
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-surface-elevated hover:text-white transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
