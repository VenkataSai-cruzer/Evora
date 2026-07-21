'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-provider';
import { ADMIN_NAV, isActive } from '@/lib/navigation';

export function AdminSidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
      <div className="flex flex-1 flex-col border-r border-[var(--color-border)] bg-surface">
        <div className="border-b border-[var(--color-border)] p-4">
          <Link href="/admin" className="text-sm font-semibold text-white">✦ 7 NOTES</Link>
          <p className="mt-1 text-xs text-text-muted">Admin</p>
        </div>
        <nav className="flex-1 space-y-1 p-3" aria-label="Admin">
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive(item.href, pathname) ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-surface-hover hover:text-white'
              }`}
            >
              <span className="text-xs">{item.icon}</span>
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
      </div>
    </aside>
  );
}
