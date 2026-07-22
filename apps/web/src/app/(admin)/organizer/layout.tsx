'use client';

import { useAuth } from '@/lib/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) { router.push('/auth/login'); return; }
    if (!loading && user && user.role !== 'ORGANIZER' && user.role !== 'ADMIN') {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading || !user) return null;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <nav className="w-56 flex-shrink-0 border-r border-[var(--color-border)] bg-surface p-4">
        <div className="mb-6">
          <p className="text-xs text-text-muted uppercase tracking-wider">Organizer</p>
          <p className="mt-1 text-sm font-semibold text-white">{user.name}</p>
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
    </div>
  );
}
