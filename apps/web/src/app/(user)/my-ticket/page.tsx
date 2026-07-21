'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listMyTickets } from '@/lib/api-client';
import { formatDate } from '@/lib/dates';
import type { TicketListItem } from '@/lib/api-client';

export default function MyTicketPage() {
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const all = await listMyTickets();
        setTickets(all);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-48 rounded bg-surface-elevated" />
      <div className="h-24 rounded-xl bg-surface-elevated" />
    </div>
  );

  const confirmed = tickets.filter(t => t.status === 'CONFIRMED' || t.status === 'CHECKED_IN');

  if (confirmed.length === 0) return (
    <div>
      <h1 className="text-2xl font-bold text-white">My Ticket</h1>
      <p className="mt-4 text-text-secondary">No confirmed tickets yet.</p>
      <Link href="/events" className="mt-4 inline-block text-sm text-primary hover:text-primary-hover">Browse events &rarr;</Link>
    </div>
  );

  const ticket = confirmed[0];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">My Ticket</h1>
      <div className="mt-6 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-b from-surface to-surface-elevated">
        <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-5">
          <h2 className="text-xl font-bold text-white">{ticket.event.title}</h2>
          <p className="mt-1 text-sm text-text-secondary">{formatDate(ticket.event.startAt)}</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="rounded-xl bg-surface/50 p-4">
            <p className="text-xs text-text-muted">Ticket Number</p>
            <p className="mt-1 text-sm font-mono font-medium text-white">{ticket.ticketNumber}</p>
          </div>
          <div className="rounded-xl bg-surface/50 p-4">
            <p className="text-xs text-text-muted">Event</p>
            <p className="mt-1 text-sm font-medium text-white">{ticket.event.title}</p>
            <p className="text-xs text-text-secondary">{ticket.event.venueName}</p>
          </div>
          {ticket.ticketType && (
            <div className="rounded-xl bg-surface/50 p-4">
              <p className="text-xs text-text-muted">Ticket Type</p>
              <p className="mt-1 text-sm font-medium text-white">{ticket.ticketType.name}</p>
            </div>
          )}
          <Link href={`/tickets/${ticket.ticketNumber}`}
            className="flex w-full items-center justify-center rounded-lg bg-primary py-3 text-sm font-medium text-white hover:bg-primary-hover">
            View full pass
          </Link>
        </div>
      </div>
    </div>
  );
}
