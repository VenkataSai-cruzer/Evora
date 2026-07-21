'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { ProtectedSidebar } from '@/components/layout/ProtectedSidebar';
import { useAuth } from '@/lib/auth-provider';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <ProtectedLayoutInner>{children}</ProtectedLayoutInner>
    </AuthGuard>
  );
}

function ProtectedLayoutInner({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <ProtectedSidebar role={user.role} />
      <main className="flex-1 overflow-y-auto pt-16 lg:pt-0 lg:ml-64 p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
