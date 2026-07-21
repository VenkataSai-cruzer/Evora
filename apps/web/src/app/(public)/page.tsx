export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { listPublicEvents } from '@/lib/api-client';
import { formatDate } from '@/lib/dates';

export default async function HomePage() {
  const { events } = await listPublicEvents({ upcoming: true, limit: 6 });
  const currentEvent = events[0] || null;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative flex min-h-[80vh] items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />
        <div className="page-container relative z-10 text-center">
          <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl">
            7 NOTES
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-text-secondary">
            Live music events. Book your spot for the next session.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link href="/events"
              className="rounded-lg bg-primary px-6 py-3 font-medium text-white transition-all hover:bg-primary-hover hover:-translate-y-0.5">
              Browse events &rarr;
            </Link>
            {currentEvent && (
              <Link href={`/events/${currentEvent.slug}`}
                className="rounded-lg border border-[var(--color-border)] px-6 py-3 font-medium text-text-secondary transition-all hover:bg-surface-hover">
                Current event
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Current Event */}
      {currentEvent && (
        <section className="page-container pb-16">
          <Link
            href={`/events/${currentEvent.slug}`}
            className="group block overflow-hidden rounded-2xl border border-[var(--color-border)] bg-gradient-to-r from-primary/5 to-transparent p-8 transition-all hover:bg-primary/10"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-widest text-primary">Current Event</span>
                <h2 className="mt-2 text-2xl font-bold text-white group-hover:text-primary transition-colors">{currentEvent.title}</h2>
                <p className="mt-1 text-text-secondary">{formatDate(currentEvent.startAt)} &middot; {currentEvent.venueName}</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white">
                Book tickets
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </span>
            </div>
          </Link>
        </section>
      )}

      {/* Upcoming Events */}
      {events.length > 1 && (
        <section className="page-container pb-16">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Upcoming events</h2>
            <Link href="/events" className="text-sm text-primary hover:text-primary-hover">View all &rarr;</Link>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.slice(1).map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.slug}`}
                className="group rounded-xl border border-[var(--color-border)] bg-surface p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <h3 className="font-semibold text-white group-hover:text-primary transition-colors">{event.title}</h3>
                <p className="mt-1 text-sm text-text-secondary">{formatDate(event.startAt)}</p>
                <p className="text-sm text-text-muted">{event.venueName}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="border-t border-[var(--color-border)] py-16">
        <div className="page-container text-center">
          <h2 className="text-3xl font-bold text-white">Ready for your next event?</h2>
          <p className="mx-auto mt-2 max-w-md text-text-secondary">Register and start booking tickets.</p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link href="/auth/register" className="rounded-lg bg-primary px-6 py-3 font-medium text-white hover:bg-primary-hover">Get started</Link>
            <Link href="/events" className="rounded-lg border border-[var(--color-border)] px-6 py-3 font-medium text-text-secondary hover:bg-surface-hover">Browse events</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
