import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Payments',
  description: 'Manage and verify payments.',
};

export default async function PaymentsPage() {
  await requireRole('ADMIN');

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Payments</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Payment verification queue will appear here.
      </p>
    </div>
  );
}
