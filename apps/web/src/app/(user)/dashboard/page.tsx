'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-provider';
import { getUserDashboard } from '@/lib/api-client';
import { formatDate, formatTime } from '@/lib/dates';

function formatPrice(total: number): string {
  if (total === 0) return 'Free';
  return `₹${(total / 100).toLocaleString('en-IN')}`;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHrs / 24);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays === 1) return 'yesterday';
  return `${diffDays}d ago`;
}

function StatCard({
  label, value, icon, color, href,
}: {
  label: string; value: number; icon: string; color: string; href?: string;
}) {
  const content = (
    <div className="rounded-xl border border-[var(--color-border)] bg-surface p-4 hover:bg-surface-hover transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xs text-text-muted uppercase tracking-wider">{label}</p>
          <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${color.replace('text-', 'bg-').replace(' font-bold', '/10')}`}>
          <span className="text-lg">{icon}</span>
        </div>
      </div>
    </div>
  );
  if (href && value > 0) return <Link href={href}>{content}</Link>;
  return content;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  PENDING_PAYMENT: { label: 'Awaiting Payment', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: '📋' },
  PENDING_VERIFICATION: { label: 'Under Review', color: 'bg-warning/10 text-warning border-warning/20', icon: '⏳' },
  CONFIRMED: { label: 'Approved', color: 'bg-success/10 text-success border-success/20', icon: '✅' },
  REJECTED: { label: 'Rejected', color: 'bg-error/10 text-error border-error/20', icon: '✗' },
  CANCELLED: { label: 'Cancelled', color: 'bg-surface-elevated text-text-muted border-[var(--color-border)]', icon: '🗙' },
};

function Timeline({ events }: { events: Array<{ event: string; status: string; timestamp: string }> }) {
  if (!events?.length) return null;
  return (
    <div className="relative space-y-1 pl-5 mt-2">
      <div className="absolute left-[7px] top-1 bottom-1 w-0.5 bg-[var(--color-border)]" />
      {events.map((evt, i) => (
        <div key={i} className="relative flex items-start gap-2 pb-1.5 last:pb-0">
          <div className={`absolute left-[-13px] top-[5px] h-2.5 w-2.5 rounded-full border-2 ${
            evt.status === 'completed' ? 'bg-success border-success' :
            evt.status === 'rejected' ? 'bg-error border-error' :
            evt.status === 'pending' ? 'bg-warning border-warning animate-pulse' :
            'bg-surface-elevated border-[var(--color-border)]'
          }`} />
          <div className="flex-1 min-w-0">
            <p className="text-2xs text-text-secondary">{evt.event}</p>
            <p className="text-2xs text-text-muted">{timeAgo(evt.timestamp)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function UserDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getUserDashboard();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data. Please try again.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 animate-pulse rounded bg-surface-elevated" />
        <div className="h-8 w-72 animate-pulse rounded bg-surface-elevated" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-elevated" />
          ))}
        </div>
        <div className="h-40 animate-pulse rounded-xl bg-surface-elevated" />
        <div className="h-40 animate-pulse rounded-xl bg-surface-elevated" />
      </div>
    );
  }

  // Error state — distinct from empty state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-text-secondary">Welcome back, {user?.name || 'Guest'}</p>
        </div>
        <div className="rounded-xl border border-error/20 bg-error/5 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-error/10">
            <svg className="h-7 w-7 text-error" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <p className="mt-3 text-sm text-text-secondary">Failed to load dashboard</p>
          <p className="mt-1 text-xs text-text-muted max-w-md mx-auto">{error}</p>
          <button
            onClick={loadDashboard}
            className="mt-4 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { orders = [], tickets = [], upcomingEvents = [], pastEvents = [], stats = {
    pendingPayments: 0, approvedPayments: 0, rejectedPayments: 0, activeTickets: 0, totalOrders: 0,
  } } = data || {};

  const hasOrders = orders.length > 0;
  const hasTickets = tickets.length > 0;
  const hasUpcomingEvents = upcomingEvents.length > 0;
  const hasPastEvents = pastEvents.length > 0;
  const hasAnyData = hasOrders || hasTickets || hasUpcomingEvents || hasPastEvents;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Welcome back, {user?.name || 'Guest'}
        </p>
      </div>

      {/* Stats Cards */}
      {hasOrders && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Pending" value={stats.pendingPayments} icon="⏳" color="text-warning font-bold" href={stats.pendingPayments > 0 ? '/payment-status' : undefined} />
          <StatCard label="Approved" value={stats.approvedPayments} icon="✅" color="text-success font-bold" />
          <StatCard label="Rejected" value={stats.rejectedPayments} icon="✗" color="text-error font-bold" href={stats.rejectedPayments > 0 ? '/payment-status' : undefined} />
          <StatCard label="Active Tickets" value={stats.activeTickets} icon="🎫" color="text-primary font-bold" href={stats.activeTickets > 0 ? '/my-ticket' : undefined} />
        </div>
      )}

      {/* Empty State */}
      {!hasAnyData && (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-elevated">
            <svg className="h-8 w-8 text-text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-white">No bookings yet</h2>
          <p className="mt-1 text-sm text-text-secondary max-w-md mx-auto">
            You haven&apos;t booked any events yet. Browse our upcoming events and secure your spot!
          </p>
          <Link href="/events" className="mt-6 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover transition-colors">
            Browse Events
          </Link>
        </div>
      )}

      {/* Orders */}
      {orders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs text-text-muted uppercase tracking-wider">Orders ({orders.length})</h3>
            <Link href="/payment-status" className="text-xs text-primary hover:text-primary-hover transition-colors">View all &rarr;</Link>
          </div>
          <div className="space-y-2">
            {orders.map((order: any) => {
              const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.CANCELLED;
              const isActionable = order.status === 'PENDING_PAYMENT' || order.status === 'PENDING_VERIFICATION' || order.status === 'REJECTED';
              return (
                <div key={order.id} className="rounded-xl border border-[var(--color-border)] bg-surface p-4 hover:bg-surface-hover transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{cfg.icon}</span>
                        <div>
                          <p className="text-sm font-semibold text-white">{order.event?.title || 'Event Booking'}</p>
                          <p className="text-xs text-text-muted font-mono mt-0.5">{order.orderNumber}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-2xs text-text-muted">
                        {order.event?.startAt && <span>{formatDate(order.event.startAt)} at {formatTime(order.event.startAt)}</span>}
                        {order.event?.venueName && <span>{order.event.venueName}</span>}
                        <span>{formatPrice(order.total)}</span>
                        <span>{order.attendees?.length || 0} ticket{(order.attendees?.length || 0) !== 1 ? 's' : ''}</span>
                        <span>{timeAgo(order.createdAt)}</span>
                      </div>
                      {/* Verification Timeline */}
                      {order.timeline && order.timeline.length > 0 && (
                        <Timeline events={order.timeline} />
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-2xs font-medium ${cfg.color}`}>{cfg.label}</span>
                      {isActionable && (
                        <Link href={`/payment-status?order=${order.orderNumber}`} className="text-2xs text-primary hover:text-primary-hover transition-colors">
                          {order.status === 'REJECTED' ? 'Resubmit &rarr;' : 'View Details &rarr;'}
                        </Link>
                      )}
                      {order.status === 'CONFIRMED' && order.tickets?.length > 0 && (
                        <Link href={`/tickets/${order.tickets[0].ticketNumber}`} className="text-2xs text-success hover:text-success/80 transition-colors">
                          View Ticket &rarr;
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Tickets */}
      {tickets.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs text-text-muted uppercase tracking-wider">My Tickets ({tickets.length})</h3>
            <Link href="/my-ticket" className="text-xs text-primary hover:text-primary-hover transition-colors">View all &rarr;</Link>
          </div>
          <div className="space-y-2">
            {tickets.slice(0, 5).map((ticket: any) => (
              <Link key={ticket.id} href={`/tickets/${ticket.ticketNumber}`}
                className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-surface p-3 hover:bg-surface-hover transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                    <span className="text-sm">🎫</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{ticket.event?.title}</p>
                    <p className="text-xs text-text-muted">{ticket.ticketType?.name} &middot; {ticket.ticketNumber}</p>
                    {ticket.event?.startAt && (
                      <p className="text-2xs text-text-muted mt-0.5">{formatDate(ticket.event.startAt)} &middot; {ticket.event.venueName}</p>
                    )}
                  </div>
                </div>
                <span className={`text-2xs font-medium ${ticket.status === 'CONFIRMED' ? 'text-success' : ticket.status === 'CHECKED_IN' ? 'text-primary' : ticket.status === 'CANCELLED' ? 'text-error' : 'text-text-muted'}`}>
                  {ticket.status === 'CHECKED_IN' ? 'CHECKED IN' : ticket.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Events */}
      {hasUpcomingEvents && (
        <div className="space-y-3">
          <h3 className="text-xs text-text-muted uppercase tracking-wider">Upcoming Events</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {upcomingEvents.map((event: any) => (
              <Link key={event.id} href={`/events/${event.slug}`}
                className="rounded-xl border border-[var(--color-border)] bg-surface p-4 hover:bg-surface-hover transition-colors">
                <p className="text-sm font-semibold text-white">{event.title}</p>
                <p className="mt-1 text-xs text-text-muted">{formatDate(event.startAt)} at {formatTime(event.startAt)}</p>
                {event.venueName && <p className="text-xs text-text-muted mt-0.5">{event.venueName}</p>}
                {event.shortDescription && <p className="text-xs text-text-muted mt-1.5 line-clamp-2">{event.shortDescription}</p>}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Past Events */}
      {hasPastEvents && (
        <div className="space-y-3">
          <h3 className="text-xs text-text-muted uppercase tracking-wider">Past Events</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pastEvents.map((event: any) => (
              <div key={event.id} className="rounded-xl border border-[var(--color-border)] bg-surface p-4 opacity-70">
                <p className="text-sm font-semibold text-white">{event.title}</p>
                <p className="mt-1 text-xs text-text-muted">{formatDate(event.startAt)} &middot; {event.venueName}</p>
                <span className="mt-1.5 inline-flex items-center rounded-full bg-surface-elevated px-2 py-0.5 text-2xs text-text-muted">Past</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link href="/payment-status" className="rounded-lg border border-[var(--color-border)] bg-surface-elevated px-4 py-3 text-xs font-medium text-text-secondary hover:text-white hover:bg-surface-hover transition-colors text-center">📋 Payment Status</Link>
        <Link href="/my-ticket" className="rounded-lg border border-[var(--color-border)] bg-surface-elevated px-4 py-3 text-xs font-medium text-text-secondary hover:text-white hover:bg-surface-hover transition-colors text-center">🎫 My Tickets</Link>
        <Link href="/profile" className="rounded-lg border border-[var(--color-border)] bg-surface-elevated px-4 py-3 text-xs font-medium text-text-secondary hover:text-white hover:bg-surface-hover transition-colors text-center">👤 Profile</Link>
        <Link href="/events" className="rounded-lg border border-[var(--color-border)] bg-surface-elevated px-4 py-3 text-xs font-medium text-text-secondary hover:text-white hover:bg-surface-hover transition-colors text-center">📅 Browse Events</Link>
      </div>
    </div>
  );
}
