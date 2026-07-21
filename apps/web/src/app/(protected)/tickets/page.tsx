'use client';

import Link from 'next/link';

import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { AuthGuard } from '@/components/AuthGuard';
import { formatDate } from '@/lib/dates';
import { listMyTickets } from '@/lib/api-client';
import { useEffect, useState } from 'react';
import type { TicketListItem } from '@/lib/api-client';

// Metadata is handled by layout
export default function MyTicketsPage() {
  return (
    <AuthGuard>
      <MyTicketsContent />
    </AuthGuard>
  );
}

function MyTicketsContent() {
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const allTickets = await listMyTickets();
        setTickets(allTickets);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const now = new Date();
  const upcomingTickets = tickets.filter(
    (t) => new Date(t.event.startAt) >= now && t.status === 'CONFIRMED'
  );
  const pastTickets = tickets.filter(
    (t) => new Date(t.event.startAt) < now || ['CHECKED_IN', 'CANCELLED', 'EXPIRED'].includes(t.status)
  );

  if (loading) {
    return (
      <div className="page-container py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-surface-elevated" />
          <div className="h-4 w-32 rounded bg-surface-elevated" />
          <div className="h-24 rounded-xl bg-surface-elevated" />
          <div className="h-24 rounded-xl bg-surface-elevated" />
        </div>
      </div>
    );
  }

  const hasNoData = upcomingTickets.length === 0 && pastTickets.length === 0;

  if (hasNoData) {
    return (
      <div className="page-container py-12">
        <EmptyState
          icon="🎫"
          title="No tickets yet"
          description="Browse upcoming events and grab your first ticket!"
          actionHref={{ label: 'Browse events', href: '/events' }}
        />
      </div>
    );
  }

  return (
    <div className="page-container py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">My Tickets</h1>
        <p className="mt-1 text-text-secondary">
          {upcomingTickets.length > 0
            ? `${upcomingTickets.length} upcoming ${upcomingTickets.length === 1 ? 'event' : 'events'}`
            : 'No upcoming events'}
        </p>
      </div>

      {upcomingTickets.length > 0 && (
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-white mb-4">Upcoming</h2>
          <div className="space-y-4">
            {upcomingTickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/tickets/${ticket.ticketNumber}`}
                className="flex items-start gap-4 rounded-xl border border-[var(--color-border)] bg-surface p-4 transition-all hover:bg-surface-hover"
              >
                <div className="hidden h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-surface-elevated sm:block">
                  {ticket.event.posterObjectKey ? (
                    <img src={ticket.event.posterObjectKey} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-2xl opacity-30">✦</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-white">{ticket.event.title}</h3>
                      <p className="mt-0.5 text-sm text-text-secondary">{formatDate(ticket.event.startAt)}</p>
                      <p className="text-xs text-text-muted">{ticket.event.venueName}</p>
                    </div>
                    <Badge variant="success" size="sm">{ticket.status === 'CONFIRMED' ? 'Confirmed' : ticket.status}</Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-text-muted">
                    <span>Ticket: {ticket.ticketNumber}</span>
                    {ticket.ticketType && <span>{ticket.ticketType.name}</span>}
                  </div>
                  <div className="mt-1.5 inline-flex items-center gap-1 text-xs text-primary hover:text-primary-hover">
                    View pass
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {pastTickets.length > 0 && (
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-white mb-4">Past</h2>
          <div className="space-y-2">
            {pastTickets.map((ticket) => (
              <div key={ticket.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-surface p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">{ticket.event.title}</p>
                  <p className="text-xs text-text-muted">{formatDate(ticket.event.startAt)} &bull; {ticket.event.venueName}</p>
                </div>
                <Badge variant="default" size="sm">{ticket.status}</Badge>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
