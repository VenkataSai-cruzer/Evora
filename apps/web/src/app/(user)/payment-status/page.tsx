'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listMyTickets } from '@/lib/api-client';
import type { TicketListItem } from '@/lib/api-client';

export default function PaymentStatusPage() {
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listMyTickets().then(setTickets).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse h-24 rounded-xl bg-surface-elevated" />;

  const pending = tickets.filter(t => t.status !== 'CONFIRMED' && t.status !== 'CANCELLED' && t.status !== 'CHECKED_IN');

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Payment Status</h1>
      {pending.length === 0 ? (
        <div className="mt-6 rounded-xl border border-success/30 bg-success-bg p-6">
          <p className="text-success">No pending payments.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {pending.map(t => (
            <div key={t.id} className="rounded-xl border border-warning/30 bg-warning-bg p-6">
              <p className="font-medium text-warning">{t.event.title}</p>
              <p className="mt-1 text-sm text-warning/80">Status: {t.status}</p>
              <p className="mt-1 text-xs text-warning/60">Ticket: {t.ticketNumber}</p>
            </div>
          ))}
        </div>
      )}
      <Link href="/my-event" className="mt-6 inline-block text-sm text-primary">&larr; Back to My Event</Link>
    </div>
  );
}
