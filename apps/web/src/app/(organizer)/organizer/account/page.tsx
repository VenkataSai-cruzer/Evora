'use client';

import { useAuth } from '@/lib/auth-provider';
import Link from 'next/link';

export default function OrganizerAccountPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Account</h1>
        <p className="mt-1 text-sm text-text-secondary">Your organizer profile</p>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-surface p-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="text-xs text-text-muted uppercase tracking-wider">Name</label>
            <p className="mt-1 font-medium text-white">{user?.name || '—'}</p>
          </div>
          <div>
            <label className="text-xs text-text-muted uppercase tracking-wider">Email</label>
            <p className="mt-1 font-medium text-white">{user?.email || '—'}</p>
          </div>
          <div>
            <label className="text-xs text-text-muted uppercase tracking-wider">Role</label>
            <p className="mt-1 font-medium text-white">{user?.role || '—'}</p>
          </div>
          <div>
            <label className="text-xs text-text-muted uppercase tracking-wider">Status</label>
            <p className="mt-1">
              <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">Active</span>
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-surface p-6">
        <h3 className="font-medium text-white">Quick Links</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/organizer/events" className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
            My Events
          </Link>
          <Link href="/profile" className="rounded-lg bg-surface-elevated px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-white transition-colors">
            Edit Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
