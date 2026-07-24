'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { listAdminEvents } from '@/lib/api-client';
import { formatDate } from '@/lib/dates';

interface AdminStats {
  events: {
    total: number;
    draft: number;
    published: number;
    completed: number;
    cancelled: number;
  };
  orders: {
    total: number;
    pendingPayment: number;
    pendingVerification: number;
    confirmed: number;
    rejected: number;
  };
  tickets: {
    total: number;
    checkedIn: number;
  };
  messages: {
    unread: number;
  };
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, eventsRes] = await Promise.allSettled([
          api.get<AdminStats>('/admin/stats'),
          listAdminEvents({ limit: 5 }),
        ]);
        if (statsRes.status === 'fulfilled') setStats(statsRes.value);
        if (eventsRes.status === 'fulfilled') setRecentEvents(eventsRes.value.events || []);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return <div className="h-32 animate-pulse rounded-xl bg-surface-elevated" />;

  const pendingReview = (stats?.orders.pendingPayment ?? 0) + (stats?.orders.pendingVerification ?? 0);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Admin Overview</h1>

      {/* ── Stats ────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-4">
          <p className="text-xs text-text-muted uppercase tracking-wider">Active Events</p>
          <p className="mt-1 text-2xl font-bold text-white">{stats?.events.published ?? 0}</p>
          <p className="mt-0.5 text-xs text-text-muted">{stats?.events.total ?? 0} total</p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-4">
          <p className="text-xs text-text-muted uppercase tracking-wider">Pending Review</p>
          <p className={`mt-1 text-2xl font-bold ${pendingReview > 0 ? 'text-warning' : 'text-white'}`}>
            {pendingReview}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            {stats?.orders.pendingPayment ?? 0} awaiting payment · {stats?.orders.pendingVerification ?? 0} under review
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-4">
          <p className="text-xs text-text-muted uppercase tracking-wider">Tickets Issued</p>
          <p className="mt-1 text-2xl font-bold text-white">{stats?.tickets.total ?? 0}</p>
          <p className="mt-0.5 text-xs text-text-muted">{stats?.tickets.checkedIn ?? 0} checked in</p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-4">
          <p className="text-xs text-text-muted uppercase tracking-wider">Orders Approved</p>
          <p className="mt-1 text-2xl font-bold text-success">{stats?.orders.confirmed ?? 0}</p>
          <p className="mt-0.5 text-xs text-text-muted">{stats?.orders.rejected ?? 0} rejected</p>
        </div>
      </div>

      {/* ── Payment Alert ─────────────────────────────── */}
      {pendingReview > 0 && (
        <Link
          href="/admin/orders"
          className="flex items-center justify-between rounded-xl border border-warning/20 bg-warning/5 p-4 hover:bg-warning/10 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning/20">
              <div className="h-2 w-2 rounded-full bg-warning animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-medium text-warning">
                {pendingReview} payment{pendingReview !== 1 ? 's' : ''} need review
              </p>
              <p className="text-xs text-text-muted">
                {stats?.orders.pendingVerification ?? 0} proof{(stats?.orders.pendingVerification ?? 0) !== 1 ? 's' : ''} submitted, awaiting approval
              </p>
            </div>
          </div>
          <span className="text-xs text-warning">Review →</span>
        </Link>
      )}

      {/* ── Quick Actions ────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/orders" className="rounded-xl border border-[var(--color-border)] bg-surface p-4 hover:bg-surface-hover transition-colors">
          <p className="text-sm font-medium text-white">Payments</p>
          <p className="text-xs text-text-muted mt-1">Verify pending payments</p>
        </Link>
        <Link href="/admin/check-in" className="rounded-xl border border-[var(--color-border)] bg-surface p-4 hover:bg-surface-hover transition-colors">
          <p className="text-sm font-medium text-white">Check-in</p>
          <p className="text-xs text-text-muted mt-1">Scan tickets at venue</p>
        </Link>
        <Link href="/admin/events" className="rounded-xl border border-[var(--color-border)] bg-surface p-4 hover:bg-surface-hover transition-colors">
          <p className="text-sm font-medium text-white">Events</p>
          <p className="text-xs text-text-muted mt-1">Manage events</p>
        </Link>
        <Link href="/admin/announcements" className="rounded-xl border border-[var(--color-border)] bg-surface p-4 hover:bg-surface-hover transition-colors">
          <p className="text-sm font-medium text-white">Announcements</p>
          <p className="text-xs text-text-muted mt-1">Send updates</p>
        </Link>
      </div>

      {/* ── Order Summary ─────────────────────────────── */}
      {stats && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--color-border)] bg-surface p-4">
            <p className="text-xs text-text-muted uppercase tracking-wider">Total Orders</p>
            <p className="mt-1 text-xl font-bold text-white">{stats.orders.total}</p>
          </div>
          <div className="rounded-xl border border-success/20 bg-success/5 p-4">
            <p className="text-xs text-success uppercase tracking-wider">Approved</p>
            <p className="mt-1 text-xl font-bold text-success">{stats.orders.confirmed}</p>
          </div>
          <div className="rounded-xl border border-error/20 bg-error/5 p-4">
            <p className="text-xs text-error uppercase tracking-wider">Rejected</p>
            <p className="mt-1 text-xl font-bold text-error">{stats.orders.rejected}</p>
          </div>
        </div>
      )}

      {/* ── Recent Events ────────────────────────────── */}
      {recentEvents.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Events</h2>
            <Link href="/admin/events" className="text-sm text-primary hover:text-primary-hover">View all</Link>
          </div>
          <div className="space-y-2">
            {recentEvents.map(event => (
              <Link key={event.id} href={`/admin/events/${event.id}`}
                className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-surface p-4 hover:bg-surface-hover transition-colors">
                <div>
                  <p className="text-sm font-medium text-white">{event.title}</p>
                  <p className="text-xs text-text-muted mt-0.5">{formatDate(event.startAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-muted">{event._count?.orders || 0} orders</span>
                  <span className="text-xs font-medium text-white bg-surface-elevated rounded-full px-2.5 py-0.5">{event.status}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
