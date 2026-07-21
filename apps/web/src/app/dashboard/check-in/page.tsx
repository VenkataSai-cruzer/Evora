import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Check-in',
  description: 'Verify tickets and manage event check-ins.',
};

export default async function CheckInPage() {
  await requireRole('ADMIN');

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Check-in</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Ticket verification and check-in will appear here.
      </p>
    </div>
  );
}
