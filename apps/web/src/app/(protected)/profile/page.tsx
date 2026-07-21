'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthGuard } from '@/components/AuthGuard';
import { getSession } from '@/lib/api-client';
import type { SessionUser } from '@/lib/api-client';

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}

function ProfileContent() {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const user = await getSession();
      setSession(user);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="page-container py-16">
        <div className="mx-auto max-w-2xl animate-pulse space-y-4">
          <div className="h-8 w-32 rounded bg-surface-elevated" />
          <div className="h-4 w-48 rounded bg-surface-elevated" />
          <div className="h-32 rounded-xl bg-surface-elevated" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container py-16">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-white">Profile</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Your account details.
        </p>

        <div className="mt-8 space-y-4 rounded-xl border border-[var(--color-border)] bg-surface p-6">
          <div>
            <p className="text-xs text-text-muted">Name</p>
            <p className="text-sm text-white">{session?.name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Email</p>
            <p className="text-sm text-white">{session?.email || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Role</p>
            <p className="text-sm text-white capitalize">{session?.role?.toLowerCase() || '—'}</p>
          </div>
        </div>

        <div className="mt-6">
          <Link
            href="/tickets"
            className="text-sm font-medium text-primary hover:text-primary-hover"
          >
            View my tickets →
          </Link>
        </div>
      </div>
    </div>
  );
}
