'use client';

import Link from 'next/link';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/lib/auth-provider';

function OrganizerSidebar({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <>
      <nav className="w-56 flex-shrink-0 border-r border-[var(--color-border)] bg-surface p-4">
        <div className="mb-6">
          <p className="text-xs text-text-muted uppercase tracking-wider">Organizer</p>
          <p className="mt-1 text-sm font-semibold text-white">{user?.name || 'Organizer'}</p>
        </div>
        <ul className="space-y-1">
          {[
            { href: '/organizer', label: 'My Events' },
          ].map(({ href, label }) => (
            <li key={href}>
              <Link href={href} className="block rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-surface-elevated hover:text-white transition-colors">{label}</Link>
            </li>
          ))}
        </ul>
      </nav>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </>
  );
}

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requiredRole={['ORGANIZER', 'ADMIN']}>
      <div className="flex min-h-screen bg-background">
        <OrganizerSidebar>{children}</OrganizerSidebar>
      </div>
    </AuthGuard>
  );
}
