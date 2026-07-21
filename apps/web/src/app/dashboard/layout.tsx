import { redirect } from 'next/navigation';
import { getSession } from '@/lib/api-client';
import { DashboardNav } from './DashboardNav';

export const metadata = {
  title: 'Dashboard',
  description: 'Organizer dashboard for managing events.',
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/auth/login?callbackUrl=/dashboard');
  }

  const role = session.role;
  const isOrganizerOrAdmin = role === 'ORGANIZER' || role === 'ADMIN';

  if (!isOrganizerOrAdmin) {
    redirect('/');
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <DashboardNav role={role} />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
