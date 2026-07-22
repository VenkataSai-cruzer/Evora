'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listPublicEvents } from '@/lib/api-client';
import { formatDate, formatTime } from '@/lib/dates';

export default function HomePage() {
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listPublicEvents({ limit: 1, upcoming: true })
      .then((res) => {
        if (res.events.length > 0) setEvent(res.events[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* ── Hero ────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-[var(--color-border)]">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Live music experience
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              7 NOTES
            </h1>
            <p className="mt-4 text-lg text-text-secondary sm:text-xl">
              Live music events. Book tickets, attend, and experience the moment.
            </p>
            {loading ? (
              <div className="mt-8 h-12 w-40 animate-pulse rounded-lg bg-surface-elevated" />
            ) : event ? (
              <Link
                href={`/events/${event.slug}`}
                className="mt-8 inline-flex h-12 items-center rounded-lg bg-primary px-6 text-base font-medium text-white transition-all hover:bg-primary-hover hover:-translate-y-0.5"
              >
                Book Now
              </Link>
            ) : (
              <p className="mt-8 text-sm text-text-muted">No upcoming events at this time.</p>
            )}
          </div>
        </div>
      </section>

      {/* ── Current Event ───────────────────────────── */}
      {event && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-[var(--color-border)] bg-surface p-6 sm:p-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white sm:text-3xl">{event.title}</h2>
                <p className="mt-2 text-text-secondary">{event.shortDescription}</p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-[var(--color-border)] bg-surface-elevated p-4">
                    <p className="text-xs text-text-muted uppercase tracking-wider">Date & Time</p>
                    <p className="mt-1 text-sm font-medium text-white">
                      {formatDate(event.startAt)} at {formatTime(event.startAt)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[var(--color-border)] bg-surface-elevated p-4">
                    <p className="text-xs text-text-muted uppercase tracking-wider">Venue</p>
                    <p className="mt-1 text-sm font-medium text-white">{event.venueName}</p>
                  </div>
                </div>

                {event.ticketTypes && event.ticketTypes.length > 0 && (
                  <div className="mt-6">
                    <p className="text-xs text-text-muted uppercase tracking-wider mb-3">Tickets</p>
                    <div className="space-y-2">
                      {event.ticketTypes.map((ticket: any) => (
                        <div key={ticket.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-surface-elevated p-3">
                          <span className="text-sm text-white">{ticket.name}</span>
                          <span className="text-sm font-semibold text-primary">
                            {ticket.price === 0 ? 'Free' : `₹${(ticket.price / 100).toLocaleString()}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Link
                  href={`/events/${event.slug}`}
                  className="mt-6 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
                >
                  View Event Details
                </Link>
              </div>
            </div>

            {/* ── Countdown ──────────────────────────── */}
            <div className="mt-8 border-t border-[var(--color-border)] pt-6">
              <EventCountdown targetDate={event.startAt} />
            </div>
          </div>
        </section>
      )}

      {/* ── Partners ────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-xs text-text-muted uppercase tracking-wider">Organized by</p>
          <p className="mt-2 text-lg font-semibold text-white">7 NOTES</p>
        </div>
      </section>
    </div>
  );
}

function EventCountdown({ targetDate }: { targetDate: string }) {
  const [remaining, setRemaining] = useState<{ days: number; hours: number; minutes: number } | null>(null);

  useEffect(() => {
    function calc() {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) { setRemaining(null); return; }
      setRemaining({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
      });
    }
    calc();
    const interval = setInterval(calc, 60000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (!remaining) return null;

  return (
    <div>
      <p className="text-xs text-text-muted uppercase tracking-wider mb-3">Event starts in</p>
      <div className="flex gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{remaining.days}</div>
          <div className="text-xs text-text-muted">Days</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{remaining.hours}</div>
          <div className="text-xs text-text-muted">Hours</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{remaining.minutes}</div>
          <div className="text-xs text-text-muted">Minutes</div>
        </div>
      </div>
    </div>
  );
}
