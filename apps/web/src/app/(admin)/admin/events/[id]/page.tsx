'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  getAdminEvent,
  publishEvent,
  pauseSales,
  resumeSales,
  closeSales,
  markSoldOut,
  reopenBooking,
  updateAdminTicketType,
} from '@/lib/api-client';
import { formatDate, formatTime } from '@/lib/dates';

// ── Inline ticket type editor row ────────────────────────────
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

  const reset = () => {
    setPrice(String(tt.price / 100));
    setCapacity(String(tt.capacity));
    setMaxPerOrder(String(tt.maxPerOrder));
    setErr('');
    setEditing(false);
  };

  const save = async () => {
    setSaving(true);
    setErr('');
    try {
      const priceNum = Math.round(parseFloat(price) * 100);
      const capNum = parseInt(capacity, 10);
      const maxNum = parseInt(maxPerOrder, 10);
      if (isNaN(priceNum) || priceNum < 0) { setErr('Invalid price'); setSaving(false); return; }
      if (isNaN(capNum) || capNum < tt.soldCount) {
        setErr(`Capacity can't be less than ${tt.soldCount} already sold`);
        setSaving(false); return;
      }
      if (isNaN(maxNum) || maxNum < 1) { setErr('Max per order must be at least 1'); setSaving(false); return; }
      await updateAdminTicketType(eventId, tt.id, {
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
      {/* Top row */}
      <div className="flex items-start justify-between gap-4 mb-3">
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
              onClick={reset}
              className="rounded-lg border border-[var(--color-border)] bg-surface-elevated px-3 py-1 text-xs font-medium text-text-secondary hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Read mode */}
      {!editing ? (
        <>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-text-secondary">
              ₹{(tt.price / 100).toFixed(0)} &middot; max {tt.maxPerOrder}/order
            </span>
            <span className="font-semibold text-white">
              {tt.soldCount}/{tt.capacity > 0 ? tt.capacity : '∞'}
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
        /* Edit mode */
        <div className="grid grid-cols-3 gap-3">
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
            <p className="text-xs text-text-muted mt-0.5">{tt.soldCount} sold</p>
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
          {err && <p className="col-span-3 text-xs text-error mt-1">{err}</p>}
        </div>
      )}
    </div>
  );
}

// ── Main admin event detail page ──────────────────────────────
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
      setFeedback({ type: 'success', message: `${action} — done.` });
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
      confirm: null,
      variant: 'primary' as const,
      fn: () => publishEvent(id!),
    },
    {
      key: 'pause',
      label: 'Pause Sales',
      visible: event?.status === 'PUBLISHED' && !event?.salesPaused && !event?.bookingClosed,
      confirm: 'Pause sales? No new bookings will be accepted.',
      variant: 'warning' as const,
      fn: () => pauseSales(id!),
    },
    {
      key: 'resume',
      label: 'Resume Sales',
      visible: event?.status === 'PUBLISHED' && !!event?.salesPaused && !event?.bookingClosed,
      confirm: 'Resume sales? Bookings will be open again.',
      variant: 'success' as const,
      fn: () => resumeSales(id!),
    },
    {
      key: 'mark-sold-out',
      label: 'Mark Sold Out',
      visible: event?.status === 'PUBLISHED' && !event?.bookingClosed,
      confirm: 'Mark sold out? New bookings will be blocked. Existing orders unaffected.',
      variant: 'error' as const,
      fn: () => markSoldOut(id!),
    },
    {
      key: 'reopen',
      label: 'Reopen Booking',
      visible: event?.status === 'PUBLISHED' && !!event?.bookingClosed,
      confirm: 'Reopen booking? Public status will become LIVE if capacity allows.',
      variant: 'primary' as const,
      fn: () => reopenBooking(id!),
    },
    {
      key: 'close',
      label: 'Close Sales',
      visible: event?.status === 'PUBLISHED' && !event?.bookingClosed,
      confirm: 'Permanently close sales? This cannot be undone through normal operations.',
      variant: 'error' as const,
      fn: () => closeSales(id!),
    },
  ];

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
        <Link href="/admin/events" className="text-sm text-text-muted hover:text-white">&larr; Events</Link>
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
    <div className="space-y-6 max-w-2xl">

      {/* Back */}
      <Link href="/admin/events" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-white transition-colors">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Events
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
        <h1 className="text-2xl font-bold text-white">{event.title}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {formatDate(event.startAt)} at {formatTime(event.startAt)} &middot; {event.venueName}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            event.status === 'PUBLISHED' ? 'bg-success/10 text-success' :
            event.status === 'DRAFT' ? 'bg-surface-elevated text-text-muted' :
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

      {/* Event lifecycle controls */}
      {actions.some((a) => a.visible) && (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface overflow-hidden">
          <div className="border-b border-[var(--color-border)] bg-surface-elevated px-5 py-3">
            <h2 className="text-sm font-semibold text-white">Event Controls</h2>
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            {actions.filter((a) => a.visible).map((action) => (
              <div key={action.key}>
                {confirmAction === action.key ? (
                  <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-surface-elevated p-2">
                    <span className="text-xs text-text-secondary px-1 max-w-xs">{action.confirm}</span>
                    <button
                      onClick={() => performAction(action.label, action.fn)}
                      disabled={actionLoading === action.label}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 transition-colors ${
                        action.variant === 'error' ? 'bg-error hover:bg-error/80' :
                        action.variant === 'warning' ? 'bg-warning hover:bg-warning/80 text-black' :
                        action.variant === 'success' ? 'bg-success hover:bg-success/80' :
                        'bg-primary hover:bg-primary-hover'
                      }`}
                    >
                      {actionLoading === action.label ? 'Processing…' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setConfirmAction(null)}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium bg-surface text-text-secondary hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => action.confirm ? setConfirmAction(action.key) : performAction(action.label, action.fn)}
                    disabled={!!actionLoading}
                    className={`rounded-lg px-4 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
                      action.variant === 'error' ? 'bg-error/10 text-error hover:bg-error/20 border border-error/20' :
                      action.variant === 'warning' ? 'bg-warning/10 text-warning hover:bg-warning/20 border border-warning/20' :
                      action.variant === 'success' ? 'bg-success/10 text-success hover:bg-success/20 border border-success/20' :
                      'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20'
                    }`}
                  >
                    {actionLoading === action.label ? 'Processing…' : action.label}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ticket types with inline editing */}
      <div className="rounded-xl border border-[var(--color-border)] bg-surface overflow-hidden">
        <div className="border-b border-[var(--color-border)] bg-surface-elevated px-5 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Ticket Types & Pricing</h2>
          <p className="text-xs text-text-muted">Click Edit to change price or capacity</p>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {event.ticketTypes?.length > 0 ? event.ticketTypes.map((tt: any) => (
            <TicketTypeRow
              key={tt.id}
              tt={tt}
              eventId={id!}
              onUpdated={loadEvent}
            />
          )) : (
            <div className="px-5 py-8 text-center text-sm text-text-muted">
              No ticket types configured.
            </div>
          )}
        </div>
      </div>

      {/* Event info */}
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
            { label: 'Organizer', value: event.organizer?.name || event.organizerId },
            { label: 'Contact Email', value: event.contactEmail || 'N/A' },
            { label: 'Ticket Prefix', value: event.ticketNumberPrefix || 'None' },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between px-5 py-2.5">
              <span className="text-xs text-text-muted uppercase tracking-wider">{row.label}</span>
              <span className="text-sm text-white text-right max-w-[60%] truncate">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-3">
        <Link href={`/admin/events/${id}/attendees`} className="rounded-lg border border-[var(--color-border)] bg-surface px-4 py-2 text-xs font-medium text-white hover:bg-surface-hover transition-colors">
          Attendees
        </Link>
        <Link href={`/admin/events/${id}/check-ins`} className="rounded-lg border border-[var(--color-border)] bg-surface px-4 py-2 text-xs font-medium text-white hover:bg-surface-hover transition-colors">
          Check-ins
        </Link>
        <Link href={`/admin/complimentary?eventId=${id}`} className="rounded-lg border border-[var(--color-border)] bg-surface px-4 py-2 text-xs font-medium text-white hover:bg-surface-hover transition-colors">
          Complimentary Tickets
        </Link>
        <Link href={`/admin/orders?eventId=${id}`} className="rounded-lg border border-[var(--color-border)] bg-surface px-4 py-2 text-xs font-medium text-white hover:bg-surface-hover transition-colors">
          Orders
        </Link>
      </div>
    </div>
  );
}
