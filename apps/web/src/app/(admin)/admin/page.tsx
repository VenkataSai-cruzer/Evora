'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listAdminEvents, listContactRequests } from '@/lib/api-client';
import { formatDate } from '@/lib/dates';

export default function AdminOverviewPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [eRes, cRes] = await Promise.allSettled([
          listAdminEvents({ limit: 5 }),
          listContactRequests({}),
        ]);
        if (eRes.status === 'fulfilled') setEvents(eRes.value.events || []);
        if (cRes.status === 'fulfilled') setMessages(cRes.value.messages || []);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return <div className="h-32 animate-pulse rounded-xl bg-surface-elevated" />;

  const activeEvents = events.filter(e => e.status === 'PUBLISHED').length;
  const totalOrders = events.reduce((sum, e) => sum + (e._count?.orders || 0), 0);
  const totalTickets = events.reduce((sum, e) => sum + (e._count?.tickets || 0), 0);
  const unreadMessages = messages.filter(m => !m.isRead).length;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Admin Overview</h1>

      {/* ── Stats ────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-4">
          <p className="text-xs text-text-muted uppercase tracking-wider">Active Events</p>
          <p className="mt-1 text-2xl font-bold text-white">{activeEvents}</p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-4">
          <p className="text-xs text-text-muted uppercase tracking-wider">Total Orders</p>
          <p className="mt-1 text-2xl font-bold text-white">{totalOrders}</p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-4">
          <p className="text-xs text-text-muted uppercase tracking-wider">Tickets Issued</p>
          <p className="mt-1 text-2xl font-bold text-white">{totalTickets}</p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-4">
          <p className="text-xs text-text-muted uppercase tracking-wider">Unread Messages</p>
          <p className="mt-1 text-2xl font-bold text-white">{unreadMessages}</p>
        </div>
      </div>

      {/* ── Quick Actions ────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/verifications" className="rounded-xl border border-[var(--color-border)] bg-surface p-4 hover:bg-surface-hover transition-colors">
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

      {/* ── Recent Events ────────────────────────────── */}
      {events.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Events</h2>
            <Link href="/admin/events" className="text-sm text-primary hover:text-primary-hover">View all</Link>
          </div>
          <div className="space-y-2">
            {events.map(event => (
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

      {/* ── Recent Messages ──────────────────────────── */}
      {messages.filter(m => !m.isRead).length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Recent Messages</h2>
          <div className="space-y-2">
            {messages.slice(0, 5).map(msg => (
              <div key={msg.id} className="rounded-lg border border-[var(--color-border)] bg-surface p-4">
                <p className="text-sm font-medium text-white">{msg.subject || 'No subject'}</p>
                <p className="text-xs text-text-muted">{msg.email} &middot; {msg.name}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
