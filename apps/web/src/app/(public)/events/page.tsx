export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import { formatDate } from '@/lib/dates';
import { listPublicEvents } from '@/lib/api-client';

export const metadata: Metadata = {
  title: 'Events',
  description: 'Browse upcoming 7 NOTES events.',
};

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function EventsPage({ searchParams }: PageProps) {
  const page = Math.max(1, typeof searchParams.page === 'string' ? parseInt(searchParams.page, 10) : 1);
  const { events, total } = await listPublicEvents({ page, limit: 12, upcoming: true });

  return (
    <div className="page-container py-12">
      <h1 className="text-3xl font-bold text-white">Events</h1>
      <p className="mt-1 text-text-secondary">{total > 0 ? `${events.length} upcoming events` : 'No upcoming events'}</p>

      {events.length > 0 ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.slug}`}
              className="group rounded-xl border border-[var(--color-border)] bg-surface p-5 transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <h3 className="font-semibold text-white group-hover:text-primary transition-colors">{event.title}</h3>
              <p className="mt-1 text-sm text-text-secondary">{formatDate(event.startAt)}</p>
              <p className="text-sm text-text-muted">{event.venueName}</p>
              <span className="mt-3 inline-block text-xs text-primary">Book now &rarr;</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-xl border border-[var(--color-border)] bg-surface p-12 text-center">
          <p className="text-text-muted">No events scheduled yet. Check back later.</p>
        </div>
      )}

      {total > 12 && (
        <div className="mt-8 flex justify-center gap-2">
          {page > 1 && <Link href={`/events?page=${page - 1}`} className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-text-secondary hover:text-white">Previous</Link>}
          {Array.from({ length: Math.ceil(total / 12) }, (_, i) => (
            <Link key={i + 1} href={`/events?page=${i + 1}`}
              className={`rounded-lg border px-3 py-2 text-sm ${page === i + 1 ? 'border-primary bg-primary/10 text-primary' : 'border-[var(--color-border)] text-text-secondary hover:text-white'}`}>
              {i + 1}
            </Link>
          ))}
          {page < Math.ceil(total / 12) && <Link href={`/events?page=${page + 1}`} className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-text-secondary hover:text-white">Next</Link>}
        </div>
      )}
    </div>
  );
}
