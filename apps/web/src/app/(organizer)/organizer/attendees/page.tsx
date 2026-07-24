'use client';

import { useEffect, useState, useCallback } from 'react';
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
}

interface EventItem {
  id: string;
  title: string;
  venueName: string;
}

export default function OrganizerAttendeesPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [error, setError] = useState('');

  // Load events on mount
  useEffect(() => {
    api.get<{ events: EventItem[] }>('/organizer/events?limit=50')
      .then((res) => {
        setEvents(res.events);
        if (res.events.length > 0) {
          setSelectedEventId(res.events[0].id);
        }
      })
      .catch(() => setError('Failed to load events'))
      .finally(() => setLoadingEvents(false));
  }, []);

  // Fetch attendees when selected event changes
  const loadAttendees = useCallback(async (eventId: string) => {
    if (!eventId) {
      setTickets([]);
      return;
    }
    setLoadingTickets(true);
    setError('');
    try {
      const data = await api.get<{ tickets: Ticket[] }>(`/organizer/events/${eventId}/attendees?limit=200`);
      setTickets(data.tickets);
    } catch {
      setError('Failed to load attendees for this event');
      setTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  }, []);

  useEffect(() => {
    loadAttendees(selectedEventId);
  }, [selectedEventId, loadAttendees]);

  if (loadingEvents) return <div className="h-32 animate-pulse rounded-xl bg-surface-elevated" />;

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Attendees</h1>
        <p className="mt-1 text-sm text-text-secondary">Attendees from your assigned events</p>
      </div>

      {/* Event selector */}
      {events.length > 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-4">
          <label className="text-sm font-medium text-white">Select Event</label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-[var(--color-border)] bg-surface-elevated px-3 py-2 text-sm text-white"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.title} — {ev.venueName}</option>
            ))}
          </select>
        </div>
      )}

      {error && <div className="rounded-lg bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}

      {/* Loading state */}
      {loadingTickets ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-12 text-center">
          <p className="text-text-muted">You are not assigned to any events yet.</p>
          <Link href="/organizer/events" className="mt-4 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover">
            View My Events
          </Link>
        </div>
      ) : tickets.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-12 text-center">
          <p className="text-text-muted">No attendees found{selectedEvent ? ` for ${selectedEvent.title}` : ''}.</p>
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
