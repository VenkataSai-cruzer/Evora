'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listMyTickets, listPublicEvents } from '@/lib/api-client';
import { formatDate } from '@/lib/dates';
import type { TicketListItem, PublicEventListItem } from '@/lib/api-client';

export default function MyEventPage() {
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [events, setEvents] = useState<PublicEventListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [allTickets, allEvents] = await Promise.all([
          listMyTickets(),
          listPublicEvents({ upcoming: true, limit: 1 }),
        ]);
        setTickets(allTickets);
        if (allEvents.events.length > 0) setEvents(allEvents.events);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded bg-surface-elevated" />
        <div className="h-24 rounded-xl bg-surface-elevated" />
      </div>
    );
  }

  const confirmedTickets = tickets.filter(t => t.status === 'CONFIRMED');
  const pendingTickets = tickets.filter(t => t.status !== 'CONFIRMED' && t.status !== 'CANCELLED' && t.status !== 'CHECKED_IN');
  const hasTickets = tickets.length > 0;
  const currentEvent = events[0] || null;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">My Event</h1>

      {/* No tickets state */}
      {!hasTickets && currentEvent && (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-6">
          <h2 className="text-lg font-semibold text-white">{currentEvent.title}</h2>
          <p className="mt-1 text-sm text-text-secondary">{formatDate(currentEvent.startAt)} &middot; {currentEvent.venueName}</p>
          <Link href={`/events/${currentEvent.slug}`}
            className="mt-4 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover">
            Book tickets
          </Link>
        </div>
      )}

      {/* Pending payments */}
      {pendingTickets.length > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning-bg p-6">
          <h2 className="text-sm font-semibold text-warning">Payment pending</h2>
          <p className="mt-1 text-sm text-warning/80">{pendingTickets.length} ticket(s) awaiting confirmation</p>
          <Link href="/payment-status" className="mt-2 inline-block text-sm text-warning underline">View details</Link>
        </div>
      )}

      {/* Confirmed tickets */}
      {confirmedTickets.length > 0 && (
        <div className="rounded-xl border border-success/30 bg-success-bg p-6">
          <h2 className="text-sm font-semibold text-success">Ticket confirmed</h2>
          <p className="mt-1 text-sm text-success/80">{confirmedTickets.length} ticket(s) ready</p>
          <Link href="/my-ticket" className="mt-2 inline-block text-sm text-success underline">View my ticket</Link>
        </div>
      )}

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-2">
        {currentEvent && !hasTickets && (
          <Link href={`/events/${currentEvent.slug}`}
            className="rounded-lg border border-[var(--color-border)] bg-surface p-4 text-sm font-medium text-white hover:bg-surface-hover">
            Current event
          </Link>
        )}
        {confirmedTickets.length > 0 && (
          <Link href="/my-ticket"
            className="rounded-lg border border-[var(--color-border)] bg-surface p-4 text-sm font-medium text-white hover:bg-surface-hover">
            My Ticket
          </Link>
        )}
        <Link href="/profile"
          className="rounded-lg border border-[var(--color-border)] bg-surface p-4 text-sm font-medium text-white hover:bg-surface-hover">
          Profile
        </Link>
      </div>
    </div>
  );
}
