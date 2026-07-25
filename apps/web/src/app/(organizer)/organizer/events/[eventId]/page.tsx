'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  getOrganizerEvent,
  organizerMarkSoldOut,
  organizerReopenBooking,
  organizerPauseSales,
  organizerResumeSales,
  listOrganizerTicketTypes,
  updateOrganizerTicketType,
} from '@/lib/api-client';
import { formatDate, formatTime } from '@/lib/dates';
import { CheckInStatsCard } from '@/components/events/CheckInStatsCard';

// ── Inline price editor ──────────────────────────────────────
function TicketTypeRow({
  tt,
  eventId,
  onUpdated,
}: {
  tt: any;
  eventId: string;
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [price, setPrice] = useState(String(tt.price / 100));
  const [capacity, setCapacity] = useState(String(tt.capacity));
  const [maxPerOrder, setMaxPerOrder] = useState(String(tt.maxPerOrder));

  const remaining = tt.capacity > 0 ? Math.max(0, tt.capacity - tt.soldCount) : null;
  const pct = tt.capacity > 0 ? Math.round((tt.soldCount / tt.capacity) * 100) : 0;

  const save = async () => {
    setSaving(true);
    setErr('');
    try {
      const priceNum = Math.round(parseFloat(price) * 100);
      const capNum = parseInt(capacity, 10);
      const maxNum = parseInt(maxPerOrder, 10);
      if (isNaN(priceNum) || priceNum < 0) { setErr('Invalid price'); setSaving(false); return; }
      if (isNaN(capNum) || capNum < tt.soldCount) {
        setErr(`Capacity can't be less than ${tt.soldCount} (already sold)`);
        setSaving(false); return;
      }
      await updateOrganizerTicketType(eventId, tt.id, {
        price: priceNum,
        capacity: capNum,
        maxPerOrder: maxNum,
      });
      setEditing(false);
      onUpdated();
    } catch (e: any) {
      setErr(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">{tt.name}</p>
          {tt.description && <p className="text-xs text-text-muted mt-0.5">{tt.description}</p>}
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex-shrink-0 rounded-lg border border-[var(--color-border)] bg-surface-elevated px-3 py-1 text-xs font-medium text-text-secondary hover:text-white hover:bg-surface-hover transition-colors"
          >
            Edit
          </button>
        ) : (
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => { setEditing(false); setErr(''); setPrice(String(tt.price / 100)); setCapacity(String(tt.capacity)); setMaxPerOrder(String(tt.maxPerOrder)); }}
              className="rounded-lg border border-[var(--color-border)] bg-surface-elevated px-3 py-1 text-xs font-medium text-text-secondary hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {!editing ? (
        <>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-text-secondary">
              ₹{(tt.price / 100).toFixed(0)} &middot; max {tt.maxPerOrder}/order
            </span>
            <span className="font-semibold text-white">
              {tt.soldCount} / {tt.capacity > 0 ? tt.capacity : '∞'}
              {remaining !== null && (
                <span className={`ml-2 text-xs font-normal ${remaining <= 10 ? 'text-warning' : 'text-text-muted'}`}>
                  ({remaining} left)
                </span>
              )}
            </span>
          </div>
          {tt.capacity > 0 && (
            <div className="h-1.5 w-full rounded-full bg-surface-elevated overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  pct >= 100 ? 'bg-error' : pct >= 80 ? 'bg-warning' : 'bg-success'
                }`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
          )}
        </>
      ) : (
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div>
            <label className="block text-xs text-text-muted mb-1">Price (₹)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={price}
              onChange={e => setPrice(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-surface-elevated px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Capacity</label>
            <input
              type="number"
              min={tt.soldCount}
              step="1"
              value={capacity}
              onChange={e => setCapacity(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-surface-elevated px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
            />
            <p className="text-2xs text-text-muted mt-0.5">{tt.soldCount} already sold</p>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Max/order</label>
            <input
              type="number"
              min="1"
              max="20"
              step="1"
              value={maxPerOrder}
              onChange={e => setMaxPerOrder(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-surface-elevated px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
            />
          </div>
          {err && <p className="col-span-3 text-xs text-error">{err}</p>}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────
export default function OrganizerEventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<any>(null);
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!eventId) return;
    try {
      const [ev, ttRes] = await Promise.all([
        getOrganizerEvent(eventId),
        listOrganizerTicketTypes(eventId).catch(() => ({ ticketTypes: [] })),
      ]);
      setEvent(ev);
      setTicketTypes(ttRes.ticketTypes || []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load event');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const performAction = async (label: string, fn: () => Promise<void>) => {
    setActionLoading(label);
    setFeedback(null);
    setConfirmAction(null);
    try {
      await fn();
      await loadAll();
      setFeedback({ type: 'success', message: `${label} — done.` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || `${label} failed.` });
    } finally {
      setActionLoading(null);
    }
  };

  // ── Loading ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-5 w-32 rounded bg-surface-elevated" />
        <div className="h-8 w-64 rounded bg-surface-elevated" />
        <div className="h-40 rounded-xl bg-surface-elevated" />
        <div className="h-32 rounded-xl bg-surface-elevated" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="space-y-6">
        <Link href="/organizer/events" className="text-sm text-text-muted hover:text-white">&larr; My Events</Link>
        <div className="rounded-xl border border-error/20 bg-error/5 p-12 text-center">
          <p className="text-lg font-semibold text-white">Event not found</p>
          <p className="mt-1 text-sm text-text-secondary">{error}</p>
          <Link href="/organizer/events" className="mt-6 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover transition-colors">
            My Events
          </Link>
        </div>
      </div>
    );
  }

  const isLive = event.status === 'PUBLISHED' && !event.salesPaused && !event.bookingClosed;
  const isPaused = event.status === 'PUBLISHED' && event.salesPaused;
  const isClosed = event.bookingClosed;

  // Derive status label
  const statusLabel = isClosed ? 'Sold Out / Closed' : isPaused ? 'Sales Paused' : isLive ? 'LIVE' : event.status;
  const statusColor = isClosed ? 'bg-error/10 text-error border-error/20' :
    isPaused ? 'bg-warning/10 text-warning border-warning/20' :
    isLive ? 'bg-success/10 text-success border-success/20' :
    'bg-surface-elevated text-text-secondary border-[var(--color-border)]';

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Back */}
      <Link href="/organizer/events" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-white transition-colors">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        My Events
      </Link>

      {/* Feedback */}
      {feedback && (
        <div className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${
          feedback.type === 'success' ? 'border-success/20 bg-success/5 text-success' : 'border-error/20 bg-error/5 text-error'
        }`}>
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="ml-3 opacity-60 hover:opacity-100 text-lg leading-none">&times;</button>
        </div>
      )}

      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-white">{event.title}</h1>
          <span className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold ${statusColor}`}>
            {statusLabel}
          </span>
        </div>
        <p className="text-sm text-text-secondary">
          {formatDate(event.startAt)} at {formatTime(event.startAt)} &middot; {event.venueName}
        </p>
        {event.venueAddress && (
          <p className="text-xs text-text-muted mt-0.5">{event.venueAddress}</p>
        )}
      </div>

      {/* ── Check-in Stats (live widget) ───────────────── */}
      {event.status !== 'DRAFT' && (
        <CheckInStatsCard apiPath={`/organizer/events/${eventId}/checkin-stats`} pollIntervalMs={15000} />
      )}

      {/* ── Event Controls ─────────────────────────────── */}
      {event.status === 'PUBLISHED' && (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface overflow-hidden">
          <div className="border-b border-[var(--color-border)] bg-surface-elevated px-5 py-3">
            <h2 className="text-sm font-semibold text-white">Event Controls</h2>
          </div>
          <div className="p-5 space-y-3">

            {/* Status row */}
            <div className="flex items-center justify-between rounded-lg bg-surface-elevated px-4 py-3">
              <div>
                <p className="text-sm font-medium text-white">Current Status</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {isLive ? 'Bookings are open. Attendees can purchase tickets.' :
                   isPaused ? 'Sales temporarily paused. No new bookings.' :
                   isClosed ? 'Booking closed. No new orders allowed.' :
                   'Event is not published.'}
                </p>
              </div>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusColor}`}>
                {statusLabel}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">

              {/* PAUSE — only if currently live */}
              {isLive && (
                confirmAction === 'pause' ? (
                  <div className="flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/5 p-2">
                    <span className="text-xs text-warning px-1">Pause sales? No new bookings will be accepted.</span>
                    <button
                      onClick={() => performAction('Pause Sales', () => organizerPauseSales(eventId!))}
                      disabled={!!actionLoading}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-white bg-warning hover:bg-warning/80 disabled:opacity-50 transition-colors"
                    >
                      {actionLoading === 'Pause Sales' ? 'Pausing…' : 'Confirm Pause'}
                    </button>
                    <button onClick={() => setConfirmAction(null)} className="rounded-lg px-3 py-1.5 text-xs font-medium bg-surface-elevated text-text-secondary hover:text-white transition-colors">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmAction('pause')}
                    className="rounded-lg border border-warning/20 bg-warning/10 px-4 py-2 text-xs font-medium text-warning hover:bg-warning/20 transition-colors"
                  >
                    ⏸ Pause Sales
                  </button>
                )
              )}

              {/* RESUME — only if paused */}
              {isPaused && (
                confirmAction === 'resume' ? (
                  <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/5 p-2">
                    <span className="text-xs text-success px-1">Resume sales? Bookings will be open again.</span>
                    <button
                      onClick={() => performAction('Resume Sales', () => organizerResumeSales(eventId!))}
                      disabled={!!actionLoading}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-white bg-success hover:bg-success/80 disabled:opacity-50 transition-colors"
                    >
                      {actionLoading === 'Resume Sales' ? 'Resuming…' : 'Confirm Resume'}
                    </button>
                    <button onClick={() => setConfirmAction(null)} className="rounded-lg px-3 py-1.5 text-xs font-medium bg-surface-elevated text-text-secondary hover:text-white transition-colors">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmAction('resume')}
                    className="rounded-lg border border-success/20 bg-success/10 px-4 py-2 text-xs font-medium text-success hover:bg-success/20 transition-colors"
                  >
                    ▶ Resume Sales
                  </button>
                )
              )}

              {/* SOLD OUT — only if not already closed */}
              {!isClosed && (
                confirmAction === 'sold-out' ? (
                  <div className="flex items-center gap-2 rounded-lg border border-error/20 bg-error/5 p-2">
                    <span className="text-xs text-error px-1">Mark as Sold Out? New bookings will be blocked.</span>
                    <button
                      onClick={() => performAction('Mark Sold Out', () => organizerMarkSoldOut(eventId!))}
                      disabled={!!actionLoading}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-white bg-error hover:bg-error/80 disabled:opacity-50 transition-colors"
                    >
                      {actionLoading === 'Mark Sold Out' ? 'Processing…' : 'Confirm'}
                    </button>
                    <button onClick={() => setConfirmAction(null)} className="rounded-lg px-3 py-1.5 text-xs font-medium bg-surface-elevated text-text-secondary hover:text-white transition-colors">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmAction('sold-out')}
                    className="rounded-lg border border-[var(--color-border)] bg-surface-elevated px-4 py-2 text-xs font-medium text-text-secondary hover:text-error hover:border-error/30 transition-colors"
                  >
                    🔴 Mark Sold Out
                  </button>
                )
              )}

              {/* REOPEN — only if closed */}
              {isClosed && (
                confirmAction === 'reopen' ? (
                  <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-2">
                    <span className="text-xs text-primary px-1">Reopen booking? Sales will resume if capacity allows.</span>
                    <button
                      onClick={() => performAction('Reopen Booking', () => organizerReopenBooking(eventId!))}
                      disabled={!!actionLoading}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-white bg-primary hover:bg-primary-hover disabled:opacity-50 transition-colors"
                    >
                      {actionLoading === 'Reopen Booking' ? 'Reopening…' : 'Confirm Reopen'}
                    </button>
                    <button onClick={() => setConfirmAction(null)} className="rounded-lg px-3 py-1.5 text-xs font-medium bg-surface-elevated text-text-secondary hover:text-white transition-colors">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmAction('reopen')}
                    className="rounded-lg border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                  >
                    🟢 Reopen Booking
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Ticket Inventory & Price Controls ──────────── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-surface overflow-hidden">
        <div className="border-b border-[var(--color-border)] bg-surface-elevated px-5 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Ticket Types & Pricing</h2>
          <p className="text-xs text-text-muted">Click Edit to change price or capacity</p>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {ticketTypes.length > 0 ? ticketTypes.map((tt: any) => (
            <TicketTypeRow
              key={tt.id}
              tt={tt}
              eventId={eventId!}
              onUpdated={loadAll}
            />
          )) : (
            <div className="px-5 py-8 text-center text-sm text-text-muted">
              No ticket types found.
            </div>
          )}
        </div>
      </div>

      {/* ── Event Info ─────────────────────────────────── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-surface overflow-hidden">
        <div className="border-b border-[var(--color-border)] bg-surface-elevated px-5 py-3">
          <h2 className="text-sm font-semibold text-white">Event Information</h2>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {[
            { label: 'Date', value: formatDate(event.startAt) },
            { label: 'Time', value: `${formatTime(event.startAt)}${event.endAt ? ` – ${formatTime(event.endAt)}` : ''}` },
            { label: 'Venue', value: event.venueName },
            { label: 'Address', value: event.venueAddress || '—' },
            { label: 'Total Capacity', value: event.totalCapacity > 0 ? String(event.totalCapacity) : 'Unlimited' },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between px-5 py-2.5">
              <span className="text-xs text-text-muted uppercase tracking-wider">{row.label}</span>
              <span className="text-sm text-white text-right max-w-[60%]">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Quick links ────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/organizer/attendees?eventId=${eventId}`}
          className="rounded-lg border border-[var(--color-border)] bg-surface px-4 py-2 text-xs font-medium text-white hover:bg-surface-hover transition-colors"
        >
          Attendees
        </Link>
        <Link
          href={`/organizer/orders?eventId=${eventId}`}
          className="rounded-lg border border-[var(--color-border)] bg-surface px-4 py-2 text-xs font-medium text-white hover:bg-surface-hover transition-colors"
        >
          Orders
        </Link>
        <Link
          href={`/organizer/check-in?eventId=${eventId}`}
          className="rounded-lg border border-[var(--color-border)] bg-surface px-4 py-2 text-xs font-medium text-white hover:bg-surface-hover transition-colors"
        >
          Check-in
        </Link>
      </div>
    </div>
  );
}
