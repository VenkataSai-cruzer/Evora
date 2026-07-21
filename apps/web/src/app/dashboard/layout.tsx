import { redirect } from 'next/navigation';
import { getSession } from '@/lib/api-client';
import { DashboardNav } from './DashboardNav';

export const metadata = {
  title: 'Dashboard',
  description: 'Your 7 NOTES account dashboard.',
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

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <DashboardNav role={session.role} />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
