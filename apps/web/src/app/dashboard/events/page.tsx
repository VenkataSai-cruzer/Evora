import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { formatDate } from '@/lib/prisma-types';

interface EventsPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function OrganizerEventsPage({ searchParams }: EventsPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login?callbackUrl=/dashboard/events');

  const statusFilter = typeof searchParams.status === 'string' ? searchParams.status : '';
  const page = Math.max(1, typeof searchParams.page === 'string' ? parseInt(searchParams.page, 10) : 1);
  const limit = 20;

  const where: Prisma.EventWhereInput = {
    organizerId: session.user.id,
  };

  if (statusFilter) {
    where.status = statusFilter;
  }

  const skip = (page - 1) * limit;

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        startAt: true,
        venueName: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            tickets: true,
            orders: true,
          },
        },
      },
    }),
    prisma.event.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  const STATUS_TABS = [
    { label: 'All', value: '', count: total },
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Published', value: 'PUBLISHED' },
    { label: 'Sales Open', value: 'SALES_OPEN' },
    { label: 'Sales Paused', value: 'SALES_PAUSED' },
    { label: 'Sold Out', value: 'SOLD_OUT' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Events</h1>
          <p className="mt-1 text-sm text-text-secondary">{total} total events</p>
        </div>
        <Link
          href="/dashboard/events/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-primary-hover"
        >
          <span>➕</span>
          Create Event
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-2">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/dashboard/events${tab.value ? `?status=${tab.value}` : ''}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === tab.value
                ? 'bg-primary/10 text-primary'
                : 'text-text-secondary hover:bg-surface-hover hover:text-white'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Events list */}
      {events.length > 0 ? (
        <div className="space-y-2">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/dashboard/events/${event.id}`}
              className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-surface p-4 transition-colors hover:bg-surface-hover"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-medium text-white truncate">{event.title}</h3>
                  <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    event.status === 'PUBLISHED' || event.status === 'SALES_OPEN' ? 'bg-success/10 text-success' :
                    event.status === 'DRAFT' ? 'bg-warning/10 text-warning' :
                    event.status === 'COMPLETED' ? 'bg-primary/10 text-primary' :
                    event.status === 'SALES_PAUSED' ? 'bg-warning/10 text-warning' :
                    'bg-error/10 text-error'
                  }`}>
                    {event.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-text-muted">
                  {event.venueName} &bull; {formatDate(event.startAt)} &bull; {event._count.tickets} tickets &bull; {event._count.orders} orders
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <span className={`text-xs ${event.status === 'PUBLISHED' || event.status === 'SALES_OPEN' ? 'text-success' : 'text-text-muted'}`}>{event.status}</span>
                <svg className="h-4 w-4 text-text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-12 text-center">
          <div className="text-4xl mb-4">🎵</div>
          <h3 className="text-lg font-semibold text-white">No events found</h3>
          <p className="mt-1 text-sm text-text-secondary">
            {statusFilter ? `No events with status "${statusFilter}".` : 'Create your first event to get started.'}
          </p>
          <Link
            href="/dashboard/events/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
          >
            Create Event
          </Link>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
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
                href={`/dashboard/events?page=${pageNum}${statusFilter ? `&status=${statusFilter}` : ''}`}
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  pageNum === page
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-[var(--color-border)] text-text-secondary hover:bg-surface-hover'
                }`}
              >
                {pageNum}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
