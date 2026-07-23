'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api-client';
import { formatDate, formatTime } from '@/lib/dates';
import { formatPrice } from '@/lib/format';

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  PENDING_PAYMENT: { label: 'Awaiting Payment', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  PENDING_VERIFICATION: { label: 'Under Review', color: 'bg-warning/10 text-warning border-warning/20' },
  CONFIRMED: { label: 'Confirmed', color: 'bg-success/10 text-success border-success/20' },
  REJECTED: { label: 'Rejected', color: 'bg-error/10 text-error border-error/20' },
  CANCELLED: { label: 'Cancelled', color: 'bg-surface-elevated text-text-muted border-[var(--color-border)]' },
  EXPIRED: { label: 'Expired', color: 'bg-surface-elevated text-text-muted border-[var(--color-border)]' },
};

function Timeline({ events }: { events: Array<{ label: string; timestamp: string; status: 'completed' | 'pending' | 'rejected' | 'archived' }> }) {
  if (!events?.length) return null;
  return (
    <div className="relative space-y-0">
      {events.map((evt, i) => (
        <div key={i} className="relative flex items-start gap-3 pb-4 last:pb-0">
          <div className={`relative z-10 mt-1 h-3 w-3 flex-shrink-0 rounded-full border-2 ${
            evt.status === 'completed' ? 'bg-success border-success' :
            evt.status === 'rejected' ? 'bg-error border-error' :
            evt.status === 'pending' ? 'bg-warning border-warning' :
            'bg-surface-elevated border-[var(--color-border)]'
          }`} />
          {i < events.length - 1 && (
            <div className={`absolute left-[5px] top-3.5 bottom-0 w-0.5 ${
              evt.status === 'completed' ? 'bg-success/30' :
              evt.status === 'rejected' ? 'bg-error/30' :
              'bg-[var(--color-border)]'
            }`} />
          )}
          <div className="flex-1 min-w-0 pt-0">
            <p className="text-sm text-white">{evt.label}</p>
            <p className="text-xs text-text-muted">
              {new Date(evt.timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BookingDetailPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrder = useCallback(async () => {
    if (!orderNumber) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get<{ order: any }>(`/users/me/orders/${encodeURIComponent(orderNumber)}`);
      setOrder(res.order);
    } catch (err: any) {
      setError(err.message || 'Failed to load booking');
    } finally {
      setLoading(false);
    }
  }, [orderNumber]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  if (loading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <div className="h-6 w-48 animate-pulse rounded bg-surface-elevated" />
        <div className="h-8 w-64 animate-pulse rounded bg-surface-elevated" />
        <div className="h-40 animate-pulse rounded-xl bg-surface-elevated" />
        <div className="h-40 animate-pulse rounded-xl bg-surface-elevated" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-2xl space-y-6">
        <Link href="/my-bookings" className="text-sm text-text-muted hover:text-white transition-colors">&larr; My Bookings</Link>
        <div className="rounded-xl border border-error/20 bg-error/5 p-8 text-center">
          <p className="text-sm text-text-secondary">{error || 'Booking not found'}</p>
          <Link href="/my-bookings" className="mt-4 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover transition-colors">
            Back to My Bookings
          </Link>
        </div>
      </div>
    );
  }

  const cfg = STATUS_BADGE[order.status] || STATUS_BADGE.CANCELLED;
  const attendees = order.attendees || [];
  const tickets = order.tickets || [];
  const proof = order.paymentProof;
  const proofHistory = order.paymentProofHistory || [];
  const hasTickets = tickets.length > 0;
  const isActionable = order.status === 'PENDING_PAYMENT' || order.status === 'REJECTED';

  // Build timeline
  const timeline: Array<{ label: string; timestamp: string; status: 'completed' | 'pending' | 'rejected' | 'archived' }> = [
    { label: 'Booking created', timestamp: order.createdAt, status: 'completed' },
  ];
  if (proof?.submittedAt) {
    timeline.push({
      label: proof.status === 'REJECTED' ? 'Payment rejected' : 'Proof submitted',
      timestamp: proof.submittedAt,
      status: proof.status === 'REJECTED' ? 'rejected' : 'completed',
    });
  }
  for (const h of proofHistory) {
    timeline.push({
      label: h.status === 'REJECTED' ? 'Previous attempt rejected' : 'Previous attempt',
      timestamp: h.submittedAt,
      status: 'archived',
    });
  }
  if (proof?.reviewedAt && proof.status === 'APPROVED') {
    timeline.push({ label: 'Payment approved', timestamp: proof.reviewedAt, status: 'completed' });
  }
  if (order.status === 'CONFIRMED') {
    timeline.push({ label: 'Tickets issued', timestamp: order.updatedAt, status: 'completed' });
  }
  if (order.status === 'REJECTED') {
    timeline.push({ label: 'Resubmission available', timestamp: order.updatedAt, status: 'pending' });
  }
  timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return (
    <div className="max-w-2xl space-y-6">
      {/* Back link */}
      <Link href="/my-bookings" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-white transition-colors">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        My Bookings
      </Link>

      {/* Status header */}
      <div className="rounded-xl border border-[var(--color-border)] bg-surface p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white">{order.event?.title || 'Booking'}</h1>
            <p className="mt-1 text-xs text-text-muted font-mono">{order.orderNumber}</p>
          </div>
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium flex-shrink-0 ${cfg.color}`}>
            {cfg.label}
          </span>
        </div>
        {isActionable && (
          <div className="mt-4">              <Link
                href={`/payment-status?order=${order.orderNumber}`}
                className="inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
              >
                {order.status === 'PENDING_PAYMENT' ? 'Continue Payment' : 'Resubmit Proof'}
              </Link>
          </div>
        )}
        {order.status === 'PENDING_VERIFICATION' && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-warning/5 border border-warning/10 px-4 py-3">
            <div className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" />
            <p className="text-xs text-warning">Your proof is under review. We&apos;ll notify you once verified.</p>
          </div>
        )}
      </div>

      {/* Event details */}
      <div className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
        <h3 className="text-xs text-text-muted uppercase tracking-wider mb-3">Event Details</h3>
        <div className="space-y-2 text-sm">
          {order.event?.startAt && (
            <div className="flex justify-between">
              <span className="text-text-secondary">Date</span>
              <span className="text-white">{formatDate(order.event.startAt)}</span>
            </div>
          )}
          {order.event?.startAt && (
            <div className="flex justify-between">
              <span className="text-text-secondary">Time</span>
              <span className="text-white">{formatTime(order.event.startAt)}</span>
            </div>
          )}
          {order.event?.venueName && (
            <div className="flex justify-between">
              <span className="text-text-secondary">Venue</span>
              <span className="text-white">{order.event.venueName}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-text-secondary">Amount</span>
            <span className="text-white font-semibold">{formatPrice(order.total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Attendees</span>
            <span className="text-white">{attendees.length}</span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
        <h3 className="text-xs text-text-muted uppercase tracking-wider mb-4">Progress</h3>
        <Timeline events={timeline} />
      </div>

      {/* Attendees */}
      {attendees.length > 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
          <h3 className="text-xs text-text-muted uppercase tracking-wider mb-3">
            Attendees ({attendees.length})
          </h3>
          <div className="space-y-2">
            {attendees.map((a: any, i: number) => (
              <div key={a.id || i} className="flex items-center justify-between rounded-lg bg-surface-elevated px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{a.attendeeName}</p>
                  {a.attendeeEmail && <p className="text-xs text-text-muted">{a.attendeeEmail}</p>}
                </div>
                {tickets[i] && (
                  <Link href={`/tickets/${tickets[i].ticketNumber}`} className="text-xs text-primary hover:text-primary-hover transition-colors">
                    View Ticket &rarr;
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment details */}
      {proof && (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
          <h3 className="text-xs text-text-muted uppercase tracking-wider mb-3">Payment Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">UTR</span>
              <span className="text-white font-mono">{proof.utrNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Amount</span>
              <span className="text-white">{formatPrice(proof.amount || order.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Submitted</span>
              <span className="text-white">
                {proof.submittedAt ? new Date(proof.submittedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
              </span>
            </div>
            {proof.rejectionReason && (
              <div className="mt-2 rounded-lg bg-error/5 border border-error/10 px-4 py-3">
                <p className="text-xs font-medium text-error">Rejection reason</p>
                <p className="text-xs text-text-secondary mt-0.5">{proof.rejectionReason}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tickets */}
      {hasTickets && (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs text-text-muted uppercase tracking-wider">Tickets</h3>
            <span className="text-xs text-success">{tickets.length} issued</span>
          </div>
          <div className="space-y-2">
            {tickets.map((t: any) => (
              <Link
                key={t.id}
                href={`/tickets/${t.ticketNumber}`}
                className="flex items-center justify-between rounded-lg bg-surface-elevated px-4 py-3 hover:bg-surface-hover transition-colors"
              >
                <div>
                  <p className="text-sm text-white font-mono">{t.ticketNumber}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {t.status === 'CONFIRMED' ? 'Active' : t.status === 'CHECKED_IN' ? 'Checked in' : t.status}
                  </p>
                </div>
                <span className="text-xs text-primary">View &rarr;</span>
              </Link>
            ))}
          </div>
          <Link
            href={`/tickets`}
            className="mt-3 inline-flex h-9 items-center rounded-lg bg-surface-elevated px-4 text-xs font-medium text-white hover:bg-surface-hover transition-colors"
          >
            View All Tickets
          </Link>
        </div>
      )}

      {/* No tickets message */}
      {!hasTickets && order.status === 'CONFIRMED' && (
        <div className="rounded-xl border border-warning/20 bg-warning/5 p-5">
          <p className="text-sm text-warning">Tickets are being generated. Check back shortly.</p>
        </div>
      )}

      {/* Bottom actions */}
      <div className="flex gap-3">
        <Link href="/my-bookings" className="flex-1 rounded-lg border border-[var(--color-border)] bg-surface-elevated px-4 py-3 text-center text-xs font-medium text-text-secondary hover:text-white hover:bg-surface-hover transition-colors">
          &larr; All Bookings
        </Link>
        <Link href="/events" className="flex-1 rounded-lg border border-[var(--color-border)] bg-surface-elevated px-4 py-3 text-center text-xs font-medium text-text-secondary hover:text-white hover:bg-surface-hover transition-colors">
          Browse Events
        </Link>
      </div>
    </div>
  );
}
