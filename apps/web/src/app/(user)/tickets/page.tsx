'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { listMyTickets } from '@/lib/api-client';
import { formatDate, formatTime } from '@/lib/dates';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  CONFIRMED: { label: 'Active', color: 'bg-success/10 text-success border-success/20' },
  CHECKED_IN: { label: 'Used', color: 'bg-primary/10 text-primary border-primary/20' },
  CANCELLED: { label: 'Cancelled', color: 'bg-surface-elevated text-text-muted border-[var(--color-border)]' },
  EXPIRED: { label: 'Expired', color: 'bg-surface-elevated text-text-muted border-[var(--color-border)]' },
};

export default function TicketsListPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [hasPendingOrders, setHasPendingOrders] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const items = await listMyTickets();
      setTickets(items);
      // Show contextual message if there are pending orders but no issued tickets
      // Check order status for pending bookings (ticket.status is CONFIRMED/CHECKED_IN/CANCELLED/EXPIRED)
      const hasPending = items.some((t: any) =>
        t.order?.status && ['PENDING_PAYMENT', 'PENDING_VERIFICATION', 'REJECTED'].includes(t.order.status)
      );
      const hasIssued = items.some((t: any) => ['CONFIRMED', 'CHECKED_IN'].includes(t.status));
      setHasPendingOrders(hasPending && !hasIssued);
    } catch (err: any) {
      setError(err.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  // Only show issued tickets (CONFIRMED, CHECKED_IN)
  const issuedTickets = tickets.filter((t) => ['CONFIRMED', 'CHECKED_IN'].includes(t.status));

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 animate-pulse rounded bg-surface-elevated" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-elevated" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">My Tickets</h1>
        <div className="rounded-xl border border-error/20 bg-error/5 p-8 text-center">
          <p className="text-sm text-text-secondary">Failed to load tickets</p>
          <p className="mt-1 text-xs text-text-muted">{error}</p>
          <button onClick={loadTickets} className="mt-4 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No tickets at all
  if (tickets.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">My Tickets</h1>
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-elevated">
            <span className="text-3xl">🎫</span>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-white">No tickets yet</h2>
          <p className="mt-1 text-sm text-text-secondary max-w-md mx-auto">
            Tickets will appear here once your payment is approved and your booking is confirmed.
          </p>
          <Link href="/events" className="mt-6 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover transition-colors">
            Browse Events
          </Link>
        </div>
      </div>
    );
  }

  // Has pending orders but no issued tickets yet
  if (hasPendingOrders && issuedTickets.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">My Tickets</h1>
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-elevated">
            <span className="text-3xl">⏳</span>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-white">Tickets pending</h2>
          <p className="mt-1 text-sm text-text-secondary max-w-md mx-auto">
            Your tickets will appear here after your payment is verified and your booking is confirmed.
          </p>
          <Link href="/my-bookings" className="mt-6 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover transition-colors">
            View My Bookings
          </Link>
        </div>
      </div>
    );
  }

  // Has issued tickets
  const active = issuedTickets.filter((t) => t.status === 'CONFIRMED');
  const used = issuedTickets.filter((t) => t.status === 'CHECKED_IN');
  const cancelled = issuedTickets.filter((t) => ['CANCELLED', 'EXPIRED'].includes(t.status));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">My Tickets</h1>
        <span className="text-xs text-text-muted">{issuedTickets.length} ticket{issuedTickets.length !== 1 ? 's' : ''}</span>
      </div>

      {active.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs text-text-muted uppercase tracking-wider">Active ({active.length})</h2>
          <div className="space-y-2">
            {active.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)}
          </div>
        </div>
      )}

      {used.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs text-text-muted uppercase tracking-wider">Used ({used.length})</h2>
          <div className="space-y-2">
            {used.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)}
          </div>
        </div>
      )}

      {cancelled.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs text-text-muted uppercase tracking-wider">Cancelled ({cancelled.length})</h2>
          <div className="space-y-2">
            {cancelled.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function TicketCard({ ticket }: { ticket: any }) {
  const cfg = STATUS_CONFIG[ticket.status] || { label: ticket.status, color: 'bg-surface-elevated text-text-muted border-[var(--color-border)]' };
  const isActive = ticket.status === 'CONFIRMED';
  const isUsed = ticket.status === 'CHECKED_IN';

  return (
    <Link href={`/tickets/${ticket.ticketNumber}`}
      className="flex items-center gap-4 rounded-xl border border-[var(--color-border)] bg-surface p-4 hover:bg-surface-hover transition-colors"
    >
      <div className={`flex h-12 w-12 items-center justify-center rounded-full ${isActive ? 'bg-success/10' : isUsed ? 'bg-primary/10' : 'bg-surface-elevated'}`}>
        <span className="text-xl">{isActive ? '🎫' : isUsed ? '✓' : '🗙'}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{ticket.event?.title || 'Event'}</p>
        <p className="text-xs text-text-muted">{ticket.ticketType?.name || 'Ticket'} &middot; {ticket.ticketNumber}</p>
        {ticket.event?.startAt && (
          <p className="text-xs text-text-muted mt-0.5">
            {formatDate(ticket.event.startAt)} at {formatTime(ticket.event.startAt)}
            {ticket.event.venueName ? ` · ${ticket.event.venueName}` : ''}
          </p>
        )}
        {ticket.checkIn && (
          <p className="text-xs text-primary mt-0.5">
            Checked in {new Date(ticket.checkIn.checkedInAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium flex-shrink-0 ${cfg.color}`}>
        {cfg.label}
      </span>
    </Link>
  );
}
