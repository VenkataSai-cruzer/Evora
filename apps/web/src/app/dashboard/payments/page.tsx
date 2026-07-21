import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/api-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Payments',
  description: 'Manage and verify payments.',
};

export default async function PaymentsPage() {
  const session = await getSession();
  if (!session) redirect('/auth/login?callbackUrl=/dashboard/payments');
  if (session.role !== 'ADMIN') redirect('/dashboard');

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Payments</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Payment verification queue will appear here.
      </p>
    </div>
  );
}
