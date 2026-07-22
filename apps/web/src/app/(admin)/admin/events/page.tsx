'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listAdminEvents } from '@/lib/api-client';
import { formatDate } from '@/lib/dates';

export default function AdminEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listAdminEvents({}).then(r => setEvents(r.events)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="h-32 animate-pulse rounded-xl bg-surface-elevated" />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Events</h1>
        <Link href="/admin/events/new"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover">
          New Event
        </Link>
      </div>

      {events.length > 0 ? (
        <div className="space-y-2">
          {events.map(event => (
            <Link key={event.id} href={`/admin/events/${event.id}`}
              className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-surface p-4 hover:bg-surface-hover transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{event.title}</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {formatDate(event.startAt)} &middot; {event.venueName}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                <span className="text-xs text-text-muted">{event._count?.orders || 0} orders</span>
                <span className={`text-xs font-medium rounded-full px-2.5 py-0.5 ${
                  event.status === 'PUBLISHED' ? 'bg-success/10 text-success' :
                  event.status === 'DRAFT' ? 'bg-text-muted/10 text-text-muted' :
                  event.status === 'CANCELLED' ? 'bg-error/10 text-error' :
                  'bg-surface-elevated text-text-secondary'
                }`}>
                  {event.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-12 text-center">
          <p className="text-text-muted">No events yet.</p>
          <Link href="/admin/events/new"
            className="mt-4 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover">
            Create First Event
          </Link>
        </div>
      )}
    </div>
  );
}
