'use client';

import { useEffect, useState } from 'react';
import { getSession } from '@/lib/api-client';
import type { SessionUser } from '@/lib/api-client';

export default function ProfilePage() {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSession().then(setSession).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-8 w-48 rounded bg-surface-elevated" /><div className="h-32 rounded-xl bg-surface-elevated" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Profile</h1>
      <div className="mt-6 space-y-4 rounded-xl border border-[var(--color-border)] bg-surface p-6">
        <div><p className="text-xs text-text-muted">Name</p><p className="text-sm text-white">{session?.name || '—'}</p></div>
        <div><p className="text-xs text-text-muted">Email</p><p className="text-sm text-white">{session?.email || '—'}</p></div>
        <div><p className="text-xs text-text-muted">Role</p><p className="text-sm text-white capitalize">{session?.role?.toLowerCase() || '—'}</p></div>
      </div>
    </div>
  );
}
