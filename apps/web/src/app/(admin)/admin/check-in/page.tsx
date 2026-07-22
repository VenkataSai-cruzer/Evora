'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';

interface ScanResult {
  result: string;
  message: string;
  ticketNumber?: string;
  attendeeName?: string;
  attendeeEmail?: string;
  ticketCategory?: string;
  ticketType?: string;
  event?: string;
  checkedInAt?: string;
  checkedInBy?: string;
  gateName?: string;
  originalCheckedInAt?: string;
  originalCheckedInBy?: string;
  originalGateName?: string;
}

interface Event { id: string; title: string; startAt: string; venueName: string; }

export default function AdminCheckInPage() {
  const [ticketNumber, setTicketNumber] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [gateName, setGateName] = useState('');

  useEffect(() => {
    api.get<{ events: Event[] }>('/admin/events?status=PUBLISHED&limit=50')
      .then((res) => { setEvents(res.events); if (res.events.length === 1) setSelectedEventId(res.events[0].id); })
      .catch(() => {});
  }, []);

  const handleCheckIn = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!ticketNumber.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post<ScanResult>('/check-in/manual', {
        ticketNumber: ticketNumber.trim(),
        eventId: selectedEventId || undefined,
        gateName: gateName || undefined,
      });
      setResult(res);
      setTicketNumber('');
    } catch (err: any) {
      setResult({ result: 'INVALID_TICKET', message: err.message || 'Check-in failed' });
    } finally {
      setLoading(false);
    }
  }, [ticketNumber, selectedEventId, gateName]);

  // Auto-focus on result dismiss
  const handleNewScan = () => setResult(null);

  const resultStyle = !result ? '' :
    result.result === 'SUCCESS' ? 'border-success/30 bg-success/10' :
    result.result === 'ALREADY_CHECKED_IN' ? 'border-warning/30 bg-warning/10' :
    'border-error/30 bg-error/10';

  const resultTextColor = !result ? '' :
    result.result === 'SUCCESS' ? 'text-success' :
    result.result === 'ALREADY_CHECKED_IN' ? 'text-warning' :
    'text-error';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Check-in</h1>
        <p className="mt-1 text-sm text-text-secondary">Verify and check in attendees at the venue</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Left: Input panel */}
        <div className="space-y-4">
          {/* Event selector */}
          {events.length > 1 && (
            <div className="rounded-xl border border-[var(--color-border)] bg-surface p-4">
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">Event (optional filter)</label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2.5 text-sm text-white focus:border-primary focus:outline-none"
              >
                <option value="">Any event</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.title}</option>
                ))}
              </select>
              <div className="mt-3">
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">Gate Name (optional)</label>
                <input
                  type="text"
                  value={gateName}
                  onChange={(e) => setGateName(e.target.value)}
                  placeholder="e.g. Gate A, Main Entry"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2 text-sm text-white placeholder:text-text-muted focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Manual ticket entry */}
          <div className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Manual Entry</h3>
            <form onSubmit={handleCheckIn} className="space-y-3">
              <input
                type="text"
                value={ticketNumber}
                onChange={(e) => setTicketNumber(e.target.value)}
                placeholder="Enter ticket number (e.g. 7N-ORD-...)"
                className="w-full rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2.5 text-sm text-white placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || !ticketNumber.trim()}
                className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {loading ? 'Verifying...' : 'Verify & Check In'}
              </button>
            </form>
          </div>

          {/* QR scanner note */}
          <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-surface p-4">
            <p className="text-sm font-medium text-white mb-1">QR Camera Scanner</p>
            <p className="text-xs text-text-muted">
              For camera-based QR scanning, use the dedicated <a href="/scanner" className="text-primary underline">Scanner Panel</a> on a mobile device.
            </p>
          </div>
        </div>

        {/* Right: Result panel */}
        <div>
          {result ? (
            <div className={`rounded-xl border p-6 ${resultStyle}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full text-3xl font-bold ${
                    result.result === 'SUCCESS' ? 'bg-success/20 text-success' :
                    result.result === 'ALREADY_CHECKED_IN' ? 'bg-warning/20 text-warning' :
                    'bg-error/20 text-error'
                  }`}>
                    {result.result === 'SUCCESS' ? '✓' : result.result === 'ALREADY_CHECKED_IN' ? '!' : '✗'}
                  </div>
                  <div>
                    <p className={`text-xl font-bold ${resultTextColor}`}>
                      {result.result === 'SUCCESS' ? 'CHECKED IN' :
                       result.result === 'ALREADY_CHECKED_IN' ? 'ALREADY SCANNED' :
                       result.result.replace(/_/g, ' ')}
                    </p>
                    <p className="text-sm text-text-muted">{result.message}</p>
                  </div>
                </div>
                <button onClick={handleNewScan} className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${resultTextColor} border-current/20 hover:bg-current/5`}>
                  New Scan
                </button>
              </div>

              {result.attendeeName && (
                <div className="mt-5 space-y-2 border-t border-current/10 pt-5">
                  <p className={`text-lg font-semibold ${resultTextColor}`}>{result.attendeeName}</p>
                  {result.attendeeEmail && <p className="text-sm text-text-muted">{result.attendeeEmail}</p>}
                  <div className="flex flex-wrap gap-2 mt-1">
                    {result.ticketCategory && (
                      <span className="rounded-full bg-current/10 px-3 py-0.5 text-xs font-medium">{result.ticketCategory}</span>
                    )}
                    {result.ticketType && <span className="text-xs text-text-muted">{result.ticketType}</span>}
                  </div>
                  {result.ticketNumber && <p className="font-mono text-xs text-text-muted">{result.ticketNumber}</p>}
                  {result.checkedInAt && (
                    <p className="text-xs text-text-muted">
                      ✓ Checked in at {new Date(result.checkedInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      {result.gateName && ` · ${result.gateName}`}
                    </p>
                  )}
                </div>
              )}

              {/* Duplicate scan details */}
              {result.result === 'ALREADY_CHECKED_IN' && result.originalCheckedInAt && (
                <div className="mt-4 rounded-lg bg-warning/5 border border-warning/20 p-3 space-y-1 text-xs">
                  <p className="font-semibold text-warning">Original Check-in Record</p>
                  <p className="text-text-muted">Time: <span className="text-white">{new Date(result.originalCheckedInAt).toLocaleString('en-IN')}</span></p>
                  {result.originalCheckedInBy && <p className="text-text-muted">By: <span className="text-white">{result.originalCheckedInBy}</span></p>}
                  {result.originalGateName && <p className="text-text-muted">Gate: <span className="text-white">{result.originalGateName}</span></p>}
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full min-h-[200px] items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-surface">
              <p className="text-sm text-text-muted">Scan result will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
