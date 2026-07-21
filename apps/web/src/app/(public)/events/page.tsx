export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { EventsFilter } from './EventsFilter';
import { formatDate } from '@/lib/dates';
import { listPublicEvents } from '@/lib/api-client';

export const metadata: Metadata = {
  title: 'Events',
  description: 'Browse upcoming jamming sessions and live music events.',
};

const INSTRUMENTS: string[] = [];

interface EventsPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const search = typeof searchParams.search === 'string' ? searchParams.search : '';
  const instrument = typeof searchParams.instrument === 'string' ? searchParams.instrument : '';
  const sort = typeof searchParams.sort === 'string' ? searchParams.sort : 'date';
  const page = Math.max(1, typeof searchParams.page === 'string' ? parseInt(searchParams.page, 10) : 1);
  const limit = 12;

  const { events, total } = await listPublicEvents({
    search: search || undefined,
    sort: sort !== 'date' ? sort : undefined,
    page,
    limit,
    upcoming: true,
  });

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="page-container py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Events</h1>
        <p className="mt-1 text-text-secondary">
          {total > 0
            ? `Showing ${Math.min(total, limit)} of ${total} upcoming ${total === 1 ? 'event' : 'events'}`
            : 'No upcoming events'}
        </p>
      </div>

      <EventsFilter
        currentSearch={search}
        currentInstrument={instrument}
        currentSkill=""
        currentSort={sort}
        instruments={INSTRUMENTS}
        skillLabels={{}}
      />

      {events.length > 0 ? (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {events.map((event) => {
              const spotsLeft = event.totalCapacity - event._count.tickets;
              const fillPercent = event.totalCapacity > 0
                ? Math.round((event._count.tickets / event.totalCapacity) * 100)
                : 0;
              const isFree = event.ticketTypes.some((t) => t.price === 0);
              const minPrice = Math.min(...event.ticketTypes.map((t) => t.price));

              return (
                <Link
                  key={event.id}
                  href={`/events/${event.slug}`}
                  className="group rounded-xl border border-[var(--color-border)] bg-surface transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5"
                >
                  <div className="relative aspect-video overflow-hidden rounded-t-xl bg-surface-elevated">
                    {event.posterObjectKey ? (
                      <img
                        src={event.posterObjectKey}
                        alt={event.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="text-4xl opacity-30">🎵</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-white group-hover:text-primary transition-colors">
                      {event.title}
                    </h3>
                    <p className="mt-1 text-sm text-text-secondary">
                      {event.venueName} • {formatDate(event.startAt)}
                    </p>

                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-text-muted">
                        <span>{spotsLeft > 0 ? `${spotsLeft} spots left` : 'Full'}</span>
                        <span>{event._count.tickets}/{event.totalCapacity}</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-elevated">
                        <div
                          className={`h-full rounded-full transition-all ${
                            fillPercent >= 95
                              ? 'bg-error'
                              : fillPercent >= 80
                              ? 'bg-warning'
                              : fillPercent >= 50
                              ? 'bg-primary'
                              : 'bg-success'
                          }`}
                          style={{ width: `${Math.min(fillPercent, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <Badge variant={isFree ? 'success' : 'primary'} size="sm">
                        {isFree ? 'Free' : `₹${(minPrice / 100).toFixed(0)}`}
                      </Badge>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-2">
              {page > 1 && (
                <Link
                  href={`/events?page=${page - 1}${search ? `&search=${search}` : ''}${sort !== 'date' ? `&sort=${sort}` : ''}`}
                  className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-hover hover:text-white"
                >
                  Previous
                </Link>
              )}
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <Link
                    key={pageNum}
                    href={`/events?page=${pageNum}${search ? `&search=${search}` : ''}${sort !== 'date' ? `&sort=${sort}` : ''}`}
                    className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                      pageNum === page
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-[var(--color-border)] text-text-secondary hover:bg-surface-hover hover:text-white'
                    }`}
                  >
                    {pageNum}
                  </Link>
                );
              })}
              {page < totalPages && (
                <Link
                  href={`/events?page=${page + 1}${search ? `&search=${search}` : ''}${sort !== 'date' ? `&sort=${sort}` : ''}`}
                  className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-hover hover:text-white"
                >
                  Next
                </Link>
              )}
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon="🎵"
          title="No upcoming events"
          description={
            search || instrument
              ? 'No events match your filters. Try adjusting your search criteria.'
              : 'There are no events scheduled yet. Check back later for new jamming sessions.'
          }
          actionHref={
            search || instrument
              ? { label: 'Clear filters', href: '/events' }
              : undefined
          }
        />
      )}
    </div>
  );
}
