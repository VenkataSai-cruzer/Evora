'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-provider';
import { getDefaultRouteForRole } from '@/lib/auth-routes';
import { Suspense } from 'react';

function UnauthorizedContent() {
  const { user, signOut } = useAuth();

  const defaultRoute = user ? getDefaultRouteForRole(user.role) : '/';
  const roleDisplay = user?.role
    ? user.role.charAt(0) + user.role.slice(1).toLowerCase()
    : 'Guest';

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      {/* ── Icon ─────────────────────────────────────── */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10">
        <svg className="h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </div>

      {/* ── Title ────────────────────────────────────── */}
      <h1 className="text-3xl font-bold text-white">Access Denied</h1>
      <p className="mt-3 max-w-md text-base text-text-secondary">
        You are signed in as <strong className="text-white">{roleDisplay}</strong>.
        This area is not available for your account type.
      </p>

      {/* ── Current role badge ───────────────────────── */}
      <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-surface-elevated px-4 py-2">
        <span className="text-sm text-text-muted">Your role:</span>
        <span className="text-sm font-semibold text-white">{user?.role || 'N/A'}</span>
      </div>

      {/* ── Actions ──────────────────────────────────── */}
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href={defaultRoute}
          className="inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          Go to {roleDisplay} Dashboard
        </Link>
        <button
          onClick={() => signOut()}
          className="inline-flex h-10 items-center rounded-lg border border-[var(--color-border)] bg-surface px-5 text-sm font-medium text-text-secondary transition-colors hover:text-white"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function UnauthorizedPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="mx-auto h-8 w-48 rounded bg-surface-elevated" />
        </div>
      </div>
    }>
      <UnauthorizedContent />
    </Suspense>
  );
}
