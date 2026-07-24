'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import Link from 'next/link';

interface Ticket {
  id: string;
  ticketNumber: string;
  attendeeName: string;
  attendeeEmail: string;
  status: string;
  eventId: string;
  ticketType: { name: string } | null;
  event: { title: string; slug: string };
}

export default function OrganizerAttendeesPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Get user's events and fetch first event's attendees
    api.get<{ events: any[] }>('/organizer/events?limit=1')
      .then(async (res) => {
        if (res.events.length === 0) {
          setLoading(false);
          return;
        }
        const eventId = res.events[0].id;
        const data = await api.get<{ tickets: Ticket[] }>(`/organizer/events/${eventId}/attendees?limit=50`);
        setTickets(data.tickets);
      })
      .catch(() => setError('Failed to load attendees'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="h-32 animate-pulse rounded-xl bg-surface-elevated" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Attendees</h1>
        <p className="mt-1 text-sm text-text-secondary">Attendees from your assigned events</p>
      </div>
      {error && <div className="rounded-lg bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}
      {tickets.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-12 text-center">
          <p className="text-text-muted">No attendees found.</p>
          <Link href="/organizer/events" className="mt-4 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover">
            View My Events
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-surface">
                <th className="px-4 py-3 text-left font-medium text-text-muted">Name</th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">Email</th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">Ticket</th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">Type</th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">Status</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} className="border-b border-[var(--color-border)] hover:bg-surface-hover">
                  <td className="px-4 py-3">
                    <span className="text-white">{t.attendeeName}</span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{t.attendeeEmail}</td>
                  <td className="px-4 py-3">
                    <Link href={`/tickets/${t.ticketNumber}`} className="font-mono text-primary hover:text-primary-hover">
                      {t.ticketNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{t.ticketType?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      t.status === 'CHECKED_IN' ? 'bg-success/10 text-success' :
                      t.status === 'ACTIVE' ? 'bg-accent/10 text-accent' : 'bg-warning/10 text-warning'
                    }`}>{t.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
