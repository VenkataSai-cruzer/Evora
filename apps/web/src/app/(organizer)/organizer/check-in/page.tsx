'use client';

import { useEffect, useState } from 'react';
import { api, CheckInVerifyResponse } from '@/lib/api-client';

export default function OrganizerCheckInPage() {
  const [ticketInput, setTicketInput] = useState('');
  const [result, setResult] = useState<CheckInVerifyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');

  useEffect(() => {
    api.get<{ events: any[] }>('/organizer/events?limit=50')
      .then((res) => {
        setEvents(res.events);
        if (res.events.length > 0) setSelectedEventId(res.events[0].id);
      })
      .catch(() => {});
  }, []);

  async function handleCheckIn() {
    if (!ticketInput.trim() || !selectedEventId) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.post<CheckInVerifyResponse>('/check-in/manual', {
        ticketNumber: ticketInput.trim(),
        eventId: selectedEventId,
      });
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Check-in failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Check-in</h1>
        <p className="mt-1 text-sm text-text-secondary">Verify tickets at your event</p>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-surface p-6">
        <label className="text-sm font-medium text-white">Select Event</label>
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-[var(--color-border)] bg-surface-elevated px-3 py-2 text-sm text-white"
        >
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>{ev.title}</option>
          ))}
        </select>

        <label className="mt-4 block text-sm font-medium text-white">Ticket Number</label>
        <div className="mt-1 flex gap-2">
          <input
            type="text"
            value={ticketInput}
            onChange={(e) => setTicketInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCheckIn()}
            placeholder="Enter ticket number..."
            className="flex-1 rounded-lg border border-[var(--color-border)] bg-surface-elevated px-3 py-2 text-sm text-white placeholder:text-text-muted"
          />
          <button
            onClick={handleCheckIn}
            disabled={loading || !ticketInput.trim()}
            className="inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
          >
            {loading ? 'Verifying...' : 'Check In'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-error/10 px-4 py-3 text-sm text-error">{error}</div>
      )}

      {result && (
        <div className={`rounded-xl border p-6 ${
          result.result === 'SUCCESS' ? 'border-success/20 bg-success/5' :
          result.result === 'ALREADY_CHECKED_IN' ? 'border-warning/20 bg-warning/5' :
          'border-error/20 bg-error/5'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
              result.result === 'SUCCESS' ? 'bg-success/20' :
              result.result === 'ALREADY_CHECKED_IN' ? 'bg-warning/20' : 'bg-error/20'
            }`}>
              <div className={`h-2 w-2 rounded-full ${
                result.result === 'SUCCESS' ? 'bg-success' :
                result.result === 'ALREADY_CHECKED_IN' ? 'bg-warning' : 'bg-error'
              } animate-pulse`} />
            </div>
            <div>
              <p className="font-medium text-white">{result.message}</p>
              {result.attendeeName && (
                <p className="mt-1 text-sm text-text-secondary">{result.attendeeName}{result.ticketType ? ` — ${result.ticketType}` : ''}</p>
              )}
              {result.checkedInAt && (
                <p className="mt-0.5 text-xs text-text-muted">Checked in: {new Date(result.checkedInAt).toLocaleString()}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
