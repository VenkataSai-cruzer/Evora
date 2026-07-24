'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import Link from 'next/link';

export default function OrganizerEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<{ events: any[] }>('/organizer/events')
      .then((res) => setEvents(res.events))
      .catch(() => setError('Failed to load events'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-elevated" />)}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">My Events</h1>
        <p className="mt-1 text-sm text-text-secondary">Events you are assigned to manage.</p>
      </div>
      {error && <div className="rounded-lg bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}
      {events.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-12 text-center">
          <p className="text-text-muted">You are not assigned to any events.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div key={event.id} className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-white">{event.title}</h2>
                  <p className="mt-1 text-xs text-text-muted">
                    {new Date(event.startAt).toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · {event.venueName}
                  </p>
                  <div className="mt-2 flex gap-3 text-xs text-text-muted">
                    <span>Capacity: {event.totalCapacity}</span>
                    <span>Orders: {event._count?.orders || 0}</span>
                    <span>Check-ins: {event._count?.checkIns || 0}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <Link href={`/organizer/${event.id}/attendees`} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover transition-colors text-center">
                    Attendees
                  </Link>
                  <Link href={`/organizer/${event.id}/analytics`} className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-text-secondary hover:text-white transition-colors text-center">
                    Analytics
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
