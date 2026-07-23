'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-provider';
import { api } from '@/lib/api-client';
import { formatDate, formatTime } from '@/lib/dates';
import { formatPrice } from '@/lib/format';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  PENDING_PAYMENT: { label: 'Awaiting Payment', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: '📋' },
  PENDING_VERIFICATION: { label: 'Under Review', color: 'bg-warning/10 text-warning border-warning/20', icon: '⏳' },
  CONFIRMED: { label: 'Confirmed', color: 'bg-success/10 text-success border-success/20', icon: '✅' },
  REJECTED: { label: 'Rejected', color: 'bg-error/10 text-error border-error/20', icon: '✗' },
  CANCELLED: { label: 'Cancelled', color: 'bg-surface-elevated text-text-muted border-[var(--color-border)]', icon: '🗙' },
  EXPIRED: { label: 'Expired', color: 'bg-surface-elevated text-text-muted border-[var(--color-border)]', icon: '⏰' },
};

export default function MyBookingsPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<{ orders: any[] }>('/users/me/orders');
      setOrders(res.orders || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const filtered = filter === 'all' ? orders : orders.filter((o) => {
    if (filter === 'action') return ['PENDING_PAYMENT', 'REJECTED'].includes(o.status);
    if (filter === 'pending') return o.status === 'PENDING_PAYMENT';
    if (filter === 'review') return o.status === 'PENDING_VERIFICATION';
    if (filter === 'confirmed') return o.status === 'CONFIRMED';
    if (filter === 'rejected') return o.status === 'REJECTED';
    if (filter === 'cancelled') return ['CANCELLED', 'EXPIRED'].includes(o.status);
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-surface-elevated" />
        <div className="h-8 w-72 animate-pulse rounded bg-surface-elevated" />
        {[1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-surface-elevated" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Bookings</h1>
        <div className="rounded-xl border border-error/20 bg-error/5 p-8 text-center">
          <p className="text-sm text-text-secondary">Failed to load bookings</p>
          <p className="mt-1 text-xs text-text-muted">{error}</p>
          <button onClick={loadOrders} className="mt-4 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Bookings</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {user?.name ? `Welcome back, ${user.name}` : 'View and manage your bookings'}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'All' },
          { key: 'action', label: 'Action Required' },
          { key: 'pending', label: 'Awaiting Payment' },
          { key: 'review', label: 'Under Review' },
          { key: 'confirmed', label: 'Confirmed' },
          { key: 'rejected', label: 'Rejected' },
          { key: 'cancelled', label: 'Cancelled' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f.key ? 'bg-primary text-white' : 'bg-surface-elevated text-text-secondary hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-elevated">
            <span className="text-3xl">📋</span>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-white">
            {orders.length === 0 ? 'No bookings yet' : 'No bookings match this filter'}
          </h2>
          <p className="mt-1 text-sm text-text-secondary max-w-md mx-auto">
            {orders.length === 0
              ? 'Browse our upcoming events and secure your spot!'
              : 'Try a different filter or view all bookings.'}
          </p>
          {orders.length === 0 && (
            <Link href="/events" className="mt-6 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover transition-colors">
              Browse Events
            </Link>
          )}
        </div>
      )}

      {/* Booking Cards */}
      {filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((order: any) => {
            const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.CANCELLED;
            const attendeeCount = order.attendees?.length || 0;
            const ticketCount = order.tickets?.length || 0;
            const hasTickets = ticketCount > 0;
            const isActionable = ['PENDING_PAYMENT', 'REJECTED'].includes(order.status);

            return (
              <Link
                key={order.id || order.orderNumber}
                href={`/my-bookings/${order.orderNumber}`}
                className="block rounded-xl border border-[var(--color-border)] bg-surface p-5 hover:bg-surface-hover transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{cfg.icon}</span>
                      <h3 className="text-base font-semibold text-white truncate">
                        {order.event?.title || 'Event Booking'}
                      </h3>
                    </div>
                    <p className="mt-1 text-xs text-text-muted font-mono">{order.orderNumber}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
                      {order.event?.startAt && (
                        <span>{formatDate(order.event.startAt)} at {formatTime(order.event.startAt)}</span>
                      )}
                      {order.event?.venueName && <span>{order.event.venueName}</span>}
                      <span>{formatPrice(order.total)}</span>
                      <span>{attendeeCount} attendee{attendeeCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    {hasTickets && (
                      <span className="text-xs text-success">{ticketCount} ticket{ticketCount !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>
                {isActionable && (
                  <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                    <span className="text-xs font-medium text-primary">
                      {order.status === 'PENDING_PAYMENT' ? 'Continue Payment' : 'Resubmit Proof'} &rarr;
                    </span>
                  </div>
                )}
                {order.status === 'PENDING_VERIFICATION' && (
                  <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" />
                      <span className="text-xs text-warning">Payment under review</span>
                    </div>
                  </div>
                )}
                {order.status === 'CONFIRMED' && hasTickets && (
                  <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                    <span className="text-xs text-success">Tickets available &rarr;</span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
