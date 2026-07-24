'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { ScreenshotViewer } from '@/components/verifications/ScreenshotViewer';
import { PaymentHistoryTimeline } from '@/components/verifications/PaymentHistoryTimeline';

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  PENDING_VERIFICATION: 'bg-warning/10 text-warning border-warning/20',
  CONFIRMED: 'bg-success/10 text-success border-success/20',
  REJECTED: 'bg-error/10 text-error border-error/20',
  CANCELLED: 'bg-surface-elevated text-text-muted border-[var(--color-border)]',
};

function formatPrice(total: number): string {
  return `₹${(total / 100).toLocaleString()}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderId) return;
    api
      .get<{ order: any }>(`/admin/orders/${orderId}`)
      .then((res) => setOrder(res.order))
      .catch(() => setError('Order not found'))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-48 animate-pulse rounded bg-surface-elevated" />
        <div className="h-32 animate-pulse rounded-xl bg-surface-elevated" />
        <div className="h-48 animate-pulse rounded-xl bg-surface-elevated" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-6">
        <Link href="/admin/orders" className="text-sm text-text-muted hover:text-white transition-colors">&larr; Orders</Link>
        <div className="rounded-xl border border-error/20 bg-error/5 p-12 text-center">
          <h1 className="text-xl font-bold text-white">Order not found</h1>
          <p className="mt-2 text-sm text-text-secondary">{error || 'This order does not exist.'}</p>
          <Link href="/admin/orders" className="mt-6 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover transition-colors">View all orders</Link>
        </div>
      </div>
    );
  }

  const proof = order.paymentProof || null;
  const tickets = order.tickets || [];
  const attendees = order.attendees || [];

  return (
    <div className="space-y-6">
      <Link href="/admin/orders" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-white transition-colors">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Orders
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white">Order {order.orderNumber}</h1>
          <p className="mt-1 text-xs text-text-muted">Created {formatDateTime(order.createdAt)}</p>
        </div>
        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${STATUS_COLORS[order.status] || STATUS_COLORS.CANCELLED}`}>
          {order.status}
        </span>
      </div>

      {/* ── Customer Details ──────────────────────────────── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
        <p className="text-xs text-text-muted uppercase tracking-wider mb-3">Customer Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-text-muted">Name</p>
            <p className="text-sm font-medium text-white mt-0.5">{order.user?.name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Email</p>
            <p className="text-sm text-white mt-0.5 break-all">{order.user?.email || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Phone</p>
            <p className="text-sm font-mono text-white mt-0.5">{order.user?.phone || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">User ID</p>
            <p className="text-xs font-mono text-text-secondary mt-0.5 break-all">{order.userId}</p>
          </div>
        </div>
      </div>

      {/* ── Order Details ─────────────────────────────────── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
        <p className="text-xs text-text-muted uppercase tracking-wider mb-3">Order Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-text-muted">Event</p>
            <p className="text-sm font-medium text-white mt-0.5">{order.event?.title || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Event Date</p>
            <p className="text-sm text-white mt-0.5">{order.event?.startAt ? formatDateTime(order.event.startAt) : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Venue</p>
            <p className="text-sm text-white mt-0.5">{order.event?.venueName || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Total Amount</p>
            <p className="text-sm font-bold text-white mt-0.5">{formatPrice(order.total)}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Payment Method</p>
            <p className="text-sm text-white mt-0.5">{order.paymentMethod || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Resubmission Count</p>
            <p className="text-sm text-white mt-0.5">{order.resubmissionCount || 0}</p>
          </div>
          {order.paidAt && (
            <div>
              <p className="text-xs text-text-muted">Paid At</p>
              <p className="text-sm text-white mt-0.5">{formatDateTime(order.paidAt)}</p>
            </div>
          )}
          {order.expiresAt && (
            <div>
              <p className="text-xs text-text-muted">Expires At</p>
              <p className="text-sm text-white mt-0.5">{formatDateTime(order.expiresAt)}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Attendees ──────────────────────────────────────── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
        <p className="text-xs text-text-muted uppercase tracking-wider mb-3">
          Attendees ({attendees.length})
        </p>
        {attendees.length === 0 ? (
          <p className="text-sm text-text-muted">No attendees recorded.</p>
        ) : (
          <div className="space-y-2">
            {attendees.map((a: any, i: number) => (
              <div key={a.id || i} className="rounded-lg bg-surface-elevated p-3">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-text-muted">Name:</span>{' '}
                    <span className="text-white font-medium">{a.attendeeName}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Email:</span>{' '}
                    <span className="text-white">{a.attendeeEmail || '—'}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Phone:</span>{' '}
                    <span className="text-white font-mono">{a.attendeePhone || '—'}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Ticket Type:</span>{' '}
                    <span className="text-white">{a.ticketType?.name || '—'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Payment Proof ──────────────────────────────────── */}
      {proof ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-3">
            Payment Proof
            <span className={`ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-2xs font-medium ${
              proof.status === 'APPROVED' ? 'bg-success/10 text-success border-success/20' :
              proof.status === 'REJECTED' ? 'bg-error/10 text-error border-error/20' :
              proof.status === 'RESUBMISSION_REQUESTED' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
              'bg-warning/10 text-warning border-warning/20'
            }`}>
              {proof.status}
            </span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-text-muted">UTR Number</p>
              <p className="text-sm font-mono text-white mt-0.5">{proof.utrNumber}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Amount</p>
              <p className="text-sm text-white mt-0.5">{formatPrice(proof.amount)}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Submitted At</p>
              <p className="text-sm text-white mt-0.5">{formatDateTime(proof.submittedAt)}</p>
            </div>
          </div>
          {proof.rejectionReason && (
            <div className="rounded-md bg-error/5 border border-error/10 px-3 py-2 mb-4">
              <p className="text-xs text-error font-medium">Rejection Reason</p>
              <p className="text-sm text-text-secondary mt-0.5">{proof.rejectionReason}</p>
            </div>
          )}
          {proof.reviewedBy && (
            <div className="text-xs text-text-muted mb-4">
              Reviewed by {proof.reviewedBy?.name || 'Unknown'}{proof.reviewedAt ? ` at ${formatDateTime(proof.reviewedAt)}` : ''}
            </div>
          )}
          <ScreenshotViewer
            proofId={proof.id}
            mimeType={proof.mimeType}
            googleDriveViewUrl={proof.googleDriveViewUrl}
          />
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
          <p className="text-xs text-text-muted uppercase tracking-wider">Payment Proof</p>
          <p className="mt-2 text-sm text-text-secondary">No payment proof submitted.</p>
        </div>
      )}

      {/* ── Payment History ────────────────────────────────── */}
      <PaymentHistoryTimeline
        currentProof={proof}
        archivedProofs={order.paymentProofHistory || []}
        loading={false}
      />

      {/* ── Issued Tickets ──────────────────────────────────── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
        <p className="text-xs text-text-muted uppercase tracking-wider mb-3">
          Tickets ({tickets.length})
        </p>
        {tickets.length === 0 ? (
          <p className="text-sm text-text-muted">No tickets issued for this order.</p>
        ) : (
          <div className="space-y-2">
            {tickets.map((t: any) => (
              <div key={t.id} className="rounded-lg bg-surface-elevated p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-white">{t.ticketNumber}</span>
                  <span className="text-xs text-text-muted">{t.ticketCategory}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${
                    t.status === 'CONFIRMED' ? 'text-success' :
                    t.status === 'CHECKED_IN' ? 'text-primary' :
                    'text-text-muted'
                  }`}>
                    {t.status}
                  </span>
                  {t.ticketNumber && (
                    <Link
                      href={`/tickets/${t.ticketNumber}`}
                      target="_blank"
                      className="rounded border border-[var(--color-border)] px-2 py-0.5 text-2xs text-text-secondary hover:text-white transition-colors"
                    >
                      View
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
