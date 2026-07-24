'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getOrganizerEvents } from '@/lib/api-client';
import { formatDate } from '@/lib/dates';

export default function OrganizerEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getOrganizerEvents({ limit: 50 });
      setEvents(res.events || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="h-32 animate-pulse rounded-xl bg-surface-elevated" />;

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">My Events</h1>
        <div className="rounded-xl border border-error/20 bg-error/5 p-8 text-center">
          <p className="text-sm text-text-secondary">{error}</p>
          <button onClick={load} className="mt-4 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">My Events</h1>

      {events.length > 0 ? (
        <div className="space-y-2">
          {events.map((event: any) => {
            const totalSold = event.ticketTypes?.reduce((sum: number, tt: any) => sum + (tt.soldCount || 0), 0) || 0;
            const totalCap = event.ticketTypes?.reduce((sum: number, tt: any) => sum + (tt.capacity || 0), 0) || 0;
            const isSoldOut = totalCap > 0 && totalSold >= totalCap;

            return (
              <Link key={event.id} href={`/organizer/events/${event.id}`}
                className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-surface p-4 hover:bg-surface-hover transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{event.title}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {formatDate(event.startAt)} &middot; {event.venueName}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  <span className="text-xs text-text-muted">
                    {totalSold}/{totalCap > 0 ? totalCap : '∞'}
                  </span>
                  <span className={`text-xs font-medium rounded-full px-2.5 py-0.5 ${
                    isSoldOut || event.bookingClosed ? 'bg-error/10 text-error' :
                    event.salesPaused ? 'bg-warning/10 text-warning' :
                    event.status === 'PUBLISHED' ? 'bg-success/10 text-success' :
                    'bg-surface-elevated text-text-secondary'
                  }`}>
                    {isSoldOut || event.bookingClosed ? 'Sold Out' :
                     event.salesPaused ? 'Paused' :
                     event.status}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-12 text-center">
          <p className="text-text-muted">You are not assigned to any events yet.</p>
          <p className="text-xs text-text-muted mt-2">Contact an admin to get assigned to an event.</p>
        </div>
      )}
    </div>
  );
}
