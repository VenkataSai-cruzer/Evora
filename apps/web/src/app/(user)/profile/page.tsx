'use client';

import { useAuth } from '@/lib/auth-provider';

export default function ProfilePage() {
  const { user, signOut } = useAuth();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Profile</h1>

      <div className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <span className="text-lg font-bold text-primary">
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
          <div>
            <p className="text-lg font-semibold text-white">{user?.name}</p>
            <p className="text-sm text-text-muted">{user?.email}</p>
            <span className="mt-1 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {user?.role}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
        <h3 className="text-sm font-semibold text-white">Account Settings</h3>
        <p className="mt-2 text-sm text-text-muted">
          Account settings and preferences will be available here.
        </p>
      </div>

      <button
        onClick={() => signOut()}
        className="w-full rounded-lg border border-[var(--color-border)] py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-white"
      >
        Sign out
      </button>
    </div>
  );
}
