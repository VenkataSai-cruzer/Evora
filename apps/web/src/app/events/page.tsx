import { prisma } from '@/lib/prisma';
import type { Metadata } from 'next';
import type { Prisma } from '@prisma/client';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { EventsFilter } from './EventsFilter';
import { parseInstruments, formatTime, formatDate, SKILL_LABELS } from '@/lib/prisma-types';

export const metadata: Metadata = {
  title: 'Events',
  description: 'Browse upcoming jamming sessions and live music events.',
};

const INSTRUMENTS = ['Guitar', 'Bass', 'Drums', 'Keys', 'Vocals', 'Saxophone', 'Trumpet', 'Violin', 'Percussion'];

interface EventsPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const search = typeof searchParams.search === 'string' ? searchParams.search : '';
  const instrument = typeof searchParams.instrument === 'string' ? searchParams.instrument : '';
  const skillLevel = typeof searchParams.skillLevel === 'string' ? searchParams.skillLevel : '';
  const sort = typeof searchParams.sort === 'string' ? searchParams.sort : 'date';
  const page = Math.max(1, typeof searchParams.page === 'string' ? parseInt(searchParams.page, 10) : 1);
  const limit = 12;

  // Build filters
  const where: Prisma.EventWhereInput = {
    status: { in: ['PUBLISHED', 'SALES_OPEN'] },
    visibility: 'PUBLIC',
    startDate: { gte: new Date() },
  };

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
      { venueName: { contains: search } },
    ];
  }

  if (skillLevel) {
    where.skillLevel = skillLevel;
  }

  if (instrument) {
    where.instruments = { contains: instrument };
  }

  const orderBy: Prisma.EventOrderByWithRelationInput = sort === 'title'
    ? { title: 'asc' }
    : { startDate: 'asc' };

  const skip = (page - 1) * limit;

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        coverImageUrl: true,
        startDate: true,
        startTime: true,
        venueName: true,
        capacity: true,
        ticketType: true,
        priceAmount: true,
        instruments: true,
        skillLevel: true,
        _count: {
          select: {
            tickets: {
              where: { status: { in: ['CONFIRMED', 'CHECKED_IN'] } },
            },
          },
        },
      },
    }),
    prisma.event.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  // Parse instruments for display
  const parsedEvents = events.map((event) => ({
    ...event,
    instrumentsList: parseInstruments(event.instruments),
  }));

  return (
    <div className="page-container py-12">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Events</h1>
        <p className="mt-1 text-text-secondary">
          {total > 0
            ? `Showing ${Math.min(total, limit)} of ${total} upcoming ${total === 1 ? 'event' : 'events'}`
            : 'No upcoming events'}
        </p>
      </div>

      {/* Filters */}
      <EventsFilter
        currentSearch={search}
        currentInstrument={instrument}
        currentSkill={skillLevel}
        currentSort={sort}
        instruments={INSTRUMENTS}
        skillLabels={SKILL_LABELS}
      />

      {/* Event grid */}
      {parsedEvents.length > 0 ? (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {parsedEvents.map((event) => {
              const spotsLeft = event.capacity - event._count.tickets;
              const fillPercent = event.capacity > 0
                ? Math.round((event._count.tickets / event.capacity) * 100)
                : 0;

              return (
                <Link
                  key={event.id}
                  href={`/events/${event.slug}`}
                  className="group rounded-xl border border-[var(--color-border)] bg-surface transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5"
                >
                  {/* Cover image */}
                  <div className="relative aspect-video overflow-hidden rounded-t-xl bg-surface-elevated">
                    {event.coverImageUrl ? (
                      <img
                        src={event.coverImageUrl}
                        alt={event.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="text-4xl opacity-30">🎵</span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-semibold text-white group-hover:text-primary transition-colors">
                      {event.title}
                    </h3>
                    <p className="mt-1 text-sm text-text-secondary">
                      {event.venueName} • {formatDate(event.startDate)}
                    </p>

                    {/* Instrument tags */}
                    {event.instrumentsList.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {event.instrumentsList.slice(0, 3).map((inst) => (
                          <Badge key={inst} variant="outline" size="sm">
                            {inst}
                          </Badge>
                        ))}
                        {event.instrumentsList.length > 3 && (
                          <Badge variant="outline" size="sm">
                            +{event.instrumentsList.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Capacity bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-text-muted">
                        <span>{spotsLeft > 0 ? `${spotsLeft} spots left` : 'Full'}</span>
                        <span>{event._count.tickets}/{event.capacity}</span>
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

                    {/* Price/Free badge */}
                    <div className="mt-3 flex items-center justify-between">
                      <Badge variant={event.ticketType === 'FREE' ? 'success' : 'primary'} size="sm">
                        {event.ticketType === 'FREE' ? 'Free' : event.priceAmount ? `$${(event.priceAmount / 100).toFixed(2)}` : 'Free'}
                      </Badge>
                      <span className="text-xs text-text-muted">{formatTime(event.startTime)}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-2">
              {page > 1 && (
                <Link
                  href={`/events?page=${page - 1}${search ? `&search=${search}` : ''}${instrument ? `&instrument=${instrument}` : ''}${skillLevel ? `&skillLevel=${skillLevel}` : ''}${sort !== 'date' ? `&sort=${sort}` : ''}`}
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
                    href={`/events?page=${pageNum}${search ? `&search=${search}` : ''}${instrument ? `&instrument=${instrument}` : ''}${skillLevel ? `&skillLevel=${skillLevel}` : ''}${sort !== 'date' ? `&sort=${sort}` : ''}`}
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
                  href={`/events?page=${page + 1}${search ? `&search=${search}` : ''}${instrument ? `&instrument=${instrument}` : ''}${skillLevel ? `&skillLevel=${skillLevel}` : ''}${sort !== 'date' ? `&sort=${sort}` : ''}`}
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
            search || instrument || skillLevel
              ? 'No events match your filters. Try adjusting your search criteria.'
              : 'There are no events scheduled yet. Check back later for new jamming sessions.'
          }
          actionHref={
            search || instrument || skillLevel
              ? { label: 'Clear filters', href: '/events' }
              : undefined
          }
        />
      )}
    </div>
  );
}
