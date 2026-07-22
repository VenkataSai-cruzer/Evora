'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-provider';
import { listPublicEvents, listMyTickets } from '@/lib/api-client';
import { formatDate, formatTime } from '@/lib/dates';

type UserState = 'no_booking' | 'pending_payment' | 'rejected' | 'confirmed' | 'checked_in' | 'event_completed';

export default function MyEventPage() {
  const { user } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<UserState>('no_booking');

  useEffect(() => {
    async function load() {
      try {
        const [eventRes, ticketsRes] = await Promise.all([
          listPublicEvents({ limit: 1, upcoming: true }),
          listMyTickets().catch(() => []),
        ]);

        if (eventRes.events.length > 0) setEvent(eventRes.events[0]);
        setTickets(ticketsRes || []);

        if (ticketsRes && ticketsRes.length > 0) {
          const latest = ticketsRes[0];
          const orderStatus = latest.order?.status;
          if (latest.status === 'CHECKED_IN') setState('checked_in');
          else if (latest.status === 'CONFIRMED') setState('confirmed');
          else if (orderStatus === 'FAILED' || orderStatus === 'CANCELLED') setState('rejected');
          else if (latest.status === 'PENDING_PAYMENT' || orderStatus === 'PENDING_PAYMENT') setState('pending_payment');
          else setState('pending_payment');
        } else {
          const storedOrder = sessionStorage.getItem('lastOrder');
          if (storedOrder) setState('pending_payment');
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-surface-elevated" />
        <div className="h-32 animate-pulse rounded-xl bg-surface-elevated" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">My Event</h1>
        <p className="mt-1 text-sm text-text-secondary">Welcome back, {user?.name}</p>
      </div>

      {/* ── State Card ──────────────────────────────── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-surface p-6">
        {state === 'no_booking' && (
          <div className="text-center">
            <div className="text-3xl mb-3">🎵</div>
            <h2 className="text-lg font-semibold text-white">No booking yet</h2>
            <p className="mt-1 text-sm text-text-secondary">You haven&apos;t booked any events yet.</p>
            <Link href={event ? `/events/${event.slug}` : '/events'}
              className="mt-4 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover">
              {event ? 'Book Now' : 'Browse Events'}
            </Link>
          </div>
        )}

        {state === 'pending_payment' && (
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10">
                <span className="text-warning text-lg">⏳</span>
              </div>
              <div className="text-left">
                <h2 className="text-lg font-semibold text-white">Payment Pending</h2>
                <p className="text-sm text-text-secondary">Waiting for payment confirmation</p>
              </div>
            </div>
            <p className="text-xs text-text-muted mb-4">
              Complete your payment using the instructions provided.
            </p>
            <Link href="/payment-status"
              className="inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover">
              View Payment Status
            </Link>
          </div>
        )}

        {state === 'rejected' && (
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-error/10">
                <span className="text-error text-lg">✗</span>
              </div>
              <div className="text-left">
                <h2 className="text-lg font-semibold text-white">Payment Rejected</h2>
                <p className="text-sm text-text-secondary">Your payment could not be verified</p>
              </div>
            </div>
            <p className="text-xs text-text-muted mb-4">
              The payment verification failed. Please try again with a valid payment.
            </p>
            <Link href="/payment-status"
              className="inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover">
              Retry Payment
            </Link>
          </div>
        )}

        {state === 'confirmed' && tickets.length > 0 && (
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
                <span className="text-success text-lg">✓</span>
              </div>
              <div className="text-left">
                <h2 className="text-lg font-semibold text-white">Ticket Confirmed</h2>
                <p className="text-sm text-text-secondary">Your ticket is ready</p>
              </div>
            </div>
            <Link href={`/tickets/${tickets[0].ticketNumber}`}
              className="inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover">
              View My Ticket
            </Link>
          </div>
        )}

        {state === 'checked_in' && (
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <span className="text-primary text-lg">🎉</span>
              </div>
              <div className="text-left">
                <h2 className="text-lg font-semibold text-white">You&apos;re In!</h2>
                <p className="text-sm text-text-secondary">Checked in successfully. Enjoy the event!</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Current Event Info ───────────────────────── */}
      {event && (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
          <h3 className="text-xs text-text-muted uppercase tracking-wider mb-3">Current Event</h3>
          <h4 className="text-lg font-semibold text-white">{event.title}</h4>
          <div className="mt-2 space-y-1 text-sm text-text-secondary">
            <p>{formatDate(event.startAt)} at {formatTime(event.startAt)}</p>
            <p>{event.venueName}</p>
          </div>
          <Link href={`/events/${event.slug}`}
            className="mt-3 inline-flex h-9 items-center rounded-lg bg-surface-elevated px-4 text-sm font-medium text-white hover:bg-surface-hover">
            Event Details
          </Link>
        </div>
      )}

      {/* ── Announcements ────────────────────────────── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
        <h3 className="text-xs text-text-muted uppercase tracking-wider">Announcements</h3>
        <p className="mt-2 text-sm text-text-secondary">No announcements yet. Stay tuned!</p>
        <Link href="/announcements"
          className="mt-2 inline-block text-xs text-primary hover:text-primary-hover">
          View all &rarr;
        </Link>
      </div>
    </div>
  );
}
