'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { AdminSidebar } from './AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard requiredRole="ADMIN">
      <div className="flex min-h-screen">
        <AdminSidebar />
        <main className="flex-1 lg:ml-64 p-6 lg:p-8">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
