// v2 — deployed via GitHub Actions auto-deploy
// Frontend: https://evora.7notes.workers.dev
// Backend:  https://seven-notes-api.onrender.com

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/dates';
import { listPublicEvents } from '@/lib/api-client';

export default async function HomePage() {
  const { events } = await listPublicEvents({ upcoming: true, limit: 4 });

  const totalEvents = events.length;
  const totalTickets = events.reduce((sum, e) => sum + e._count.tickets, 0);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative flex min-h-[80vh] items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent" />
          <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[100px]" />
        </div>

        <div className="page-container relative z-10 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary-light">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            {events.length > 0
              ? `${events.length} upcoming ${events.length === 1 ? 'session' : 'sessions'}`
              : 'Live music community'}
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl">
            Where Music Happens
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-text-secondary">
            Discover, book, and jam with Austin&apos;s best musicians. From spontaneous sessions to organized nights.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/events"
              className="group rounded-lg bg-primary px-6 py-3 font-medium text-white transition-all hover:bg-primary-hover hover:-translate-y-0.5"
            >
              Browse Events
              <span className="ml-1.5 inline-block transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
            <Link
              href="/about"
              className="rounded-lg border border-[var(--color-border)] px-6 py-3 font-medium text-text-secondary transition-all hover:bg-surface-hover"
            >
              About Jamming
            </Link>
          </div>
        </div>
      </section>

      {/* Upcoming Events Preview */}
      <section className="page-container py-16">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Upcoming Jams</h2>
          <Link
            href="/events"
            className="text-sm font-medium text-primary transition-colors hover:text-primary-hover"
          >
            View all
            <span className="ml-1">→</span>
          </Link>
        </div>

        {events.length > 0 ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {events.map((event) => {
              const spotsLeft = event.totalCapacity - event._count.tickets;
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
                    <h3 className="font-semibold text-white transition-colors group-hover:text-primary">
                      {event.title}
                    </h3>
                    <p className="mt-1 text-sm text-text-secondary">
                      {event.venueName} &bull; {formatDate(event.startAt)}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <Badge variant={isFree ? 'success' : 'primary'} size="sm">
                        {isFree ? 'Free' : `₹${(minPrice / 100).toFixed(0)}`}
                      </Badge>
                      <span className="text-xs text-text-muted">
                        {spotsLeft > 0 ? `${spotsLeft} left` : 'Full'}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="mt-8 rounded-xl border border-[var(--color-border)] bg-surface p-12">
            <EmptyState
              icon="🎵"
              title="No upcoming events"
              description="There are no events scheduled yet. Check back later for new jamming sessions."
              actionHref={{ label: 'Browse Events', href: '/events' }}
            />
          </div>
        )}
      </section>

      {/* Stats */}
      <section className="border-t border-[var(--color-border)] bg-surface/50">
        <div className="page-container grid grid-cols-2 gap-8 py-12 sm:grid-cols-4">
          {[
            { value: totalEvents > 0 ? `${totalEvents}` : '0', label: 'Events Hosted' },
            { value: '0', label: 'Musicians' },
            { value: totalEvents > 0 ? `${totalEvents}` : '0', label: 'Venues' },
            { value: totalTickets > 0 ? `${totalTickets}` : '0', label: 'Tickets Issued' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="mt-1 text-xs text-text-muted">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="page-container py-16">
        <h2 className="section-title text-center">How It Works</h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: '🎵', title: 'Find', desc: 'Browse upcoming jamming sessions near you' },
            { icon: '🎫', title: 'Book', desc: 'Grab your free ticket in one click' },
            { icon: '🎸', title: 'Jam', desc: 'Show up, scan your QR, and play' },
            { icon: '📸', title: 'Share', desc: 'Connect with musicians and share the experience' },
          ].map((step) => (
            <div key={step.title} className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-elevated">
                <span className="text-2xl">{step.icon}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">{step.title}</h3>
              <p className="mt-2 text-sm text-text-secondary">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[var(--color-border)] py-16">
        <div className="page-container text-center">
          <h2 className="text-3xl font-bold text-white">Ready to jam?</h2>
          <p className="mx-auto mt-2 max-w-md text-text-secondary">
            Join Austin&apos;s music community. Create an account and start booking sessions today.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/auth/register"
              className="rounded-lg bg-primary px-6 py-3 font-medium text-white transition-all hover:bg-primary-hover hover:-translate-y-0.5"
            >
              Get started
            </Link>
            <Link
              href="/events"
              className="rounded-lg border border-[var(--color-border)] px-6 py-3 font-medium text-text-secondary transition-all hover:bg-surface-hover"
            >
              Browse events
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
