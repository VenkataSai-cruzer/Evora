'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-provider';
import { listPublicEvents, listMyTickets } from '@/lib/api-client';
import { formatDate, formatTime } from '@/lib/dates';
import { OrderCard } from '@/components/payments/OrderCard';

type UserState = 'no_booking' | 'has_bookings';

export default function MyEventPage() {
  const { user } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<UserState>('no_booking');

  const loadData = useCallback(async () => {
    try {
      const [eventRes, ticketsRes] = await Promise.all([
        listPublicEvents({ limit: 1, upcoming: true }),
        listMyTickets().catch(() => []),
      ]);

      if (eventRes.events.length > 0) setEvent(eventRes.events[0]);
      const tickets = ticketsRes || [];

      if (tickets.length > 0) {
        // Build unique orders from tickets
        const orderMap = new Map<string, any>();
        for (const t of tickets) {
          if (t.order?.orderNumber) {
            const orderNum = t.order.orderNumber;
            if (!orderMap.has(orderNum)) {
              orderMap.set(orderNum, {
                orderNumber: orderNum,
                status: t.order.status || 'PENDING_PAYMENT',
                total: t.ticketType?.price || 0,
                currency: 'INR',
                createdAt: t.createdAt,
                updatedAt: t.createdAt,
                ticketCount: 0,
                event: t.event ? {
                  title: t.event.title,
                  slug: t.event.slug,
                  startAt: t.event.startAt,
                  venueName: t.event.venueName,
                  posterObjectKey: t.event.posterObjectKey,
                } : undefined,
              });
            }
            const entry = orderMap.get(orderNum)!;
            entry.ticketCount++;
            // Accumulate total for multiple tickets
            entry.total = (entry.total || 0) + (t.ticketType?.price || 0);
          }
        }
        setOrders(Array.from(orderMap.values()));
        setState('has_bookings');
      } else {
        const storedOrder = sessionStorage.getItem('lastOrder');
        if (storedOrder) {
          try {
            const parsed = JSON.parse(storedOrder);
            setOrders([{
              orderNumber: parsed.orderNumber || storedOrder,
              status: 'PENDING_PAYMENT',
              total: parsed.total || 0,
              currency: 'INR',
              createdAt: parsed.createdAt || new Date().toISOString(),
              updatedAt: parsed.createdAt || new Date().toISOString(),
              ticketCount: parsed.quantity || 1,
            }]);
            setState('has_bookings');
          } catch {
            setState('no_booking');
          }
        } else {
          setState('no_booking');
        }
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-surface-elevated" />
        <div className="h-8 w-64 animate-pulse rounded bg-surface-elevated" />
        <div className="h-32 animate-pulse rounded-xl bg-surface-elevated" />
        <div className="h-32 animate-pulse rounded-xl bg-surface-elevated" />
      </div>
    );
  }

  const latestOrder = orders[0];
  const isPending = latestOrder?.status === 'PENDING_PAYMENT' || latestOrder?.status === 'PENDING_VERIFICATION';
  const isRejected = latestOrder?.status === 'REJECTED';
  const isConfirmed = latestOrder?.status === 'CONFIRMED' || latestOrder?.status === 'CHECKED_IN';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">My Event</h1>
        <p className="mt-1 text-sm text-text-secondary">Welcome back, {user?.name || 'Guest'}</p>
      </div>

      {/* Orders list */}
      {state === 'has_bookings' && orders.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs text-text-muted uppercase tracking-wider">
            Your Orders ({orders.length})
          </h3>
          {orders.map((order: any) => (
            <OrderCard
              key={order.orderNumber}
              order={order}
              verificationSlaHours={6}
            />
          ))}
        </div>
      )}

      {/* No booking state */}
      {state === 'no_booking' && (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-elevated">
            <svg className="h-8 w-8 text-text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-white">No booking yet</h2>
          <p className="mt-1 text-sm text-text-secondary max-w-md mx-auto">
            You haven&apos;t booked any events yet. Browse our events and secure your spot!
          </p>
          <Link
            href={event ? `/events/${event.slug}` : '/events'}
            className="mt-6 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
          >
            {event ? 'Book Now' : 'Browse Events'}
          </Link>
        </div>
      )}

      {/* Current Event Info */}
      {event && (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs text-text-muted uppercase tracking-wider">Current Event</h3>
              <h4 className="mt-1 text-lg font-semibold text-white">{event.title}</h4>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
          </div>
          <div className="mt-3 space-y-1 text-sm text-text-secondary">
            <p>{formatDate(event.startAt)} at {formatTime(event.startAt)}</p>
            <p>{event.venueName}</p>
          </div>
          <Link
            href={`/events/${event.slug}`}
            className="mt-4 inline-flex h-9 items-center rounded-lg bg-surface-elevated px-4 text-sm font-medium text-white hover:bg-surface-hover transition-colors"
          >
            Event Details
          </Link>
        </div>
      )}

      {/* Quick actions based on state */}
      {state === 'has_bookings' && (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
          <h3 className="text-xs text-text-muted uppercase tracking-wider mb-3">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(isPending || isRejected) && (
              <Link
                href={`/payment-status?order=${latestOrder.orderNumber}`}
                className={`rounded-lg border px-4 py-3 text-sm transition-colors text-center ${
                  isRejected
                    ? 'bg-error/10 border-error/20 text-error hover:bg-error/20'
                    : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20'
                }`}
              >
                {isRejected ? 'Resubmit Payment' : 'Submit Payment Proof'}
              </Link>
            )}
            {isConfirmed && (
              <Link
                href="/my-ticket"
                className="rounded-lg bg-success/10 border border-success/20 px-4 py-3 text-sm text-success hover:bg-success/20 transition-colors text-center"
              >
                View My Ticket
              </Link>
            )}
            <Link
              href="/announcements"
              className="rounded-lg bg-surface-elevated border border-[var(--color-border)] px-4 py-3 text-sm text-text-secondary hover:text-white hover:bg-surface-hover transition-colors text-center"
            >
              View Announcements
            </Link>
            <Link
              href="/profile"
              className="rounded-lg bg-surface-elevated border border-[var(--color-border)] px-4 py-3 text-sm text-text-secondary hover:text-white hover:bg-surface-hover transition-colors text-center"
            >
              Edit Profile
            </Link>
          </div>
        </div>
      )}

      {/* Announcements sidebar */}
      <div className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs text-text-muted uppercase tracking-wider">Announcements</h3>
          <Link href="/announcements" className="text-xs text-primary hover:text-primary-hover transition-colors">
            View all &rarr;
          </Link>
        </div>
        <p className="mt-3 text-sm text-text-secondary">
          No announcements yet. Stay tuned for updates about your event!
        </p>
      </div>
    </div>
  );
}
