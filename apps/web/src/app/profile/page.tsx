import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Profile',
  description: 'Manage your 7 NOTES account profile.',
};

export default async function ProfilePage() {
  const session = await requireAuth('/profile');

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
            <p className="text-sm text-white">{session.name}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Email</p>
            <p className="text-sm text-white">{session.email}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Role</p>
            <p className="text-sm text-white capitalize">{session.role.toLowerCase()}</p>
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
