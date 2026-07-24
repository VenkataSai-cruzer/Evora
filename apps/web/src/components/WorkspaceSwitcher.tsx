'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth-provider';
import { useRouter } from 'next/navigation';

const WORKSPACE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  ORGANIZER: 'Organizer',
  SCANNER: 'Scanner',
  ATTENDEE: 'Attendee',
};

const WORKSPACE_ROUTES: Record<string, string> = {
  ADMIN: '/admin',
  ORGANIZER: '/organizer',
  SCANNER: '/scanner',
  ATTENDEE: '/dashboard',
};

export function WorkspaceSwitcher() {
  const { user, switchWorkspace } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!user || !user.allowedRoles || user.allowedRoles.length <= 1) {
    return null; // Only show switcher if user has multiple workspaces
  }

  const currentLabel = WORKSPACE_LABELS[user.role] || user.role;
  const availableWorkspaces = user.allowedRoles.filter((r) => r !== user.role);

  async function handleSwitch(role: string) {
    setOpen(false);
    const route = WORKSPACE_ROUTES[role];
    if (!route) return;

    // Call backend to validate the switch
    await switchWorkspace(role);

    // Navigate to the workspace's default route
    router.push(route);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-text-secondary hover:text-white hover:bg-surface-hover transition-colors"
        title="Switch workspace"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
        <span>{currentLabel}</span>
        {availableWorkspaces.length > 0 && (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        )}
      </button>

      {open && availableWorkspaces.length > 0 && (
        <div className="absolute left-0 top-full mt-1 w-44 rounded-xl border border-[var(--color-border)] bg-surface p-1 shadow-xl z-50">
          <p className="px-3 py-1.5 text-xs text-text-muted">Switch workspace</p>
          {availableWorkspaces.map((role) => (
            <button
              key={role}
              onClick={() => handleSwitch(role)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-surface-hover hover:text-white transition-colors"
            >
              <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                role === 'ADMIN' ? 'bg-primary/10 text-primary' :
                role === 'ORGANIZER' ? 'bg-accent/10 text-accent' :
                'bg-surface-elevated text-text-muted'
              }`}>
                {role.charAt(0)}
              </div>
              {WORKSPACE_LABELS[role] || role}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
