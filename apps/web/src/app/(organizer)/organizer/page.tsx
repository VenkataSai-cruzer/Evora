'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';

interface OrganizerStats {
  totalEvents: number;
  liveEvents: number;
  pausedEvents: number;
  totalOrders: number;
  confirmedOrders: number;
  totalTickets: number;
  checkedInTickets: number;
  pendingVerifications: number;
}

export default function OrganizerOverviewPage() {
  const [stats, setStats] = useState<OrganizerStats | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, eventsRes] = await Promise.allSettled([
          api.get<OrganizerStats>('/organizer/stats'),
          api.get<{ events: any[] }>('/organizer/events?limit=5'),
        ]);
        if (statsRes.status === 'fulfilled') setStats(statsRes.value);
        if (eventsRes.status === 'fulfilled') setEvents(eventsRes.value.events || []);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return <div className="h-32 animate-pulse rounded-xl bg-surface-elevated" />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Organizer Overview</h1>
        <p className="mt-1 text-sm text-text-secondary">Your assigned events and performance</p>
      </div>

      {/* ── Stats ────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-4">
          <p className="text-xs text-text-muted uppercase tracking-wider">My Events</p>
          <p className="mt-1 text-2xl font-bold text-white">{stats?.totalEvents ?? 0}</p>
          <p className="mt-0.5 text-xs text-text-muted">{stats?.liveEvents ?? 0} live</p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-4">
          <p className="text-xs text-text-muted uppercase tracking-wider">Orders</p>
          <p className="mt-1 text-2xl font-bold text-white">{stats?.totalOrders ?? 0}</p>
          <p className="mt-0.5 text-xs text-text-muted">{stats?.confirmedOrders ?? 0} confirmed</p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-4">
          <p className="text-xs text-text-muted uppercase tracking-wider">Tickets Issued</p>
          <p className="mt-1 text-2xl font-bold text-white">{stats?.totalTickets ?? 0}</p>
          <p className="mt-0.5 text-xs text-text-muted">{stats?.checkedInTickets ?? 0} checked in</p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-4">
          <p className="text-xs text-text-muted uppercase tracking-wider">Pending Verifications</p>
          <p className={`mt-1 text-2xl font-bold ${(stats?.pendingVerifications ?? 0) > 0 ? 'text-warning' : 'text-white'}`}>
            {stats?.pendingVerifications ?? 0}
          </p>
        </div>
      </div>

      {/* ── My Events ───────────────────────────────── */}
      {events.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">My Events</h2>
            <Link href="/organizer/events" className="text-sm text-primary hover:text-primary-hover">View all</Link>
          </div>
          <div className="space-y-2">
            {events.map((ev: any) => (
              <Link key={ev.id} href={`/organizer/events/${ev.id}`}
                className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-surface p-4 hover:bg-surface-hover transition-colors">
                <div>
                  <p className="text-sm font-medium text-white">{ev.title}</p>
                  <p className="text-xs text-text-muted mt-0.5">{ev.venueName}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-muted">
                    {ev._count?.orders || 0} orders
                  </span>
                  <span className="text-xs font-medium text-white bg-surface-elevated rounded-full px-2.5 py-0.5">
                    {ev.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {events.length === 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-12 text-center">
          <p className="text-text-muted">You are not assigned to any events yet.</p>
          <Link href="/organizer/events" className="mt-4 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover">
            View Events
          </Link>
        </div>
      )}
    </div>
  );
}
