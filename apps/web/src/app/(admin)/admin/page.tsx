'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listAdminEvents, listContactRequests } from '@/lib/api-client';

export default function AdminOverviewPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [eRes, cRes] = await Promise.all([
          listAdminEvents({ limit: 5 }),
          listContactRequests({}),
        ]);
        setEvents(eRes.events || []);
        setMessages(cRes.messages || []);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return <div className="animate-pulse h-32 rounded-xl bg-surface-elevated" />;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Admin</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
          <div className="text-2xl font-bold text-white">{events.length}</div>
          <div className="mt-1 text-xs text-text-muted">Active Events</div>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
          <div className="text-2xl font-bold text-white">{messages.filter(m => !m.isRead).length}</div>
          <div className="mt-1 text-xs text-text-muted">Unread Messages</div>
        </div>
      </div>

      {events.length > 0 && (
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Recent Events</h2>
            <Link href="/admin/events" className="text-sm text-primary">View all</Link>
          </div>
          <div className="mt-4 space-y-2">
            {events.map(event => (
              <Link key={event.id} href={`/admin/events/${event.id}`}
                className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-surface p-4 hover:bg-surface-hover">
                <span className="text-sm font-medium text-white">{event.title}</span>
                <span className="text-xs text-text-muted">{event.status}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {messages.filter(m => !m.isRead).length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-white">Recent Messages</h2>
          <div className="mt-4 space-y-2">
            {messages.slice(0, 3).map(msg => (
              <div key={msg.id} className="rounded-lg border border-[var(--color-border)] bg-surface p-4">
                <p className="text-sm font-medium text-white">{msg.subject}</p>
                <p className="text-xs text-text-muted">{msg.email}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
