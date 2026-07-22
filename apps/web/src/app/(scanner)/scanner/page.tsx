'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api-client';

interface ScannerEvent {
  id: string;
  title: string;
  startAt: string;
  venueName: string;
  gateName?: string;
}

interface ScanResult {
  result: 'SUCCESS' | 'ALREADY_CHECKED_IN' | 'INVALID_TICKET' | 'WRONG_EVENT' | 'CANCELLED' | 'EXPIRED' | 'NOT_ACTIVE';
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
  currentScanAt?: string;
}

export default function ScannerPage() {
  const [events, setEvents] = useState<ScannerEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<ScannerEvent | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [manualTicket, setManualTicket] = useState('');
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'select' | 'scan'>('select');
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api.get<{ events: ScannerEvent[] }>('/check-in/scanner/events')
      .then((res) => { setEvents(res.events); if (res.events.length === 1) { setSelectedEvent(res.events[0]); setMode('scan'); } })
      .catch(() => setError('Failed to load assigned events'))
      .finally(() => setLoading(false));
  }, []);

  const autoReset = useCallback(() => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => setScanResult(null), 8000);
  }, []);

  async function doScan(token: string, isManual = false) {
    if (!selectedEvent || scanning) return;
    setScanning(true);
    setScanResult(null);
    try {
      const endpoint = isManual ? '/check-in/manual' : '/check-in/verify';
      const body = isManual
        ? { ticketNumber: token, eventId: selectedEvent.id, gateName: selectedEvent.gateName }
        : { qrToken: token, eventId: selectedEvent.id, gateName: selectedEvent.gateName };
      const res = await api.post<ScanResult>(endpoint, body);
      setScanResult(res);
      autoReset();
    } catch (err: any) {
      setScanResult({ result: 'INVALID_TICKET', message: err.message || 'Scan failed' });
      autoReset();
    } finally {
      setScanning(false);
    }
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualTicket.trim()) return;
    await doScan(manualTicket.trim(), true);
    setManualTicket('');
  }

  function handleNewScan() {
    setScanResult(null);
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
  }

  const resultColor = !scanResult ? '' :
    scanResult.result === 'SUCCESS' ? 'bg-success/10 border-success/30 text-success' :
    scanResult.result === 'ALREADY_CHECKED_IN' ? 'bg-warning/10 border-warning/30 text-warning' :
    'bg-error/10 border-error/30 text-error';

  const resultIcon = !scanResult ? '' :
    scanResult.result === 'SUCCESS' ? '✓' :
    scanResult.result === 'ALREADY_CHECKED_IN' ? '!' : '✗';

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-text-muted text-sm">Loading scanner...</div>
    </div>
  );

  if (mode === 'select') {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="mx-auto max-w-md">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-white">Scanner</h1>
            <p className="mt-1 text-sm text-text-secondary">Select an event to scan tickets for</p>
          </div>
          {error && <div className="mb-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</div>}
          {events.length === 0 ? (
            <div className="rounded-xl border border-[var(--color-border)] bg-surface p-8 text-center">
              <p className="text-text-muted text-sm">No events assigned to you.</p>
              <p className="mt-2 text-xs text-text-muted">Contact an admin to be assigned to an event.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <button key={event.id} onClick={() => { setSelectedEvent(event); setMode('scan'); }}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-surface p-4 text-left hover:border-primary transition-colors">
                  <p className="font-semibold text-white">{event.title}</p>
                  <p className="mt-1 text-xs text-text-muted">{new Date(event.startAt).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })} · {event.venueName}</p>
                  {event.gateName && <p className="mt-1 text-xs text-primary">Gate: {event.gateName}</p>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-md space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-white">{selectedEvent?.title}</h1>
            <p className="text-xs text-text-muted">{selectedEvent?.venueName}{selectedEvent?.gateName ? ` · Gate: ${selectedEvent.gateName}` : ''}</p>
          </div>
          <button onClick={() => { setMode('select'); setSelectedEvent(null); setScanResult(null); }}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-text-secondary hover:text-white transition-colors">
            Change Event
          </button>
        </div>

        {/* Scan Result Panel */}
        {scanResult && (
          <div className={`rounded-xl border p-5 ${resultColor}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-2xl font-bold ${
                  scanResult.result === 'SUCCESS' ? 'bg-success/20' :
                  scanResult.result === 'ALREADY_CHECKED_IN' ? 'bg-warning/20' : 'bg-error/20'
                }`}>
                  {resultIcon}
                </div>
                <div>
                  <p className="text-lg font-bold">
                    {scanResult.result === 'SUCCESS' ? 'CHECKED IN' :
                     scanResult.result === 'ALREADY_CHECKED_IN' ? 'ALREADY SCANNED' :
                     scanResult.result === 'CANCELLED' ? 'CANCELLED' :
                     scanResult.result === 'WRONG_EVENT' ? 'WRONG EVENT' : 'INVALID'}
                  </p>
                  <p className="text-xs opacity-80">{scanResult.message}</p>
                </div>
              </div>
              <button onClick={handleNewScan} className="rounded-lg border border-current/20 px-3 py-1.5 text-xs font-medium opacity-80 hover:opacity-100">
                New Scan
              </button>
            </div>

            {scanResult.attendeeName && (
              <div className="mt-4 space-y-1.5 border-t border-current/10 pt-4">
                <p className="text-base font-semibold">{scanResult.attendeeName}</p>
                {scanResult.attendeeEmail && <p className="text-xs opacity-70">{scanResult.attendeeEmail}</p>}
                <div className="flex gap-3 text-xs">
                  {scanResult.ticketCategory && <span className="rounded bg-current/10 px-2 py-0.5">{scanResult.ticketCategory}</span>}
                  {scanResult.ticketType && <span>{scanResult.ticketType}</span>}
                </div>
                {scanResult.ticketNumber && <p className="font-mono text-xs opacity-70">{scanResult.ticketNumber}</p>}
              </div>
            )}

            {scanResult.result === 'ALREADY_CHECKED_IN' && scanResult.originalCheckedInAt && (
              <div className="mt-3 rounded-lg bg-current/5 p-3 text-xs space-y-1">
                <p className="font-medium">Previously checked in:</p>
                <p>Time: {new Date(scanResult.originalCheckedInAt).toLocaleString('en-IN')}</p>
                {scanResult.originalCheckedInBy && <p>By: {scanResult.originalCheckedInBy}</p>}
                {scanResult.originalGateName && <p>Gate: {scanResult.originalGateName}</p>}
              </div>
            )}

            {scanResult.result === 'SUCCESS' && scanResult.checkedInAt && (
              <p className="mt-3 text-xs opacity-70">Checked in at {new Date(scanResult.checkedInAt).toLocaleTimeString('en-IN')}</p>
            )}
          </div>
        )}

        {/* Manual Entry */}
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Manual Entry</h3>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={manualTicket}
              onChange={(e) => setManualTicket(e.target.value)}
              placeholder="Enter ticket number"
              className="flex-1 rounded-lg border border-[var(--color-border)] bg-background px-3 py-2.5 text-sm text-white placeholder:text-text-muted focus:border-primary focus:outline-none"
            />
            <button type="submit" disabled={scanning || !manualTicket.trim()}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
              {scanning ? '...' : 'Check'}
            </button>
          </form>
        </div>

        {/* QR Camera Placeholder */}
        <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-surface p-6 text-center">
          <p className="text-sm font-medium text-white mb-1">QR Camera Scanner</p>
          <p className="text-xs text-text-muted">
            Camera-based QR scanning will be available after installing the QR scanner library.
            Use manual entry above for now.
          </p>
          <p className="mt-2 text-xs text-text-muted italic">Run: npm install html5-qrcode in apps/web</p>
        </div>

        {scanning && (
          <div className="rounded-xl border border-[var(--color-border)] bg-surface p-4 text-center">
            <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="mt-2 text-xs text-text-muted">Verifying...</p>
          </div>
        )}
      </div>
    </div>
  );
}
