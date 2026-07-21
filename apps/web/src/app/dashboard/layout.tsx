'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { DashboardNav } from './DashboardNav';
import { useAuth } from '@/lib/auth-provider';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </AuthGuard>
  );
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <DashboardNav role={user.role} />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
