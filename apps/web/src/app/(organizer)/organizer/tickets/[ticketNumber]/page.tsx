'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getOrganizerTicket, getOrganizerOrder, api, approveOrganizerOrder, rejectOrganizerOrder } from '@/lib/api-client';
import type { AdminTicketDetailResponse } from '@/lib/api-client';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/dates';
import { ScreenshotViewer } from '@/components/verifications/ScreenshotViewer';
import { ApprovalDialog } from '@/components/verifications/ApprovalDialog';
import { RejectDialog } from '@/components/verifications/RejectDialog';

// ── Types for order detail with payment proof ───────────────
interface PaymentProofData {
  id: string;
  utrNumber: string;
  amount: number;
  status: string;
  submittedAt: string;
  rejectionReason?: string | null;
  mimeType?: string | null;
  googleDriveFileId?: string | null;
  storageProvider?: string;
  reviewedAt?: string | null;
}

interface OrderDetailData {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  currency: string;
  paymentProof: PaymentProofData | null;
}

/**
 * Status badge config for payment proof status.
 */
function proofStatusBadge(status: string | undefined | null): { label: string; color: string } {
  switch (status) {
    case 'PENDING':
      return { label: 'Pending Review', color: 'bg-warning/10 text-warning border-warning/20' };
    case 'APPROVED':
      return { label: 'Approved', color: 'bg-success/10 text-success border-success/20' };
    case 'REJECTED':
      return { label: 'Rejected', color: 'bg-error/10 text-error border-error/20' };
    default:
      return { label: status || 'No Proof', color: 'bg-surface-elevated text-text-muted border-[var(--color-border)]' };
  }
}

