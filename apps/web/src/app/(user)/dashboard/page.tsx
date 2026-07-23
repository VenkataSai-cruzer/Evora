'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-provider';
import { api } from '@/lib/api-client';
import { formatDate, formatTime } from '@/lib/dates';

interface AttendeeOverview {
  summary: {
    upcomingBookings: number;
    actionRequired: number;
    availableTickets: number;
    pastEvents: number;
  };
  actions: Array<{
    orderNumber: string;
    eventName: string;
    status: string;
    action: 'CONTINUE_PAYMENT' | 'RESUBMIT_PROOF' | 'UNDER_REVIEW';
    expiresAt: string | null;
  }>;
  upcomingBookings: any[];
  totalOrders: number;
}

const ACTION_LABEL: Record<string, string> = {
  CONTINUE_PAYMENT: 'Continue Payment',
  RESUBMIT_PROOF: 'Resubmit Proof',
  UNDER_REVIEW: 'View Details',
};

const ACTION_HREF: Record<string, string> = {
  CONTINUE_PAYMENT: '/my-bookings/',
  RESUBMIT_PROOF: '/my-bookings/',
  UNDER_REVIEW: '/my-bookings/',
};

function MetricCard({ label, value, icon, href }: { label: string; value: number; icon: string; href?: string }) {
  const content = (
    <div className="rounded-xl border border-[var(--color-border)] bg-surface p-4 hover:bg-surface-hover transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wider">{label}</p>
          <p className={`mt-1 text-2xl font-bold ${value > 0 ? 'text-white' : 'text-text-muted'}`}>{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-elevated">
          <span className="text-lg">{icon}</span>
        </div>
      </div>
    </div>
  );
  if (href && value > 0) return <Link href={href}>{content}</Link>;
  return content;
}

export default function AttendeeOverviewPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AttendeeOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<AttendeeOverview>('/users/me/overview');
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load overview');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 animate-pulse rounded bg-surface-elevated" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-elevated" />)}
        </div>
        <div className="h-32 animate-pulse rounded-xl bg-surface-elevated" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <div className="rounded-xl border border-error/20 bg-error/5 p-8 text-center">
          <p className="text-sm text-text-secondary">Failed to load overview</p>
          <p className="mt-1 text-xs text-text-muted">{error}</p>
          <button onClick={loadOverview} className="mt-4 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const summary = data?.summary;
  const actions = data?.actions || [];
  const upcoming = data?.upcomingBookings || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="mt-1 text-sm text-text-secondary">Welcome back, {user?.name || 'Guest'}</p>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Upcoming" value={summary?.upcomingBookings || 0} icon="📅" href={summary?.upcomingBookings && summary.upcomingBookings > 0 ? '/my-bookings' : undefined} />
          <MetricCard label="Action Needed" value={summary?.actionRequired || 0} icon="⚡" href={summary?.actionRequired && summary.actionRequired > 0 ? '/my-bookings' : undefined} />
          <MetricCard label="Tickets" value={summary?.availableTickets || 0} icon="🎫" href={summary?.availableTickets && summary.availableTickets > 0 ? '/tickets' : undefined} />
          <MetricCard label="Past Events" value={summary?.pastEvents || 0} icon="📋" href={summary?.pastEvents && summary.pastEvents > 0 ? '/my-bookings' : undefined} />
        </div>
      )}

      {/* Action Required */}
      {actions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs text-text-muted uppercase tracking-wider">Action Required</h3>
          <div className="space-y-2">
            {actions.map((action) => (
              <Link
                key={action.orderNumber}
                href={`${ACTION_HREF[action.action]}${action.orderNumber}`}
                className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-surface p-4 hover:bg-surface-hover transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0 ${
                    action.action === 'CONTINUE_PAYMENT' ? 'bg-blue-500/10' :
                    action.action === 'RESUBMIT_PROOF' ? 'bg-error/10' : 'bg-warning/10'
                  }`}>
                    <span className="text-lg">
                      {action.action === 'CONTINUE_PAYMENT' ? '📋' :
                       action.action === 'RESUBMIT_PROOF' ? '✗' : '⏳'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{action.eventName}</p>
                    <p className="text-xs text-text-muted">
                      {action.action === 'CONTINUE_PAYMENT' && 'Payment pending — complete before deadline'}
                      {action.action === 'RESUBMIT_PROOF' && 'Payment rejected — resubmit your proof'}
                      {action.action === 'UNDER_REVIEW' && 'Payment under review'}
                    </p>
                    {action.expiresAt && (
                      <p className="text-xs text-warning mt-0.5">
                        Expires {new Date(action.expiresAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-xs text-primary font-medium flex-shrink-0">
                  {ACTION_LABEL[action.action]} &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Bookings */}
      {upcoming.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs text-text-muted uppercase tracking-wider">Upcoming Bookings</h3>
            <Link href="/my-bookings" className="text-xs text-primary hover:text-primary-hover transition-colors">
              View all &rarr;
            </Link>
          </div>
          <div className="space-y-2">
            {upcoming.slice(0, 3).map((booking: any) => (
              <Link
                key={booking.orderNumber}
                href={`/my-bookings/${booking.orderNumber}`}
                className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-surface p-4 hover:bg-surface-hover transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10 flex-shrink-0">
                    <span className="text-lg">✅</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{booking.event?.title || 'Event'}</p>
                    <p className="text-xs text-text-muted">
                      {booking.event?.startAt ? `${formatDate(booking.event.startAt)} at ${formatTime(booking.event.startAt)}` : ''}
                      {booking.event?.venueName ? ` · ${booking.event.venueName}` : ''}
                    </p>
                    <p className="text-xs text-text-muted font-mono mt-0.5">{booking.orderNumber}</p>
                  </div>
                </div>
                <span className="inline-flex items-center rounded-full border border-success/20 bg-success/10 px-2 py-0.5 text-xs text-success font-medium flex-shrink-0">
                  Confirmed
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {data?.totalOrders === 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-elevated">
            <span className="text-3xl">🎫</span>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-white">No bookings yet</h2>
          <p className="mt-1 text-sm text-text-secondary max-w-md mx-auto">
            Browse our upcoming events and secure your spot!
          </p>
          <Link href="/events" className="mt-6 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover transition-colors">
            Browse Events
          </Link>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link href="/my-bookings" className="rounded-lg border border-[var(--color-border)] bg-surface-elevated px-4 py-3 text-xs font-medium text-text-secondary hover:text-white hover:bg-surface-hover transition-colors text-center">
          📋 Bookings
        </Link>
        <Link href="/tickets" className="rounded-lg border border-[var(--color-border)] bg-surface-elevated px-4 py-3 text-xs font-medium text-text-secondary hover:text-white hover:bg-surface-hover transition-colors text-center">
          🎫 Tickets
        </Link>
        <Link href="/profile" className="rounded-lg border border-[var(--color-border)] bg-surface-elevated px-4 py-3 text-xs font-medium text-text-secondary hover:text-white hover:bg-surface-hover transition-colors text-center">
          👤 Account
        </Link>
        <Link href="/events" className="rounded-lg border border-[var(--color-border)] bg-surface-elevated px-4 py-3 text-xs font-medium text-text-secondary hover:text-white hover:bg-surface-hover transition-colors text-center">
          📅 Browse Events
        </Link>
      </div>
    </div>
  );
}
