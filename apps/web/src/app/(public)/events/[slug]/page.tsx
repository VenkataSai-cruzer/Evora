'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getEventBySlug } from '@/lib/api-client';
import { formatDate, formatTime } from '@/lib/dates';
import { BookingForm } from './BookingForm';

export default function EventDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    getEventBySlug(slug)
      .then(setEvent)
      .catch(() => setError('Event not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          <div className="h-10 w-3/4 rounded bg-surface-elevated" />
          <div className="h-6 w-1/2 rounded bg-surface-elevated" />
          <div className="h-40 rounded-xl bg-surface-elevated" />
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-white">Event not found</h1>
        <p className="mt-2 text-text-secondary">{error || 'This event does not exist.'}</p>
        <Link href="/events" className="mt-6 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover">
          Browse events
        </Link>
      </div>
    );
  }

  const isPaused = event.salesPaused;
  const isClosed = event.bookingClosed;
  const soldCount = event._count?.tickets || 0;
  const isSoldOut = soldCount >= event.totalCapacity;
  const canBook = event.status === 'PUBLISHED' && !isPaused && !isClosed && !isSoldOut;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* ── Header ──────────────────────────────────── */}
      <div className="mb-8">
        <Link href="/events" className="text-sm text-text-muted hover:text-white transition-colors">
          &larr; All events
        </Link>
        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white sm:text-4xl">{event.title}</h1>
            {event.shortDescription && (
              <p className="mt-2 text-lg text-text-secondary">{event.shortDescription}</p>
            )}
          </div>
          {isSoldOut && <span className="rounded-full bg-error/10 px-3 py-1 text-sm font-medium text-error">Sold out</span>}
          {isPaused && !isSoldOut && <span className="rounded-full bg-warning/10 px-3 py-1 text-sm font-medium text-warning">Sales paused</span>}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* ── Event Info ─────────────────────────────── */}
        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--color-border)] bg-surface p-4">
              <p className="text-xs text-text-muted uppercase tracking-wider">Date</p>
              <p className="mt-1 text-sm font-medium text-white">{formatDate(event.startAt)}</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-surface p-4">
              <p className="text-xs text-text-muted uppercase tracking-wider">Time</p>
              <p className="mt-1 text-sm font-medium text-white">
                {formatTime(event.startAt)}{event.endAt ? ` - ${formatTime(event.endAt)}` : ''}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-surface p-4">
              <p className="text-xs text-text-muted uppercase tracking-wider">Venue</p>
              <p className="mt-1 text-sm font-medium text-white">{event.venueName}</p>
              {event.venueAddress && (
                <p className="text-xs text-text-muted mt-0.5">{event.venueAddress}</p>
              )}
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-surface p-4">
              <p className="text-xs text-text-muted uppercase tracking-wider">Capacity</p>
              <p className="mt-1 text-sm font-medium text-white">
                {soldCount} / {event.totalCapacity} booked
              </p>
            </div>
          </div>

          {event.description && (
            <div className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">About</h3>
              <div className="mt-3 text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                {event.description}
              </div>
            </div>
          )}

          {/* ── Performers ──────────────────────────── */}
          {event.performers && event.performers.length > 0 && (
            <div className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Performers</h3>
              <div className="mt-3 space-y-3">
                {event.performers.map((performer: any) => (
                  <div key={performer.id}>
                    <p className="text-sm font-medium text-white">{performer.name}</p>
                    {performer.bio && <p className="text-xs text-text-muted mt-0.5">{performer.bio}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── FAQs ────────────────────────────────── */}
          {event.faqs && event.faqs.length > 0 && (
            <div className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">FAQs</h3>
              <div className="mt-3 space-y-4">
                {event.faqs.map((faq: any) => (
                  <div key={faq.id}>
                    <p className="text-sm font-medium text-white">{faq.question}</p>
                    <p className="text-xs text-text-muted mt-1">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Terms ────────────────────────────────── */}
          {event.terms && (
            <div className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Terms</h3>
              <p className="mt-2 text-xs text-text-muted">{event.terms}</p>
            </div>
          )}
        </div>

        {/* ── Booking Sidebar ────────────────────────── */}
        <div>
          <div className="sticky top-24">
            {(event.ticketTypes && event.ticketTypes.length > 0 && canBook) ? (
              <BookingForm event={event} />
            ) : (
              <div className="rounded-xl border border-[var(--color-border)] bg-surface p-5 text-center">
                {isSoldOut ? (
                  <>
                    <p className="text-lg font-semibold text-white">Sold Out</p>
                    <p className="mt-1 text-sm text-text-muted">All tickets have been booked.</p>
                  </>
                ) : isPaused ? (
                  <>
                    <p className="text-lg font-semibold text-warning">Sales Paused</p>
                    <p className="mt-1 text-sm text-text-muted">Booking is temporarily paused.</p>
                  </>
                ) : isClosed ? (
                  <>
                    <p className="text-lg font-semibold text-white">Booking Closed</p>
                    <p className="mt-1 text-sm text-text-muted">Booking is no longer available.</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-semibold text-white">No Tickets</p>
                    <p className="mt-1 text-sm text-text-muted">No ticket types available.</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