function formatPrice(amount: number): string {
  return `₹${(amount / 100).toLocaleString()}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function OrganizerTicketDetailPage() {
  const params = useParams();
  const ticketNumber = params.ticketNumber as string;

  // ── State ─────────────────────────────────────────────────
  const [ticket, setTicket] = useState<AdminTicketDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Ticket render preview
  const [renderUrl, setRenderUrl] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  // Order + payment proof
  const [orderDetail, setOrderDetail] = useState<OrderDetailData | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);

  // QR code
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);

  // Actions
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [showApproval, setShowApproval] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // ── Load ticket data ──────────────────────────────────────
  const loadTicket = useCallback(async (isCancelled: () => boolean = () => false) => {
    if (!ticketNumber) return;
    // Revoke previous render URL to avoid blob leaks
    if (renderUrl) URL.revokeObjectURL(renderUrl);
    setLoading(true);
    setError('');
    setRenderUrl(null);
    setRenderError(null);
    setOrderDetail(null);

    try {
      const data = await getOrganizerTicket(ticketNumber);
      if (isCancelled()) return;
      setTicket(data);

      // Load rendered ticket preview (PNG)
      try {
        const result = await api.fetchBinary(`/tickets/${encodeURIComponent(ticketNumber)}/render`);
        if (isCancelled()) return;
        if (!result.contentType.startsWith('image/')) {
          setRenderError('Unexpected response type from render endpoint.');
        } else {
          setRenderUrl(URL.createObjectURL(result.blob));
        }
      } catch (err: any) {
        if (!isCancelled()) setRenderError(err.message || 'Render preview unavailable');
      }

      // Load QR code
      try {
        const qrRes = await api.get<{ qrCodeUrl: string }>(`/tickets/${encodeURIComponent(ticketNumber)}/qr`);
        if (isCancelled()) return;
        setQrDataUrl(qrRes.qrCodeUrl);
      } catch {
        if (!isCancelled()) setQrError(true);
      }

      // If ticket has an order, fetch full order details with payment proof
      if (data.order?.id) {
        setOrderLoading(true);
        try {
          const orderRes = await getOrganizerOrder(data.order.id);
          if (isCancelled()) return;
          setOrderDetail(orderRes.order);
        } catch {
          // Order fetch failed — non-critical, we still show the ticket
          if (!isCancelled()) console.error('Failed to load order details for payment proof');
        } finally {
          if (!isCancelled()) setOrderLoading(false);
        }
      }
    } catch (err: any) {
      if (!isCancelled()) setError(err.message || 'Failed to load ticket');
    } finally {
      if (!isCancelled()) setLoading(false);
    }
  }, [ticketNumber]);

  useEffect(() => {
    let cancelled = false;
    const isCancelled = () => cancelled;

    // Revoke previous render URL before creating a new one
    if (renderUrl) {
      URL.revokeObjectURL(renderUrl);
      setRenderUrl(null);
    }
    setRenderError(null);
    setQrDataUrl(null);
    setQrError(false);

    loadTicket(isCancelled);

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketNumber]);

  // ── Actions ────────────────────────────────────────────────

  const handleApprove = async () => {
    if (!orderDetail) return;
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await approveOrganizerOrder(orderDetail.orderNumber);
      setActionMessage(res.message || 'Payment approved. Tickets generated.');
      setShowApproval(false);
      // Reload to reflect new status
      loadTicket();
    } catch (err: any) {
      setActionMessage(`Approval failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (reason: string, _customMessage?: string) => {
    if (!orderDetail) return;
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await rejectOrganizerOrder(orderDetail.orderNumber, reason);
      setActionMessage(res.message || 'Payment rejected.');
      setShowReject(false);
      loadTicket();
    } catch (err: any) {
      setActionMessage(`Rejection failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!ticketNumber) return;
    setDownloadingPdf(true);
    try {
      const result = await api.fetchBinary(`/tickets/${encodeURIComponent(ticketNumber)}/download`);
      if (result.contentType !== 'application/pdf') {
        throw new Error('Unexpected download format');
      }
      let filename = `${ticketNumber}.pdf`;
      if (result.contentDisposition) {
        const match = result.contentDisposition.match(/filename="?([^";]+)"?/);
        if (match) filename = match[1];
      }
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setActionMessage('Download failed — ticket may need QR migration first.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // ── Derived state ──────────────────────────────────────────

  const paymentProof = orderDetail?.paymentProof ?? null;
  const proofBadge = proofStatusBadge(paymentProof?.status);
  const isPaymentPending = paymentProof?.status === 'PENDING';
  const isOrderConfirmable = orderDetail && ['PENDING_PAYMENT', 'PENDING_VERIFICATION'].includes(orderDetail.status);

  // ── Loading state ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 py-6">
        <div className="h-4 w-24 animate-pulse rounded bg-surface-elevated" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-[400px] animate-pulse rounded-xl bg-surface-elevated" />
          <div className="h-[400px] animate-pulse rounded-xl bg-surface-elevated" />
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-surface-elevated" />
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────
  if (error || !ticket) {
    return (
      <div className="rounded-xl border border-error/20 bg-error/5 p-12 text-center">
        <h1 className="text-xl font-bold text-white">Ticket not found</h1>
        <p className="mt-2 text-sm text-text-secondary">{error || 'This ticket does not exist.'}</p>
        <Link href="/organizer/attendees" className="mt-6 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover transition-colors">
          ← Back to Attendees
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-6">
      {/* ══════ Header ═══════════════════════════════════ */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link href="/organizer/attendees" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-white transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Attendees
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-white">{ticket.ticketNumber}</h1>
        </div>
        <div className="flex items-center gap-2">
          {ticket.ticketCategory === 'COMPLIMENTARY' && (
            <span className="inline-flex items-center rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-400">
              COMPLIMENTARY
            </span>
          )}
          <Badge variant={ticket.status === 'CONFIRMED' ? 'success' : ticket.status === 'CHECKED_IN' ? 'primary' : 'error'}>
            {ticket.status === 'CHECKED_IN' ? 'Checked In' : ticket.status}
          </Badge>
        </div>
      </div>

      {/* ══════ Ticket Preview + Payment Proof (side-by-side) ══ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── Premium Ticket Preview ─────────────────────── */}
        <section className="rounded-xl border border-[var(--color-border)] bg-surface overflow-hidden shadow-lg">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-surface-hover/50 px-5 py-3">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Premium Ticket
            </h2>
            <span className="text-2xs text-text-muted">Preview</span>
          </div>
          <div className="p-4">
            {renderUrl ? (
              <div className="flex justify-center bg-black/10 rounded-lg overflow-hidden">
                <img
                  src={renderUrl}
                  alt={`Premium ticket ${ticketNumber}`}
                  className="max-w-full h-auto"
                  style={{ width: '100%', maxWidth: '420px' }}
                />
              </div>
            ) : renderError ? (
              <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
                <span className="text-4xl mb-3">🎫</span>
                <p className="text-sm font-medium text-white">Preview unavailable</p>
                <p className="mt-1 text-xs text-text-muted max-w-xs">{renderError}</p>
              </div>
            ) : (
              <div className="flex items-center justify-center p-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
          </div>
        </section>

        {/* ── Payment Proof ──────────────────────────────── */}
        <section className="rounded-xl border border-[var(--color-border)] bg-surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-surface-hover/50 px-5 py-3">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Payment Proof
            </h2>
            {paymentProof && (
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-2xs font-medium ${proofBadge.color}`}>
                {proofBadge.label}
              </span>
            )}
          </div>
          <div className="p-4 space-y-4">
            {orderLoading ? (
              <div className="flex items-center justify-center p-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : paymentProof ? (
              <>
                {/* Screenshot */}
                <ScreenshotViewer
                  proofId={paymentProof.id}
                  mimeType={paymentProof.mimeType}
                />

                {/* Payment Details */}
                <div className="rounded-lg bg-surface-elevated/50 border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <span className="text-xs text-text-muted">UTR Number</span>
                    <span className="text-xs font-mono text-primary font-medium">{paymentProof.utrNumber}</span>
                  </div>
                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <span className="text-xs text-text-muted">Expected Amount</span>
                    <span className="text-xs font-semibold text-white">{formatPrice(orderDetail?.total || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <span className="text-xs text-text-muted">Submitted Amount</span>
                    <span className={`text-xs font-semibold ${paymentProof.amount === (orderDetail?.total || 0) ? 'text-success' : 'text-warning'}`}>
                      {formatPrice(paymentProof.amount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <span className="text-xs text-text-muted">Submitted At</span>
                    <span className="text-xs text-white">{formatDateTime(paymentProof.submittedAt)}</span>
                  </div>
                  {paymentProof.reviewedAt && (
                    <div className="flex items-center justify-between px-3.5 py-2.5">
                      <span className="text-xs text-text-muted">Reviewed At</span>
                      <span className="text-xs text-white">{formatDateTime(paymentProof.reviewedAt)}</span>
                    </div>
                  )}
                  {paymentProof.rejectionReason && (
                    <div className="px-3.5 py-2.5">
                      <p className="text-xs text-text-muted mb-0.5">Rejection Reason</p>
                      <p className="text-xs text-error font-medium">{paymentProof.rejectionReason}</p>
                    </div>
                  )}
                </div>

                {/* Approve / Reject Actions */}
                {isPaymentPending && isOrderConfirmable && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setShowApproval(true)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-success px-4 py-2.5 text-sm font-medium text-white hover:bg-success/90 transition-colors shadow-lg shadow-success/20"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Approve
                    </button>
                    <button
                      onClick={() => setShowReject(true)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-error px-4 py-2.5 text-sm font-medium text-white hover:bg-error/90 transition-colors shadow-lg shadow-error/20"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Reject
                    </button>
                  </div>
                )}
              </>
            ) : orderDetail && !ticket.order?.id ? (
              /* Complimentary ticket — no payment needed */
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <span className="text-3xl mb-3">🎁</span>
                <p className="text-sm font-medium text-white">Complimentary Ticket</p>
                <p className="mt-1 text-xs text-text-muted">No payment proof needed for complimentary tickets.</p>
              </div>
            ) : orderDetail ? (
              /* Order exists but no proof submitted yet */
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <span className="text-3xl mb-3">📋</span>
                <p className="text-sm font-medium text-white">No Payment Proof Yet</p>
                <p className="mt-1 text-xs text-text-muted">The attendee has not submitted a payment screenshot.</p>
                <p className="mt-1 text-xs text-text-muted">Order: <span className="font-mono text-primary">{orderDetail.orderNumber}</span></p>
              </div>
            ) : (
              /* No order associated */
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <span className="text-3xl mb-3">🎟️</span>
                <p className="text-sm font-medium text-white">No Payment Information</p>
                <p className="mt-1 text-xs text-text-muted">This ticket is not linked to an order.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ══════ Action Feedback ════════════════════════════ */}
      {actionMessage && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${
          actionMessage.includes('failed') || actionMessage.includes('Failed')
            ? 'border-error/20 bg-error/5 text-error'
            : 'border-success/20 bg-success/5 text-success'
        }`}>
          <div className="flex items-center gap-2">
            {actionMessage.includes('failed') || actionMessage.includes('Failed') ? (
              <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            ) : (
              <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span>{actionMessage}</span>
            <button onClick={() => setActionMessage(null)} className="ml-auto text-text-muted hover:text-white transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ══════ Info Sections ══════════════════════════════ */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event Info */}
          <section className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
            <h2 className="mb-3 text-sm font-semibold text-white uppercase tracking-wider">Event</h2>
            <div className="space-y-2">
              <Link href={`/organizer/events/${ticket.event.id}`} className="text-primary hover:underline font-medium">
                {ticket.event.title}
              </Link>
              <p className="text-sm text-text-muted">
                {formatDate(ticket.event.startAt)}{ticket.event.endAt ? ` - ${formatDate(ticket.event.endAt)}` : ''}
              </p>
              <p className="text-sm text-text-muted">{ticket.event.venueName}{ticket.event.venueAddress ? `, ${ticket.event.venueAddress}` : ''}</p>
            </div>
          </section>

          {/* Attendee Info */}
          <section className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
            <h2 className="mb-3 text-sm font-semibold text-white uppercase tracking-wider">Attendee</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-text-muted">Name</p>
                <p className="text-white">{ticket.attendeeName || ticket.user?.name || '-'}</p>
              </div>
              <div>
                <p className="text-text-muted">Email</p>
                <p className="text-white">{ticket.attendeeEmail || ticket.user?.email || '-'}</p>
              </div>
              <div>
                <p className="text-text-muted">Phone</p>
                <p className="text-white">{ticket.attendeePhone || '-'}</p>
              </div>
              <div>
                <p className="text-text-muted">Account</p>
                <p className="text-white">{ticket.user?.name || 'No account'}</p>
              </div>
            </div>
          </section>

          {/* Ticket Details */}
          <section className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
            <h2 className="mb-3 text-sm font-semibold text-white uppercase tracking-wider">Ticket Details</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-text-muted">Ticket Number</p>
                <p className="font-mono text-white">{ticket.ticketNumber}</p>
              </div>
              <div>
                <p className="text-text-muted">Type</p>
                <p className="text-white">{ticket.ticketType?.name || '-'}</p>
              </div>
              <div>
                <p className="text-text-muted">Category</p>
                <p className="text-white">{ticket.ticketCategory}</p>
              </div>
              <div>
                <p className="text-text-muted">Source</p>
                <p className="text-white">{ticket.source}</p>
              </div>
              <div>
                <p className="text-text-muted">Price Paid</p>
                <p className="text-white">₹{(ticket.pricePaid / 100).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-text-muted">Visibility</p>
                <p className="text-white">{ticket.visibility}</p>
              </div>
              <div>
                <p className="text-text-muted">Issued By</p>
                <p className="text-white">{ticket.issuedBy?.name || '-'}</p>
              </div>
              <div>
                <p className="text-text-muted">Issued At</p>
                <p className="text-white">{formatDate(ticket.issuedAt)}</p>
              </div>
            </div>
          </section>

          {/* Order Info */}
          {ticket.order && (
            <section className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
              <h2 className="mb-3 text-sm font-semibold text-white uppercase tracking-wider">Order</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-text-muted">Order Number</p>
                  <p className="font-mono text-white">{ticket.order.orderNumber}</p>
                </div>
                <div>
                  <p className="text-text-muted">Order Status</p>
                  <p className="text-white">{ticket.order.status}</p>
                </div>
                <div>
                  <p className="text-text-muted">Total</p>
                  <p className="text-white">₹{(ticket.order.total / 100).toFixed(2)}</p>
                </div>
              </div>
            </section>
          )}

          {/* Check-in Info */}
          {ticket.checkIn && (
            <section className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
              <h2 className="mb-3 text-sm font-semibold text-white uppercase tracking-wider">Check-in</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-text-muted">Status</p>
                  <Badge variant="primary">Checked In</Badge>
                </div>
                <div>
                  <p className="text-text-muted">Time</p>
                  <p className="text-white">{formatDate(ticket.checkIn.checkedInAt)}</p>
                </div>
                <div>
                  <p className="text-text-muted">Gate</p>
                  <p className="text-white">{ticket.checkIn.gateName || '-'}</p>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Sidebar — QR + Actions */}
        <div className="space-y-4">
          {/* QR Code Preview */}
          <section className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
            <h2 className="mb-3 text-sm font-semibold text-white uppercase tracking-wider">Ticket QR</h2>
            {qrError ? (
              <div className="flex h-48 items-center justify-center rounded-lg bg-surface-hover">
                <p className="text-xs text-text-muted">QR preview unavailable</p>
              </div>
            ) : qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Ticket QR Code"
                className="mx-auto h-48 w-48 rounded-lg"
              />
            ) : (
              <div className="flex h-48 items-center justify-center rounded-lg bg-surface-hover">
                <p className="text-xs text-text-muted">Loading QR...</p>
              </div>
            )}
          </section>

          {/* Actions */}
          <section className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
            <h2 className="mb-3 text-sm font-semibold text-white uppercase tracking-wider">Actions</h2>
            <div className="space-y-2">
              <Link
                href={`/tickets/${ticket.ticketNumber}`}
                target="_blank"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                View Public Page
              </Link>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/tickets/${ticket.ticketNumber}`;
                  navigator.clipboard.writeText(url);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-surface px-4 py-2 text-sm text-text-muted hover:text-white hover:bg-surface-hover transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
                Copy Ticket Link
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-surface px-4 py-2 text-sm text-text-muted hover:text-white hover:bg-surface-hover disabled:opacity-50 transition-colors"
              >
                {downloadingPdf ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-text-muted border-t-transparent" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Download PDF
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* ══════ Dialogs ════════════════════════════════════ */}
      <ApprovalDialog
        open={showApproval}
        onClose={() => setShowApproval(false)}
        onConfirm={handleApprove}
        loading={actionLoading}
        order={orderDetail ? {
          orderNumber: orderDetail.orderNumber,
          total: orderDetail.total,
          eventTitle: ticket.event.title,
          attendeeCount: 1,
          utrNumber: paymentProof?.utrNumber,
        } : undefined}
      />

      <RejectDialog
        open={showReject}
        onClose={() => setShowReject(false)}
        onReject={handleReject}
        loading={actionLoading}
        orderNumber={orderDetail?.orderNumber}
      />
    </div>
  );
}
