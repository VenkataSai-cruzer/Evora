'use client';

import { useEffect, useState } from 'react';
import { api, getSessionToken } from '@/lib/api-client';

export default function OrganizerExportsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ events: any[] }>('/organizer/events?limit=50')
      .then((res) => setEvents(res.events))
      .catch(() => setError('Failed to load events'))
      .finally(() => setLoading(false));
  }, []);

  async function downloadCsv(eventId: string, eventTitle: string) {
    setDownloading(eventId);
    setError('');
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:10000/api/v1';
      const headers: Record<string, string> = {};
      const token = getSessionToken();
      if (token) headers['X-Session-Token'] = token;

      const res = await fetch(`${baseUrl}/organizer/events/${eventId}/attendees/export`, {
        credentials: 'include',
        headers,
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `attendees-${eventTitle.replace(/[^a-zA-Z0-9]/g, '-')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      setError(`Failed to download CSV for "${eventTitle}". Please try again.`);
    } finally {
      setDownloading(null);
    }
  }

  if (loading) return <div className="h-32 animate-pulse rounded-xl bg-surface-elevated" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Exports</h1>
        <p className="mt-1 text-sm text-text-secondary">Download attendee data for your events</p>
      </div>
      {error && (
        <div className="rounded-lg bg-error/10 px-4 py-3 text-sm text-error">{error}</div>
      )}
      {events.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-12 text-center">
          <p className="text-text-muted">No events to export.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => (
            <div key={ev.id} className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-surface p-5">
              <div>
                <p className="font-medium text-white">{ev.title}</p>
                <p className="mt-0.5 text-xs text-text-muted">{ev.venueName}</p>
              </div>
              <button
                onClick={() => downloadCsv(ev.id, ev.title)}
                disabled={downloading === ev.id}
                className="inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {downloading === ev.id ? 'Downloading...' : 'Download CSV'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
