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

  // Redirect if no order context
  useEffect(() => {
    if (!loading && !orderNumber && tickets.length === 0) {
      router.replace('/my-bookings');
    }
  }, [loading, orderNumber, tickets, router]);

  const handleSubmitProof = async (data: { utrNumber: string; screenshot: File; note?: string }) => {
    const effectiveOrder = orderNumber || tickets[0]?.order?.orderNumber;
    if (!effectiveOrder) throw new Error('Order number not found.');
    await submitPaymentProofWithScreenshot(effectiveOrder, data.utrNumber, data.screenshot);
    setSubmitSuccess(true);
    setTimeout(() => loadData(), 1500);
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-surface-elevated" />
        <div className="h-40 animate-pulse rounded-xl bg-surface-elevated" />
        <div className="h-60 animate-pulse rounded-xl bg-surface-elevated" />
      </div>
    );
  }

  const effectiveOrderNumber = orderNumber || tickets[0]?.order?.orderNumber || '';

  // Redirect if no order context after load
  if (!effectiveOrderNumber) {
    return null; // Redirect happens in the useEffect above
  }

  const hasConfirmedTickets = tickets.some(t => t.status === 'CONFIRMED' || t.status === 'CHECKED_IN');

  // If already confirmed, redirect to tickets
  if (hasConfirmedTickets && tickets[0]) {
    router.replace(`/tickets/${tickets[0].ticketNumber}`);
    return null;
  }

  const isPendingPayment = proofStatus?.orderStatus === 'PENDING_PAYMENT';
  const isPendingVerification = proofStatus?.orderStatus === 'PENDING_VERIFICATION';
  const isRejected = proofStatus?.orderStatus === 'REJECTED';
  const hasProof = proofStatus?.proof !== null;
  const proofRejectionReason = proofStatus?.proof?.rejectionReason;

  // Build timeline
  const timelineOrder = orderDetail
    ? orderDetail
    : proofStatus
      ? {
          orderNumber: proofStatus.orderNumber,
          status: proofStatus.orderStatus,
          createdAt: orderDetail?.createdAt || new Date().toISOString(),
          updatedAt: orderDetail?.updatedAt || new Date().toISOString(),
          paymentProof: proofStatus.proof || undefined,
        }
      : null;
  const timelineEvents = timelineOrder ? buildTimelineFromOrder(timelineOrder) : [];

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href={`/my-bookings/${encodeURIComponent(effectiveOrderNumber)}`}
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-white transition-colors"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to Booking
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Payment</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {isPendingVerification
            ? 'Your payment is under review'
            : isRejected
              ? 'Resubmit your payment proof'
              : 'Complete your payment to confirm your booking'}
        </p>
      </div>

      {/* Timeline (if events exist) */}
      {timelineEvents.length > 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
          <h3 className="text-xs text-text-muted uppercase tracking-wider mb-4">Progress</h3>
          <OrderTimeline events={timelineEvents} />
        </div>
      )}

      {/* Payment Instructions (always show for pending payment) */}
      {isPendingPayment && (
        <PaymentInstructions
          amount={orderDetail?.total || 0}
          eventTitle={orderDetail?.event?.title}
        />
      )}

      {/* Payment Submission Form */}
      {(isPendingPayment || isRejected) && !submitSuccess && (
        <PaymentSubmissionForm
          orderNumber={effectiveOrderNumber}
          isResubmission={isRejected}
          previousRejectionReason={proofRejectionReason || undefined}
          onSubmit={handleSubmitProof}
          onSuccess={() => loadData()}
        />
      )}

      {/* Submission Success */}
      {submitSuccess && (
        <SubmissionSuccess
          orderNumber={effectiveOrderNumber}
          isResubmission={isRejected}
        />
      )}

      {/* Already submitted state */}
      {isPendingVerification && !submitSuccess && (
        <div className="rounded-xl border border-warning/20 bg-warning/5 p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning/10">
            <svg className="h-7 w-7 text-warning" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white">Payment Under Review</h3>
          <p className="mt-1 text-sm text-text-secondary">
            Your proof has been submitted and is being verified. We&apos;ll notify you once it&apos;s approved.
          </p>
          <Link
            href={`/my-bookings/${encodeURIComponent(effectiveOrderNumber)}`}
            className="mt-6 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
          >
            Back to Booking
          </Link>
        </div>
      )}
    </div>
  );
}

export default function PaymentStatusPage() {
  return (
    <Suspense fallback={
      <div className="max-w-xl mx-auto space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-surface-elevated" />
        <div className="h-40 animate-pulse rounded-xl bg-surface-elevated" />
      </div>
    }>
      <PaymentStatusContent />
    </Suspense>
  );
}
