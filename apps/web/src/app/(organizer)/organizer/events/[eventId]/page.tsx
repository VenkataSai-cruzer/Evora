'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  getOrganizerEvent,
  organizerMarkSoldOut,
  organizerReopenBooking,
} from '@/lib/api-client';
import { formatDate, formatTime } from '@/lib/dates';

export default function OrganizerEventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const loadEvent = useCallback(async () => {
    if (!eventId) return;
    try {
      const ev = await getOrganizerEvent(eventId);
      setEvent(ev);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load event');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { loadEvent(); }, [loadEvent]);

  const performAction = async (action: string, fn: () => Promise<void>) => {
    setActionLoading(action);
    setFeedback(null);
    setConfirmAction(null);
    try {
      await fn();
      await loadEvent();
      setFeedback({ type: 'success', message: `${action} completed successfully.` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || `${action} failed.` });
    } finally {
      setActionLoading(null);
    }
  };

  // ── Loading ───────────────────────────────────────────
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
        <Link href="/organizer/events" className="text-sm text-text-muted hover:text-white transition-colors">&larr; My Events</Link>
        <div className="rounded-xl border border-error/20 bg-error/5 p-12 text-center">
          <p className="text-lg font-semibold text-white">Event not found</p>
          <p className="mt-1 text-sm text-text-secondary">{error || 'You do not have access to this event or it does not exist.'}</p>
          <Link href="/organizer/events" className="mt-6 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover transition-colors">
            My Events
          </Link>
        </div>
      </div>
    );
  }

  const isSoldOutNatural = event.ticketTypes?.length > 0 &&
    event.ticketTypes.some((tt: any) => tt.capacity > 0) &&
    event.ticketTypes.every((tt: any) => tt.capacity <= 0 || tt.soldCount >= tt.capacity);

  return (
    <div className="space-y-6">
      {/* ── Back link ──────────────────────────────────── */}
      <Link href="/organizer/events" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-white transition-colors">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        My Events
      </Link>

      {/* ── Feedback toast ─────────────────────────────── */}
      {feedback && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${
          feedback.type === 'success'
            ? 'border-success/20 bg-success/5 text-success'
            : 'border-error/20 bg-error/5 text-error'
        }`}>
          {feedback.message}
          <button onClick={() => setFeedback(null)} className="ml-3 float-right opacity-60 hover:opacity-100">&times;</button>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{event.title}</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {formatDate(event.startAt)} at {formatTime(event.startAt)} &middot; {event.venueName}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              event.status === 'PUBLISHED' ? 'bg-success/10 text-success' :
              event.status === 'DRAFT' ? 'bg-text-muted/10 text-text-muted' :
              event.status === 'CANCELLED' ? 'bg-error/10 text-error' :
              'bg-surface-elevated text-text-secondary'
            }`}>
              {event.status}
            </span>
            {event.salesPaused && (
              <span className="inline-flex items-center rounded-full bg-warning/10 text-warning px-2.5 py-0.5 text-xs font-medium">
                Paused
              </span>
            )}
            {event.bookingClosed && (
              <span className="inline-flex items-center rounded-full bg-error/10 text-error px-2.5 py-0.5 text-xs font-medium">
                {isSoldOutNatural ? 'Sold Out' : 'Closed'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Action Buttons ──────────────────────────────── */}
      {(event.status === 'PUBLISHED') && (
        <div className="flex flex-wrap gap-2">
          {!event.bookingClosed && (
            <div suppressHydrationWarning>
              {confirmAction === 'mark-sold-out' ? (
                <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-surface p-2">
                  <span className="text-xs text-text-secondary whitespace-nowrap px-1">
                    Mark this event as sold out? New bookings will be blocked.
                  </span>
                  <button
                    onClick={() => performAction('Mark Sold Out', () => organizerMarkSoldOut(eventId!))}
                    disabled={actionLoading === 'Mark Sold Out'}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-white bg-error hover:bg-error/80 transition-colors"
                  >
                    {actionLoading === 'Mark Sold Out' ? 'Processing...' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => setConfirmAction(null)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium bg-surface-elevated text-text-secondary hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmAction('mark-sold-out')}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium bg-error/10 text-error hover:bg-error/20 transition-colors"
                >
                  Mark Sold Out
                </button>
              )}
            </div>
          )}
          {!!event.bookingClosed && (
            <div suppressHydrationWarning>
              {confirmAction === 'reopen' ? (
                <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-surface p-2">
                  <span className="text-xs text-text-secondary whitespace-nowrap px-1">
                    Reopen booking? Public status will become LIVE if conditions allow.
                  </span>
                  <button
                    onClick={() => performAction('Reopen Booking', () => organizerReopenBooking(eventId!))}
                    disabled={actionLoading === 'Reopen Booking'}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-white bg-primary hover:bg-primary-hover transition-colors"
                  >
                    {actionLoading === 'Reopen Booking' ? 'Processing...' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => setConfirmAction(null)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium bg-surface-elevated text-text-secondary hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmAction('reopen')}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  Reopen Booking
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Inventory / Ticket Types ─────────────────────── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-surface overflow-hidden">
        <div className="border-b border-[var(--color-border)] bg-surface-elevated px-5 py-3">
          <h2 className="text-sm font-semibold text-white">Ticket Inventory</h2>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {event.ticketTypes?.length > 0 ? event.ticketTypes.map((tt: any) => {
            const remaining = tt.capacity > 0 ? Math.max(0, tt.capacity - tt.soldCount) : null;
            const pct = tt.capacity > 0 ? Math.round((tt.soldCount / tt.capacity) * 100) : 0;
            return (
              <div key={tt.id} className="px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-white">{tt.name}</p>
                    <p className="text-xs text-text-muted">
                      ₹{(tt.price / 100).toFixed(2)} &middot; Max {tt.maxPerOrder} per order
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">
                      {tt.soldCount} / {tt.capacity > 0 ? tt.capacity : '∞'}
                    </p>
                    <p className="text-xs text-text-muted">
                      {remaining !== null ? `${remaining} remaining` : 'Unlimited'}
                    </p>
                  </div>
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
              </div>
            );
          }) : (
            <div className="px-5 py-8 text-center text-sm text-text-muted">
              No ticket types configured for this event.
            </div>
          )}
        </div>
      </div>

      {/* ── Event Info ──────────────────────────────────── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-surface overflow-hidden">
        <div className="border-b border-[var(--color-border)] bg-surface-elevated px-5 py-3">
          <h2 className="text-sm font-semibold text-white">Event Information</h2>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {[
            { label: 'Date', value: `${formatDate(event.startAt)} at ${formatTime(event.startAt)}` },
            { label: 'End', value: event.endAt ? `${formatDate(event.endAt)} at ${formatTime(event.endAt)}` : 'N/A' },
            { label: 'Venue', value: event.venueName },
            { label: 'Address', value: event.venueAddress || 'N/A' },
            { label: 'Total Capacity', value: event.totalCapacity > 0 ? String(event.totalCapacity) : 'Unlimited' },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between px-5 py-2.5">
              <span className="text-xs text-text-muted uppercase tracking-wider">{row.label}</span>
              <span className="text-sm text-white text-right max-w-[60%] truncate">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Quick Links ────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <Link href={`/organizer/events/${eventId}/attendees`} className="rounded-lg border border-[var(--color-border)] bg-surface px-4 py-2 text-xs font-medium text-white hover:bg-surface-hover transition-colors">
          View Attendees
        </Link>
        <Link href={`/organizer/check-in?eventId=${eventId}`} className="rounded-lg border border-[var(--color-border)] bg-surface px-4 py-2 text-xs font-medium text-white hover:bg-surface-hover transition-colors">
          Check-in
        </Link>
      </div>
    </div>
  );
}
