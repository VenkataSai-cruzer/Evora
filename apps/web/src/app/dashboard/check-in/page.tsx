import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/api-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Check-in',
  description: 'Verify tickets and manage event check-ins.',
};

export default async function CheckInPage() {
  const session = await getSession();
  if (!session) redirect('/auth/login?callbackUrl=/dashboard/check-in');
  if (session.role !== 'ADMIN') redirect('/dashboard');

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Check-in</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Ticket verification and check-in will appear here.
      </p>
    </div>
  );
}
