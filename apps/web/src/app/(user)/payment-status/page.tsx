'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { listMyTickets, api } from '@/lib/api-client';

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
  const [utr, setUtr] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [proofStatus, setProofStatus] = useState<{ status: string; utrNumber: string; rejectionReason?: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [ts] = await Promise.all([listMyTickets()]);
        setTickets(ts);
        // Try to fetch proof status
        const effectiveOrder = orderNumber || ts[0]?.order?.orderNumber;
        if (effectiveOrder) {
          try {
            const proof = await api.get<any>(`/payments/my-proof/${effectiveOrder}`);
            setProofStatus(proof?.proof);
          } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    load();
  }, [orderNumber]);

  const effectiveOrderNumber = orderNumber || tickets[0]?.order?.orderNumber || '';
  const isConfirmed = tickets.some(t => t.status === 'CONFIRMED' || t.status === 'CHECKED_IN');
  const hasPending = tickets.some(t => t.order?.status === 'PENDING_PAYMENT');
  const isRejected = tickets.some(t => t.order?.status === 'CANCELLED') && !hasPending;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setSubmitResult({ type: 'error', message: 'File too large. Maximum size is 5 MB.' });
      return;
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setSubmitResult({ type: 'error', message: 'Invalid file type. Use JPEG, PNG, or WebP.' });
      return;
    }
    setScreenshot(file);
    setScreenshotPreview(URL.createObjectURL(file));
    setSubmitResult(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!utr.trim()) return;
    if (!screenshot) { setSubmitResult({ type: 'error', message: 'Please attach a payment screenshot.' }); return; }
    if (!effectiveOrderNumber) { setSubmitResult({ type: 'error', message: 'Order number not found.' }); return; }
    setSubmitting(true);
    setSubmitResult(null);
    try {
      await submitPaymentProofWithScreenshot(effectiveOrderNumber, utr.trim(), screenshot);
      setSubmitResult({ type: 'success', message: 'Payment proof submitted. Verification in progress.' });
      setUtr('');
      setScreenshot(null);
      setScreenshotPreview(null);
      setTimeout(async () => {
        try { const ts = await listMyTickets(); setTickets(ts); } catch { /* ignore */ }
      }, 1000);
    } catch (err: any) {
      setSubmitResult({ type: 'error', message: err.message || 'Submission failed. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="space-y-4"><div className="h-8 w-48 animate-pulse rounded bg-surface-elevated" /><div className="h-40 animate-pulse rounded-xl bg-surface-elevated" /></div>;
  }

  if (isConfirmed && tickets[0]) {
    router.replace(`/tickets/${tickets[0].ticketNumber}`);
    return null;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Payment Status</h1>
      {effectiveOrderNumber && (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-4">
          <p className="text-xs text-text-muted uppercase tracking-wider">Order Reference</p>
          <p className="mt-1 font-mono text-sm text-white">{effectiveOrderNumber}</p>
          {proofStatus && (
            <div className="mt-2 flex items-center gap-2">
              <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${proofStatus.status === 'APPROVED' ? 'bg-success/10 text-success' : proofStatus.status === 'REJECTED' ? 'bg-error/10 text-error' : proofStatus.status === 'PENDING' ? 'bg-warning/10 text-warning' : 'bg-blue-500/10 text-blue-400'}`}>
                Proof: {proofStatus.status}
              </span>
              {proofStatus.utrNumber && <span className="text-xs text-text-muted">UTR: {proofStatus.utrNumber}</span>}
            </div>
          )}
        </div>
      )}

      {proofStatus?.status === 'REJECTED' && proofStatus.rejectionReason && (
        <div className="rounded-xl border border-error/20 bg-error/5 p-4">
          <p className="text-sm font-medium text-error">Payment Rejected</p>
          <p className="mt-1 text-xs text-text-muted">Reason: {proofStatus.rejectionReason}</p>
        </div>
      )}

      {proofStatus?.status === 'RESUBMISSION_REQUESTED' && (
        <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
          <p className="text-sm font-medium text-orange-400">Resubmission Required</p>
          <p className="mt-1 text-xs text-text-muted">{proofStatus.rejectionReason || 'Please resubmit your payment proof.'}</p>
        </div>
      )}

      {(hasPending || isRejected || !proofStatus) && (
        <>
          <div className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
            <h3 className="text-sm font-semibold text-white">Payment Instructions</h3>
            <ol className="mt-3 list-decimal list-inside space-y-2 text-sm text-text-secondary">
              <li>Open your UPI app (Google Pay, PhonePe, Paytm, etc.)</li>
              <li>Send payment to: <span className="font-mono text-white">payments@7notes</span></li>
              <li>Note the UTR / Transaction Reference number shown after payment</li>
              <li>Take a screenshot of the payment confirmation screen</li>
              <li>Enter the UTR and upload the screenshot below</li>
            </ol>
          </div>

          <form onSubmit={handleSubmit} className="rounded-xl border border-[var(--color-border)] bg-surface p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">Submit Payment Proof</h3>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">UTR / Transaction Reference <span className="text-error">*</span></label>
              <input
                type="text"
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                placeholder="e.g. 412345678901"
                className="w-full rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2.5 text-sm text-white placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">Payment Screenshot <span className="text-error">*</span></label>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full rounded-lg border-2 border-dashed border-[var(--color-border)] p-4 text-center hover:border-primary transition-colors">
                {screenshotPreview ? (
                  <img src={screenshotPreview} alt="Screenshot" className="mx-auto max-h-32 rounded object-contain" />
                ) : (
                  <span className="text-xs text-text-muted">Click to upload screenshot (JPEG, PNG, WebP — max 5 MB)</span>
                )}
              </button>
              {screenshot && <p className="mt-1 text-xs text-text-muted">{screenshot.name} ({(screenshot.size / 1024).toFixed(0)} KB)</p>}
            </div>

            {submitResult && (
              <div className={`rounded-lg px-3 py-2 text-xs ${submitResult.type === 'success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                {submitResult.message}
              </div>
            )}

            <button type="submit" disabled={submitting || !utr.trim() || !screenshot} className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50">
              {submitting ? 'Uploading...' : 'Submit Payment Proof'}
            </button>
            <p className="text-xs text-text-muted">Your screenshot will be verified manually. This usually takes a few hours.</p>
          </form>
        </>
      )}

      {proofStatus?.status === 'PENDING' && (
        <div className="rounded-xl border border-warning/20 bg-warning/5 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10"><span className="text-warning text-lg">⏳</span></div>
            <div><h2 className="text-lg font-semibold text-white">Verification Pending</h2><p className="text-sm text-text-secondary">Your payment proof has been received and is under review.</p></div>
          </div>
        </div>
      )}

      {!hasPending && !isRejected && !isConfirmed && !proofStatus && (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-12 text-center">
          <p className="text-text-muted">No active bookings found.</p>
          <Link href="/events" className="mt-4 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover">Browse Events</Link>
        </div>
      )}
    </div>
  );
}

export default function PaymentStatusPage() {
  return <Suspense><PaymentStatusContent /></Suspense>;
}
