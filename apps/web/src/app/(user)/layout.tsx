'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/lib/auth-provider';
import { USER_NAV, isActive } from '@/lib/navigation';

function UserSidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <aside className="hidden w-64 flex-col border-r border-[var(--color-border)] bg-surface lg:flex">
      <div className="border-b border-[var(--color-border)] p-4">
        <Link href="/dashboard" className="text-sm font-semibold text-white">✦ Evora</Link>
        <p className="mt-0.5 text-xs text-text-muted">My Account</p>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {USER_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive(item.href, pathname) ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-surface-hover hover:text-white'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-[var(--color-border)] p-3">
        <Link href="/" className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-text-muted hover:text-white">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to site
        </Link>
        <button onClick={() => signOut()} className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-text-muted hover:text-white">
          Sign out
        </button>
      </div>
    </aside>
  );
}

function UserMobileNav() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--color-border)] bg-surface lg:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {USER_NAV.slice(0, 4).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive(item.href, pathname) ? 'text-primary' : 'text-text-muted'
            }`}
          >
            {item.label}
          </Link>
        ))}
        <button onClick={() => signOut()} className="flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-xs text-text-muted">
          Sign out
        </button>
      </div>
    </nav>
  );
}

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <UserSidebar />
        <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
          {children}
        </main>
        <UserMobileNav />
      </div>
    </AuthGuard>
  );
}
