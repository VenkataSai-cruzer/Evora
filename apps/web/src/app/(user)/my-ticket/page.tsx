'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listMyTickets } from '@/lib/api-client';
import { formatDate } from '@/lib/dates';

export default function MyTicketPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listMyTickets()
      .then(setTickets)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="space-y-3">
      <div className="h-8 w-32 animate-pulse rounded bg-surface-elevated" />
      {[1,2].map(i => <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-elevated" />)}
    </div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">My Tickets</h1>

      {tickets.length > 0 ? (
        <div className="space-y-3">
          {tickets.map((ticket) => {
            const statusColors: Record<string, string> = {
              CONFIRMED: 'text-success',
              CHECKED_IN: 'text-primary',
              PENDING_PAYMENT: 'text-warning',
              CANCELLED: 'text-error',
              EXPIRED: 'text-text-muted',
            };
            return (
              <Link
                key={ticket.id}
                href={`/tickets/${ticket.ticketNumber}`}
                className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-surface p-4 hover:bg-surface-hover transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{ticket.event?.title}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {ticket.event ? formatDate(ticket.event.startAt) : ''} &middot; {ticket.ticketType?.name}
                  </p>
                  {ticket.attendee && (
                    <p className="text-xs text-text-muted mt-0.5">{ticket.attendee.attendeeName}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs font-medium ${statusColors[ticket.status] || 'text-text-muted'}`}>
                    {ticket.status === 'CHECKED_IN' ? 'CHECKED IN' : ticket.status === 'PENDING_PAYMENT' ? 'PENDING' : ticket.status}
                  </span>
                  <span className="text-xs text-text-muted font-mono">{ticket.ticketNumber}</span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-12 text-center">
          <p className="text-text-muted">No tickets yet.</p>
          <Link href="/events" className="mt-4 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover">
            Browse Events
          </Link>
        </div>
      )}
    </div>
  );
}
