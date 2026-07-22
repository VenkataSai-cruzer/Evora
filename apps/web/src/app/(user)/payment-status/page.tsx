'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { listMyTickets, getMyProofStatus, getOrderByNumber } from '@/lib/api-client';
import { PaymentInstructions } from '@/components/payments/PaymentInstructions';
import { PaymentSubmissionForm } from '@/components/payments/PaymentSubmissionForm';
import { SubmissionSuccess } from '@/components/payments/SubmissionSuccess';
import { OrderTimeline, buildTimelineFromOrder } from '@/components/payments/OrderTimeline';

// ── Payment proof API (multipart upload) ─────────────────────────────
async function submitPaymentProofWithScreenshot(
  orderNumber: string,
  utrNumber: string,
  screenshot: File,
): Promise<{ success: boolean; proof?: { status: string; utrNumber: string } }> {
  const formData = new FormData();
  formData.append('orderNumber', orderNumber);
  formData.append('utrNumber', utrNumber);
  formData.append('screenshot', screenshot);

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:10000/api/v1';

  // Fetch CSRF token first
  let csrfToken: string | null = null;
  try {
    const csrfRes = await fetch(`${apiBase}/auth/csrf`, { credentials: 'include' });
    if (csrfRes.ok) {
      const data = await csrfRes.json();
      csrfToken = data.csrfToken;
    }
  } catch { /* ignore */ }

  const headers: Record<string, string> = {};
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

  const res = await fetch(`${apiBase}/payments/proof`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || `Upload failed (${res.status})`);
  }
  return res.json();
}

function PaymentStatusContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderNumber = searchParams.get('order');
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [proofStatus, setProofStatus] = useState<{
    orderNumber: string;
    orderStatus: string;
    proof: { status: string; utrNumber: string; submittedAt?: string; rejectionReason?: string } | null;
  } | null>(null);
  const [orderDetail, setOrderDetail] = useState<any>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ts] = await Promise.all([listMyTickets()]);
      setTickets(ts);

      const effectiveOrder = orderNumber || ts[0]?.order?.orderNumber;
      if (effectiveOrder) {
        try {
          const [proof, details] = await Promise.all([
            getMyProofStatus(effectiveOrder),
            getOrderByNumber(effectiveOrder).catch(() => null),
          ]);
          setProofStatus(proof);
          setOrderDetail(details?.order || null);
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [orderNumber]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmitProof = async (data: { utrNumber: string; screenshot: File; note?: string }) => {
    const effectiveOrder = orderNumber || tickets[0]?.order?.orderNumber;
    if (!effectiveOrder) throw new Error('Order number not found.');
    await submitPaymentProofWithScreenshot(effectiveOrder, data.utrNumber, data.screenshot);
    setSubmitSuccess(true);
    // Refresh data after submission
    setTimeout(() => loadData(), 1500);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-surface-elevated" />
        <div className="h-40 animate-pulse rounded-xl bg-surface-elevated" />
        <div className="h-60 animate-pulse rounded-xl bg-surface-elevated" />
      </div>
    );
  }

  const effectiveOrderNumber = orderNumber || tickets[0]?.order?.orderNumber || '';
  const hasConfirmedTickets = tickets.some(t => t.status === 'CONFIRMED' || t.status === 'CHECKED_IN');

  const isRejected = proofStatus?.orderStatus === 'REJECTED';
  const isPendingVerification = proofStatus?.orderStatus === 'PENDING_VERIFICATION';
  const hasProof = proofStatus?.proof !== null;
  const proofRejectionReason = proofStatus?.proof?.rejectionReason;

  // Redirect to ticket if confirmed
  if (hasConfirmedTickets && tickets[0]) {
    router.replace(`/tickets/${tickets[0].ticketNumber}`);
    return null;
  }

  // Build timeline if order data available
  const timelineOrder = orderDetail
    ? orderDetail
    : proofStatus
      ? {
          orderNumber: proofStatus.orderNumber,
          status: proofStatus.orderStatus,
          createdAt: orderDetail?.createdAt || new Date().toISOString(),
          updatedAt: orderDetail?.updatedAt || new Date().toISOString(),
          paymentProof: proofStatus.proof || undefined,
          resubmissionCount: orderDetail?.resubmissionCount || 0,
          paidAt: orderDetail?.paidAt || null,
        }
      : null;

  const totalAmount = orderDetail?.total ?? tickets.reduce((sum: number, t: any) => sum + (t.ticketType?.price || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Payment Status</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {isRejected ? 'Your payment was not verified. Please resubmit.' :
           isPendingVerification ? 'Your payment is being reviewed.' :
           'Submit your payment proof for verification'}
        </p>
      </div>

      {/* Order Reference */}
      {effectiveOrderNumber && (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider">Order Reference</p>
              <p className="mt-1 font-mono text-sm text-white">{effectiveOrderNumber}</p>
            </div>
            <div>
              {proofStatus && (
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                  proofStatus.orderStatus === 'CONFIRMED' ? 'bg-success/10 text-success border-success/20' :
                  proofStatus.orderStatus === 'REJECTED' ? 'bg-error/10 text-error border-error/20' :
                  proofStatus.orderStatus === 'PENDING_VERIFICATION' ? 'bg-warning/10 text-warning border-warning/20' :
                  'bg-blue-500/10 text-blue-400 border-blue-500/20'
                }`}>
                  {proofStatus.orderStatus === 'CONFIRMED' ? '✓ Approved' :
                   proofStatus.orderStatus === 'REJECTED' ? '✗ Rejected' :
                   proofStatus.orderStatus === 'PENDING_VERIFICATION' ? '⏳ Pending' :
                   '📋 Awaiting Payment'}
                </span>
              )}
            </div>
          </div>
          {proofStatus?.proof && (
            <div className="mt-2 flex items-center gap-3 text-xs text-text-muted">
              <span>UTR: {proofStatus.proof.utrNumber}</span>
              {proofStatus.proof.submittedAt && (
                <span>
                  Submitted: {new Date(proofStatus.proof.submittedAt).toLocaleDateString('en-IN', {
                    month: 'short', day: 'numeric',
                  })} {new Date(proofStatus.proof.submittedAt).toLocaleTimeString('en-IN', {
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Rejection notice */}
      {isRejected && proofRejectionReason && (
        <div className="rounded-xl border border-error/20 bg-error/5 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-error/10 flex-shrink-0">
              <span className="text-error text-lg">✗</span>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-white">Payment Rejected</h3>
              <p className="mt-1 text-sm text-text-secondary">
                Reason: <span className="text-error font-medium">{proofRejectionReason}</span>
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
                Please submit a new payment proof with the correct details.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payment Instructions — show when awaiting payment or rejected */}
      {(!hasProof || isRejected) && !submitSuccess && (
        <PaymentInstructions
          amount={totalAmount}
          currency="INR"
          eventTitle={orderDetail?.event?.title || tickets[0]?.event?.title}
        />
      )}

      {/* Payment Submission Form */}
      {!hasProof && !submitSuccess && !isPendingVerification && effectiveOrderNumber && (
        <PaymentSubmissionForm
          orderNumber={effectiveOrderNumber}
          isResubmission={false}
          onSubmit={handleSubmitProof}
        />
      )}

      {/* Resubmission Form — for rejected orders */}
      {isRejected && !submitSuccess && effectiveOrderNumber && (
        <PaymentSubmissionForm
          orderNumber={effectiveOrderNumber}
          isResubmission={true}
          previousRejectionReason={proofRejectionReason}
          onSubmit={handleSubmitProof}
        />
      )}

      {/* Success state after submission */}
      {submitSuccess && effectiveOrderNumber && (
        <SubmissionSuccess
          orderNumber={effectiveOrderNumber}
          isResubmission={isRejected}
          verificationSlaHours={6}
          submittedAt={proofStatus?.proof?.submittedAt}
        />
      )}

      {/* Pending verification state */}
      {isPendingVerification && !submitSuccess && effectiveOrderNumber && (
        <div className="rounded-xl border border-warning/20 bg-warning/5 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
              <span className="text-warning text-xl">⏳</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Verification Pending</h2>
              <p className="mt-1 text-sm text-text-secondary">
                Your payment proof has been received and is under review.
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-lg bg-warning/5 border border-warning/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" />
              <p className="text-xs text-warning">Expected review within ~6 hours</p>
            </div>
          </div>
        </div>
      )}

      {/* Order Timeline */}
      {timelineOrder && (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
          <h3 className="text-xs text-text-muted uppercase tracking-wider mb-4">Order Timeline</h3>
          <OrderTimeline events={buildTimelineFromOrder(timelineOrder)} />
        </div>
      )}

      {/* No active bookings */}
      {!effectiveOrderNumber && !hasConfirmedTickets && (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-elevated">
            <svg className="h-8 w-8 text-text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <p className="mt-3 text-sm text-text-muted">No active bookings found.</p>
          <Link
            href="/events"
            className="mt-4 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover"
          >
            Browse Events
          </Link>
        </div>
      )}

      {/* Link back to dashboard */}
      {effectiveOrderNumber && (
        <div className="text-center">
          <Link
            href="/my-event"
            className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-white transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      )}
    </div>
  );
}

export default function PaymentStatusPage() {
  return <Suspense><PaymentStatusContent /></Suspense>;
}
