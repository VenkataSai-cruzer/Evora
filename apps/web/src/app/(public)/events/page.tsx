'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listPublicEvents } from '@/lib/api-client';
import { formatDate } from '@/lib/dates';

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listPublicEvents({ upcoming: true })
      .then((res) => setEvents(res.events))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Events</h1>
        <p className="mt-1 text-text-secondary">Upcoming live music experiences</p>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl bg-surface-elevated" />
          ))}
        </div>
      ) : events.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => {
            const soldCount = event._count?.tickets || event.ticketTypes?.reduce((a: number, t: any) => a + t.soldCount, 0) || 0;
            const capacity = event.totalCapacity;
            const isSoldOut = soldCount >= capacity;
            const lowestPrice = event.ticketTypes?.length > 0
              ? Math.min(...event.ticketTypes.map((t: any) => t.price))
              : null;

            return (
              <Link
                key={event.id}
                href={`/events/${event.slug}`}
                className="group rounded-xl border border-[var(--color-border)] bg-surface transition-all hover:bg-surface-hover hover:-translate-y-1"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-lg font-semibold text-white group-hover:text-primary transition-colors">
                      {event.title}
                    </h2>
                    {isSoldOut && (
                      <span className="shrink-0 rounded-full bg-error/10 px-2 py-0.5 text-xs font-medium text-error">
                        Sold out
                      </span>
                    )}
                    {event.salesPaused && !isSoldOut && (
                      <span className="shrink-0 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                        Paused
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm text-text-secondary line-clamp-2">
                    {event.shortDescription || 'No description'}
                  </p>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-text-muted">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                      {formatDate(event.startAt)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-text-muted">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                      {event.venueName}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {lowestPrice !== null ? (
                        <span className="text-sm font-semibold text-white">
                          {lowestPrice === 0 ? 'Free' : `From ₹${(lowestPrice / 100).toLocaleString()}`}
                        </span>
                      ) : (
                        <span className="text-sm text-text-muted">No tickets</span>
                      )}
                    </div>
                    {!isSoldOut && (
                      <span className="text-xs text-text-muted">
                        {capacity - soldCount} left
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-12 text-center">
          <p className="text-text-muted">No upcoming events at this time.</p>
        </div>
      )}
    </div>
  );
}
