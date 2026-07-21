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

  if (loading) return <div className="animate-pulse h-32 rounded-xl bg-surface-elevated" />;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Events</h1>
        <Link href="/admin/events/new"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover">
          New Event
        </Link>
      </div>

      {events.length > 0 ? (
        <div className="mt-6 space-y-2">
          {events.map(event => (
            <Link key={event.id} href={`/admin/events/${event.id}`}
              className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-surface p-4 hover:bg-surface-hover">
              <div>
                <p className="text-sm font-medium text-white">{event.title}</p>
                <p className="text-xs text-text-muted">{formatDate(event.startAt)} &middot; {event.venueName}</p>
              </div>
              <span className="text-xs text-text-muted">{event.status}</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-surface p-12 text-center">
          <p className="text-text-muted">No events yet.</p>
        </div>
      )}
    </div>
  );
}
