'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getAdminEvent, publishEvent, pauseSales, resumeSales, closeSales, markSoldOut, reopenBooking } from '@/lib/api-client';
import { formatDate, formatTime } from '@/lib/dates';

export default function AdminEventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const loadEvent = useCallback(async () => {
    if (!id) return;
    try {
      const ev = await getAdminEvent(id);
      setEvent(ev);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load event');
    } finally {
      setLoading(false);
    }
  }, [id]);

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

  const actions = [
    {
      key: 'publish',
      label: 'Publish',
      visible: event?.status === 'DRAFT',
      variant: 'primary' as const,
      fn: () => publishEvent(id!),
    },
    {
      key: 'pause',
      label: 'Pause Sales',
      visible: event?.status === 'PUBLISHED' && !event?.salesPaused && !event?.bookingClosed,
      variant: 'warning' as const,
      fn: () => pauseSales(id!),
    },
    {
      key: 'resume',
      label: 'Resume Sales',
      visible: event?.status === 'PUBLISHED' && !!event?.salesPaused && !event?.bookingClosed,
      variant: 'success' as const,
      fn: () => resumeSales(id!),
    },
    {
      key: 'mark-sold-out',
      label: 'Mark Sold Out',
      visible: event?.status === 'PUBLISHED' && !event?.bookingClosed,
      confirmMessage: 'Mark this event as sold out? New bookings will be blocked immediately. Existing orders and tickets will not be affected.',
      variant: 'error' as const,
      fn: () => markSoldOut(id!),
    },
    {
      key: 'reopen',
      label: 'Reopen Booking',
      visible: event?.status === 'PUBLISHED' && !!event?.bookingClosed,
      confirmMessage: 'Reopen booking for this event? Public status will become LIVE if capacity and dates allow.',
      variant: 'primary' as const,
      fn: () => reopenBooking(id!),
    },
    {
      key: 'close',
      label: 'Close Sales',
      visible: event?.status === 'PUBLISHED' && !event?.bookingClosed,
      confirmMessage: 'Permanently close booking for this event? This cannot be undone through normal operations.',
      variant: 'error' as const,
      fn: () => closeSales(id!),
    },
  ];

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
        <Link href="/admin/events" className="text-sm text-text-muted hover:text-white transition-colors">&larr; Events</Link>
        <div className="rounded-xl border border-error/20 bg-error/5 p-12 text-center">
          <p className="text-lg font-semibold text-white">Event not found</p>
          <p className="mt-1 text-sm text-text-secondary">{error || 'This event does not exist.'}</p>
          <Link href="/admin/events" className="mt-6 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover transition-colors">
            Back to Events
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
      <Link href="/admin/events" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-white transition-colors">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Events
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
      {actions.some((a) => a.visible) && (
        <div className="flex flex-wrap gap-2">
          {actions
            .filter((a) => a.visible)
            .map((action) => (
              <div key={action.key}>
                {confirmAction === action.key ? (
                  <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-surface p-2">
                    <span className="text-xs text-text-secondary whitespace-nowrap px-1">{action.confirmMessage}</span>
                    <button
                      onClick={() => performAction(action.label, action.fn)}
                      disabled={actionLoading === action.label}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors ${
                        action.variant === 'error' ? 'bg-error hover:bg-error/80' :
                        action.variant === 'warning' ? 'bg-warning hover:bg-warning/80 text-black' :
                        'bg-primary hover:bg-primary-hover'
                      }`}
                    >
                      {actionLoading === action.label ? 'Processing...' : 'Confirm'}
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
                    onClick={() => action.confirmMessage ? setConfirmAction(action.key) : performAction(action.label, action.fn)}
                    disabled={actionLoading === action.label}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      action.variant === 'error' ? 'bg-error/10 text-error hover:bg-error/20' :
                      action.variant === 'warning' ? 'bg-warning/10 text-warning hover:bg-warning/20' :
                      'bg-primary/10 text-primary hover:bg-primary/20'
                    }`}
                  >
                    {actionLoading === action.label ? 'Processing...' : action.label}
                  </button>
                )}
              </div>
            ))}
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
            { label: 'Slug', value: event.slug },
            { label: 'Date', value: `${formatDate(event.startAt)} at ${formatTime(event.startAt)}` },
            { label: 'End', value: event.endAt ? `${formatDate(event.endAt)} at ${formatTime(event.endAt)}` : 'N/A' },
            { label: 'Venue', value: event.venueName },
            { label: 'Address', value: event.venueAddress || 'N/A' },
            { label: 'Total Capacity', value: event.totalCapacity > 0 ? String(event.totalCapacity) : 'Unlimited' },
            { label: 'Sales Start', value: event.salesStartAt ? formatDate(event.salesStartAt) : 'Immediately' },
            { label: 'Sales End', value: event.salesEndAt ? formatDate(event.salesEndAt) : 'Until event' },
            { label: 'Organizer', value: event.organizer?.name || event.organizerId },
            { label: 'Contact Email', value: event.contactEmail || 'N/A' },
            { label: 'Contact Phone', value: event.contactPhone || 'N/A' },
            { label: 'Ticket Prefix', value: event.ticketNumberPrefix || 'None' },
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
        <Link href={`/admin/events/${id}/attendees`} className="rounded-lg border border-[var(--color-border)] bg-surface px-4 py-2 text-xs font-medium text-white hover:bg-surface-hover transition-colors">
          View Attendees
        </Link>
        <Link href={`/admin/events/${id}/check-ins`} className="rounded-lg border border-[var(--color-border)] bg-surface px-4 py-2 text-xs font-medium text-white hover:bg-surface-hover transition-colors">
          Check-ins
        </Link>
        <Link href={`/admin/complimentary?eventId=${id}`} className="rounded-lg border border-[var(--color-border)] bg-surface px-4 py-2 text-xs font-medium text-white hover:bg-surface-hover transition-colors">
          Complimentary Tickets
        </Link>
      </div>
    </div>
  );
}
