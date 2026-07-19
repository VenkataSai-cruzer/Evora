import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
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
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/login?callbackUrl=/dashboard');
  }

  const role = session.user.role;
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
