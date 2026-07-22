'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useAuth } from '@/lib/auth-provider';
import { checkInTicket, manualCheckIn, getScannerEvents } from '@/lib/api-client';
import type { CheckInVerifyResponse, ScannerEvent } from '@/lib/api-client';
import { formatDate, formatTime } from '@/lib/dates';

const AUTO_RETURN_DELAY_MS = 1800;
const MAX_RECENT_SCANS = 20;

type ScanPhase = 'idle' | 'scanning' | 'verifying' | 'result';

interface ScanRecord {
  id: string;
  timestamp: Date;
  result: CheckInVerifyResponse;
  ticketNumber?: string;
}

function playSound(type: 'success' | 'error') {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = 0.15;
    if (type === 'success') {
      osc.frequency.value = 880;
      osc.start();
      setTimeout(() => { osc.frequency.value = 1100; }, 100);
      setTimeout(() => ctx.close(), 300);
    } else {
      osc.frequency.value = 330;
      osc.type = 'sawtooth';
      osc.start();
      setTimeout(() => ctx.close(), 400);
    }
  } catch {
    // Sound not critical
  }
}

function vibrate() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(100);
  }
}

export default function ScannerPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<ScannerEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedEventTitle, setSelectedEventTitle] = useState('');
  const [phase, setPhase] = useState<ScanPhase>('idle');
  const [result, setResult] = useState<CheckInVerifyResponse | null>(null);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(true);
  const [muted, setMuted] = useState(false);
  const [recentScans, setRecentScans] = useState<ScanRecord[]>([]);
  const [manualTicketNumber, setManualTicketNumber] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const cooldownRef = useRef(false);
  const autoReturnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load scanner events
  useEffect(() => {
    getScannerEvents()
      .then((res) => {
        const evts = res.events || [];
        setEvents(evts);
        // Restore previously selected event from session
        const saved = sessionStorage.getItem('scanner_event_id');
        if (saved && evts.find((e) => e.id === saved)) {
          setSelectedEventId(saved);
          const ev = evts.find((e) => e.id === saved);
          if (ev) setSelectedEventTitle(ev.title);
        } else if (evts.length === 1) {
          setSelectedEventId(evts[0].id);
          setSelectedEventTitle(evts[0].title);
        }
        setLoadingEvents(false);
      })
      .catch(() => setLoadingEvents(false));
  }, []);

  // Persist selected event
  useEffect(() => {
    if (selectedEventId) {
      sessionStorage.setItem('scanner_event_id', selectedEventId);
    }
  }, [selectedEventId]);

  // Cleanup auto-return timer
  useEffect(() => {
    return () => {
      if (autoReturnTimer.current) clearTimeout(autoReturnTimer.current);
    };
  }, []);

  const handleScanResult = useCallback(async (decodedText: string) => {
    // Guard: cooldown, no event, or already verifying
    if (cooldownRef.current || !selectedEventId || phase === 'verifying') return;

    cooldownRef.current = true;
    setPhase('verifying');
    setResult(null);
    setError('');

    // Pause scanner while verifying
    setScanning(false);

    try {
      const deviceInfo = typeof navigator !== 'undefined'
        ? `${navigator.userAgent}`
        : undefined;

      const res = await checkInTicket({
        qrToken: decodedText,
        eventId: selectedEventId,
        gateName: user?.name || undefined,
        scannerDevice: deviceInfo,
      });

      setResult(res);
      setPhase('result');

      // Store in recent scans
      const record: ScanRecord = {
        id: Date.now().toString(),
        timestamp: new Date(),
        result: res,
        ticketNumber: res.ticketNumber,
      };
      setRecentScans((prev) => [record, ...prev].slice(0, MAX_RECENT_SCANS));

      // Feedback
      if (!muted) {
        if (res.result === 'SUCCESS') {
          playSound('success');
          vibrate();
        } else {
          playSound('error');
        }
      }

      // Auto-return to scanning after delay
      if (res.result === 'SUCCESS' || res.result === 'ALREADY_CHECKED_IN') {
        autoReturnTimer.current = setTimeout(() => {
          setPhase('scanning');
          setResult(null);
          setScanning(true);
          cooldownRef.current = false;
        }, AUTO_RETURN_DELAY_MS);
      } else {
        autoReturnTimer.current = setTimeout(() => {
          setPhase('scanning');
          setResult(null);
          setScanning(true);
          cooldownRef.current = false;
        }, AUTO_RETURN_DELAY_MS + 1000);
      }
    } catch (err: any) {
      setResult({
        result: 'INVALID_TICKET',
        message: err.message || 'Verification failed',
      });
      setPhase('result');
      if (!muted) playSound('error');

      setTimeout(() => {
        setPhase('scanning');
        setResult(null);
        setScanning(true);
        cooldownRef.current = false;
      }, 2500);
    }
  }, [selectedEventId, phase, muted, user?.name]);

  const handleManualCheckIn = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTicketNumber.trim() || !selectedEventId || manualLoading) return;

    setManualLoading(true);
    setResult(null);
    setError('');

    try {
      const res = await manualCheckIn({
        ticketNumber: manualTicketNumber.trim(),
        eventId: selectedEventId,
        gateName: user?.name || undefined,
      });
      setResult(res);
      setPhase('result');

      const record: ScanRecord = {
        id: `manual-${Date.now()}`,
        timestamp: new Date(),
        result: res,
        ticketNumber: res.ticketNumber,
      };
      setRecentScans((prev) => [record, ...prev].slice(0, MAX_RECENT_SCANS));
      setManualTicketNumber('');

      if (!muted) {
        if (res.result === 'SUCCESS') { playSound('success'); vibrate(); }
        else { playSound('error'); }
      }
    } catch (err: any) {
      setResult({ result: 'INVALID_TICKET', message: err.message || 'Check-in failed' });
      setPhase('result');
    } finally {
      setManualLoading(false);
    }
  }, [manualTicketNumber, selectedEventId, manualLoading, muted, user?.name]);

  const toggleScanning = useCallback(() => {
    setScanning((s) => !s);
    cooldownRef.current = false;
  }, []);

  const handleEventChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedEventId(id);
    const ev = events.find((evt) => evt.id === id);
    setSelectedEventTitle(ev?.title || '');
    // Reset state on event change
    setPhase('idle');
    setResult(null);
    setError('');
    cooldownRef.current = false;
    setScanning(true);
  }, [events]);

  const isSuccess = result?.result === 'SUCCESS';
  const isAlreadyCheckedIn = result?.result === 'ALREADY_CHECKED_IN';

  return (
    <div className="flex min-h-screen flex-col">
      {/* ── Header ────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/90 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">✦</span>
            <h1 className="text-sm font-semibold text-white">Scanner</h1>
          </div>
          <div className="flex items-center gap-2">
            {phase === 'scanning' && (
              <button
                onClick={toggleScanning}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition-colors"
              >
                {scanning ? 'Pause' : 'Resume'}
              </button>
            )}
            <button
              onClick={() => setMuted(!muted)}
              className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs text-white hover:bg-white/20 transition-colors"
              title={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? '🔇' : '🔊'}
            </button>
          </div>
        </div>
      </header>

      {/* ── Event Selector ────────────────────────────── */}
      <div className="border-b border-white/10 px-4 py-2.5">
        {loadingEvents ? (
          <div className="h-9 animate-pulse rounded-lg bg-white/10" />
        ) : events.length > 0 ? (
          <select
            value={selectedEventId}
            onChange={handleEventChange}
            className="w-full rounded-lg border border-white/20 bg-black px-3 py-2 text-sm text-white focus:border-primary focus:outline-none appearance-none"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 fill=%27%23666%27 viewBox=%270 0 16 16%27%3E%3Cpath d=%27M8 11L3 6h10z%27/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '12px' }}
          >
            <option value="" disabled>Select an event to scan for</option>
            {events.map((evt) => (
              <option key={evt.id} value={evt.id}>
                {evt.title} — {formatDate(evt.startAt)}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-center text-xs text-text-muted py-2">No events assigned for scanning</p>
        )}
      </div>

      {/* ── Main Content ──────────────────────────────── */}
      <div className="flex-1">
        {/* No event selected state */}
        {!selectedEventId && !loadingEvents && events.length > 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 mb-4">
              <svg className="h-8 w-8 text-text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white mb-1">Select an Event</h2>
            <p className="text-sm text-text-muted max-w-xs">
              Choose the event you&apos;re scanning tickets for to begin.
            </p>
          </div>
        )}

        {/* Camera Scanner Panel */}
        {selectedEventId && (
          <div className="relative">
            {/* Camera View */}
            <div className="relative mx-auto max-w-md overflow-hidden bg-black" style={{ minHeight: '50vh' }}>
              {scanning ? (
                <div className="relative">
                  <Scanner
                    onScan={(detectedCodes) => {
                      const code = detectedCodes?.[0];
                      if (code?.rawValue && phase !== 'verifying') {
                        handleScanResult(code.rawValue);
                      }
                    }}
                    onError={(err) => {
                      console.error('[Scanner] Camera error:', err);
                      setError('Camera access failed. Use manual entry instead.');
                    }}
                    constraints={{
                      facingMode: 'environment',
                    }}
                    allowMultiple={false}
                    scanDelay={300}
                    styles={{
                      container: {
                        width: '100%',
                        height: 'auto',
                      },
                      video: {
                        objectFit: 'cover',
                      },
                    }}
                  />
                  {/* Scan overlay frame */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative h-56 w-56">
                      {/* Corner borders */}
                      <div className="absolute left-0 top-0 h-8 w-8 border-l-2 border-t-2 border-primary rounded-tl" />
                      <div className="absolute right-0 top-0 h-8 w-8 border-r-2 border-t-2 border-primary rounded-tr" />
                      <div className="absolute bottom-0 left-0 h-8 w-8 border-l-2 border-b-2 border-primary rounded-bl" />
                      <div className="absolute bottom-0 right-0 h-8 w-8 border-r-2 border-b-2 border-primary rounded-br" />
                    </div>
                  </div>
                  {/* Status overlay */}
                  <div className="absolute bottom-4 left-0 right-0 text-center">
                    <p className="text-xs text-white/60 bg-black/50 inline-block px-3 py-1 rounded-full">
                      {phase === 'verifying' ? 'Verifying...' : 'Point camera at QR code'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 mb-3">
                    <span className="text-2xl text-text-muted">📷</span>
                  </div>
                  <p className="text-sm text-text-muted mb-3">Camera paused</p>
                  <button
                    onClick={toggleScanning}
                    className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
                  >
                    Resume Scanning
                  </button>
                </div>
              )}
            </div>

            {/* Result Card */}
            {phase === 'result' && result && (
              <div className={`mx-auto max-w-md px-4 pb-4 ${isSuccess ? '-mt-16' : '-mt-8'}`}>
                <div className={`rounded-2xl p-6 text-center shadow-xl ${
                  isSuccess ? 'bg-success text-white' :
                  isAlreadyCheckedIn ? 'bg-warning text-white' :
                  'bg-error text-white'
                }`}>
                  {/* Icon */}
                  <div className="flex justify-center mb-2">
                    <div className={`flex h-16 w-16 items-center justify-center rounded-full text-3xl ${
                      isSuccess ? 'bg-white/20' :
                      isAlreadyCheckedIn ? 'bg-white/20' :
                      'bg-white/20'
                    }`}>
                      {isSuccess ? '✓' : isAlreadyCheckedIn ? '!' : '✗'}
                    </div>
                  </div>

                  {/* Status */}
                  <p className="text-xl font-bold mb-1">
                    {isSuccess ? 'ENTRY APPROVED' :
                     isAlreadyCheckedIn ? 'ALREADY CHECKED IN' :
                     result.result === 'WRONG_EVENT' ? 'WRONG EVENT' :
                     result.result === 'CANCELLED' ? 'TICKET CANCELLED' :
                     result.result === 'EXPIRED' ? 'TICKET EXPIRED' :
                     'INVALID TICKET'}
                  </p>
                  <p className="text-sm text-white/80 mb-3">{result.message}</p>

                  {/* Attendee Info */}
                  {result.attendeeName && (
                    <div className="border-t border-white/20 pt-3 mt-1 space-y-1">
                      <p className="text-lg font-semibold">{result.attendeeName}</p>
                      {result.ticketType && (
                        <p className="text-sm text-white/80">{result.ticketType}</p>
                      )}
                      {result.ticketCategory && (
                        <span className="inline-block rounded-full bg-white/20 px-3 py-0.5 text-xs font-medium mt-1">
                          {result.ticketCategory}
                        </span>
                      )}
                      {result.ticketNumber && (
                        <p className="font-mono text-xs text-white/60 mt-1">{result.ticketNumber}</p>
                      )}
                      {result.checkedInAt && (
                        <p className="text-xs text-white/70 mt-2">
                          ✓ Checked in at {formatTime(result.checkedInAt)} on {formatDate(result.checkedInAt)}
                          {result.gateName ? ` · ${result.gateName}` : ''}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Already checked-in details */}
                  {isAlreadyCheckedIn && result.originalCheckedInAt && (
                    <div className="border-t border-white/20 pt-3 mt-3 space-y-1 text-xs text-white/70">
                      <p className="font-semibold text-white/90">Original Check-in</p>
                      <p>{formatDate(result.originalCheckedInAt)} at {formatTime(result.originalCheckedInAt)}</p>
                      {result.originalCheckedInBy && <p>By: {result.originalCheckedInBy}</p>}
                      {result.originalGateName && <p>Gate: {result.originalGateName}</p>}
                    </div>
                  )}

                  {/* Wrong event details */}
                  {result.result === 'WRONG_EVENT' && result.event && (
                    <div className="border-t border-white/20 pt-3 mt-3 text-xs text-white/70">
                      <p>Ticket belongs to: <span className="font-semibold text-white">{result.event}</span></p>
                      <p className="mt-1">Current scanner: <span className="font-semibold text-white">{selectedEventTitle}</span></p>
                    </div>
                  )}
                </div>

                {/* Manual override / Dismiss */}
                {!isSuccess && (
                  <button
                    onClick={() => { setPhase('scanning'); setResult(null); setScanning(true); cooldownRef.current = false; }}
                    className="mt-3 w-full rounded-lg bg-white/10 py-2.5 text-sm font-medium text-white hover:bg-white/20 transition-colors"
                  >
                    Dismiss & Scan Next
                  </button>
                )}
              </div>
            )}

            {/* Verifying overlay */}
            {phase === 'verifying' && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="mt-3 text-sm text-text-muted">Verifying ticket...</p>
              </div>
            )}

            {/* Manual Entry */}
            {(phase === 'scanning' || phase === 'idle') && !result && (
              <div className="mx-auto max-w-md px-4 pb-4 pt-4">
                <details className="group">
                  <summary className="flex cursor-pointer items-center justify-between rounded-lg bg-white/5 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-colors">
                    Manual Ticket Entry
                    <svg className="h-4 w-4 text-text-muted transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </summary>
                  <form onSubmit={handleManualCheckIn} className="mt-2 space-y-2">
                    <input
                      type="text"
                      value={manualTicketNumber}
                      onChange={(e) => setManualTicketNumber(e.target.value)}
                      placeholder="Enter ticket number"
                      className="w-full rounded-lg border border-white/20 bg-black px-3 py-2.5 text-sm text-white placeholder:text-text-muted focus:border-primary focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={manualLoading || !manualTicketNumber.trim() || !selectedEventId}
                      className="w-full rounded-lg bg-primary/80 py-2.5 text-sm font-medium text-white hover:bg-primary disabled:opacity-50 transition-colors"
                    >
                      {manualLoading ? 'Verifying...' : 'Verify & Check In'}
                    </button>
                  </form>
                </details>
              </div>
            )}

            {/* Error state */}
            {error && !result && (
              <div className="mx-auto max-w-md px-4 pb-4">
                <div className="rounded-xl border border-error/30 bg-error/10 p-4 text-center">
                  <p className="text-sm font-medium text-error mb-1">Scanner Error</p>
                  <p className="text-xs text-text-muted">{error}</p>
                  <button
                    onClick={() => setError('')}
                    className="mt-2 rounded-lg bg-white/10 px-4 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recent Scans */}
        {recentScans.length > 0 && (
          <div className="mx-auto max-w-md px-4 pb-8 pt-2">
            <h3 className="text-xs text-text-muted uppercase tracking-wider mb-2">
              Recent Scans ({recentScans.length})
            </h3>
            <div className="space-y-1.5">
              {recentScans.map((scan) => (
                <div key={scan.id} className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                  scan.result.result === 'SUCCESS' ? 'bg-success/10' :
                  scan.result.result === 'ALREADY_CHECKED_IN' ? 'bg-warning/10' :
                  'bg-error/10'
                }`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-base flex-shrink-0 ${
                      scan.result.result === 'SUCCESS' ? 'text-success' :
                      scan.result.result === 'ALREADY_CHECKED_IN' ? 'text-warning' :
                      'text-error'
                    }`}>
                      {scan.result.result === 'SUCCESS' ? '✓' :
                       scan.result.result === 'ALREADY_CHECKED_IN' ? '⏳' : '✗'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white truncate">
                        {scan.result.attendeeName || scan.ticketNumber || 'Unknown'}
                      </p>
                      <p className="text-2xs text-text-muted">
                        {formatTime(scan.timestamp.toISOString())}
                        {scan.ticketNumber ? ` · ${scan.ticketNumber}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className={`text-2xs font-medium flex-shrink-0 ${
                    scan.result.result === 'SUCCESS' ? 'text-success' :
                    scan.result.result === 'ALREADY_CHECKED_IN' ? 'text-warning' :
                    'text-error'
                  }`}>
                    {scan.result.result === 'SUCCESS' ? 'OK' :
                     scan.result.result === 'ALREADY_CHECKED_IN' ? 'USED' :
                     scan.result.result === 'WRONG_EVENT' ? 'WRONG' :
                     scan.result.result === 'CANCELLED' || scan.result.result === 'EXPIRED' ? 'BLOCKED' :
                     'INVALID'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
