'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getTicket } from '@/lib/api-client';
import { formatDate } from '@/lib/dates';
import type { TicketDetailResponse } from '@/lib/api-client';

export default function TicketDetailPage() {
  const params = useParams();
  const ticketNumber = params.ticketNumber as string;
  const [ticket, setTicket] = useState<TicketDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getTicket(ticketNumber);
        if (!data) { setError(true); return; }
        setTicket(data);
      } catch { setError(true); }
      finally { setLoading(false); }
    }
    load();
  }, [ticketNumber]);

  if (loading) return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-surface-elevated" />
        <div className="h-4 w-32 rounded bg-surface-elevated" />
      </div>
    </div>
  );

  if (error || !ticket) return (
    <div className="text-center py-16">
      <h1 className="text-2xl font-bold text-white">Ticket not found</h1>
      <Link href="/my-ticket" className="mt-4 inline-block text-sm text-primary">&larr; Back to My Ticket</Link>
    </div>
  );

  return (
    <div className="max-w-md mx-auto">
      <Link href="/my-ticket" className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-white">
        &larr; My Ticket
      </Link>

      <div className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-b from-surface to-surface-elevated">
        <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-5">
          <h1 className="text-xl font-bold text-white">{ticket.event.title}</h1>
          <p className="mt-2 text-sm text-text-secondary">{formatDate(ticket.event.startAt)}</p>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-xl bg-surface/50 p-4">
            <p className="text-xs text-text-muted">Ticket</p>
            <p className="mt-1 font-mono font-medium text-white">{ticket.ticketNumber}</p>
          </div>

          <div className="rounded-xl bg-surface/50 p-4">
            <p className="text-xs text-text-muted">Event</p>
            <p className="mt-1 font-medium text-white">{ticket.event.title}</p>
            <p className="text-sm text-text-secondary">{ticket.event.venueName}</p>
            {ticket.event.venueAddress && <p className="text-xs text-text-muted">{ticket.event.venueAddress}</p>}
          </div>

          {ticket.ticketType && (
            <div className="rounded-xl bg-surface/50 p-4">
              <p className="text-xs text-text-muted">Type</p>
              <p className="mt-1 font-medium text-white">{ticket.ticketType.name}</p>
            </div>
          )}

          {ticket.order && (
            <div className="rounded-xl bg-surface/50 p-4">
              <p className="text-xs text-text-muted">Order</p>
              <p className="mt-1 font-mono text-sm text-white">{ticket.order.orderNumber}</p>
            </div>
          )}

          <div className="flex gap-2">
            <span className="flex-1 rounded-lg bg-primary/30 px-4 py-2.5 text-center text-sm font-medium text-primary/50 cursor-not-allowed">
              Download pass
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
