'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';

interface Batch {
  id: string;
  filename: string;
  rowCount: number;
  matchedCount: number;
  unmatchedCount: number;
  status: string;
  createdAt: string;
  uploaded: { id: string; displayName: string };
  _count: { records: number };
}

interface PendingPayment {
  id: string;
  utrNumber: string | null;
  amount: number;
  status: string;
  createdAt: string;
  order: {
    id: string;
    orderNumber: string;
    bookingType: string;
    attendeeCount: number;
    user: { id: string; displayName: string; email: string };
  };
}

interface Stats {
  pendingPayments: number;
  verifiedPayments: number;
  totalBatches: number;
  totalRecords: number;
}

export default function UtrManagementPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'pending' | 'batches'>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [eventTitle, setEventTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [batchRes, eventRes] = await Promise.all([
        fetch(`/api/dashboard/events/${eventId}/utr/batch`),
        fetch(`/api/dashboard/events/${eventId}`),
      ]);

      if (!batchRes.ok) throw new Error('Failed to load UTR data');
      const batchData = await batchRes.json();
      setStats(batchData.stats);
      setBatches(batchData.batches);

      if (eventRes.ok) {
        const eventData = await eventRes.json();
        setEventTitle(eventData.event?.title || '');
      }
    } catch {
      setError('Failed to load UTR management data');
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  const fetchPendingPayments = useCallback(async () => {
    try {
      const res = await fetch(`/api/dashboard/events/${eventId}/attendees?status=PENDING_PAYMENT&limit=100`);
      if (!res.ok) return;
      const data = await res.json();
      setPendingPayments(data.tickets || []);
    } catch { /* ignore */ }
  }, [eventId]);

  useEffect(() => {
    fetchData();
    fetchPendingPayments();
  }, [fetchData, fetchPendingPayments]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/dashboard/events/${eventId}/utr/batch`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setUploadMessage({ type: 'error', text: data.error || 'Upload failed' });
      } else {
        setUploadMessage({ type: 'success', text: data.message || 'Bank statement processed successfully!' });
        fetchData();
        fetchPendingPayments();
      }
    } catch {
      setUploadMessage({ type: 'error', text: 'Upload failed. Please try again.' });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  }

  async function handleManualVerify(paymentId: string) {
    setVerifyingId(paymentId);
    try {
      const res = await fetch(`/api/dashboard/events/${eventId}/utr/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      });

      const data = await res.json();

      if (res.ok) {
        setUploadMessage({ type: 'success', text: data.message || 'Payment verified!' });
        fetchData();
        fetchPendingPayments();
      } else {
        setUploadMessage({ type: 'error', text: data.error || 'Verification failed' });
      }
    } catch {
      setUploadMessage({ type: 'error', text: 'Verification failed' });
    } finally {
      setVerifyingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton variant="text" className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton variant="card" className="h-24" />
          <Skeleton variant="card" className="h-24" />
          <Skeleton variant="card" className="h-24" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon="⚠️"
        title="Error"
        description={error}
        action={{ label: 'Try Again', onClick: () => fetchData() }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/dashboard/events/${eventId}`}
          className="text-sm text-primary transition-colors hover:text-primary-hover mb-1 inline-block"
        >
          ← Back to Event
        </Link>
        <h1 className="text-2xl font-bold text-white">UTR Payment Verification</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {eventTitle} — Upload bank statements to auto-verify UTR payments
        </p>
      </div>

      {/* Upload banner */}
      {uploadMessage && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            uploadMessage.type === 'success'
              ? 'border-success/30 bg-success-bg text-success'
              : 'border-error/30 bg-error-bg text-error'
          }`}
        >
          {uploadMessage.text}
          <button
            onClick={() => setUploadMessage(null)}
            className="ml-3 text-xs opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card variant="default" padding="md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <span className="text-lg">⏳</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.pendingPayments}</p>
                <p className="text-xs text-text-muted">Pending Verifications</p>
              </div>
            </div>
          </Card>
          <Card variant="default" padding="md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <span className="text-lg">✅</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.verifiedPayments}</p>
                <p className="text-xs text-text-muted">Verified Payments</p>
              </div>
            </div>
          </Card>
          <Card variant="default" padding="md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <span className="text-lg">📄</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalBatches}</p>
                <p className="text-xs text-text-muted">Statement Uploads</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Upload bank statement */}
      <Card variant="default" padding="lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Upload Bank Statement</h3>
            <p className="mt-1 text-xs text-text-muted">
              Download your bank statement as CSV and upload it here. The system will automatically match UTR numbers with pending payments.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline" size="sm">CSV format</Badge>
              <Badge variant="outline" size="sm">12-digit UTR numbers</Badge>
              <Badge variant="outline" size="sm">Auto-matches payments</Badge>
            </div>
          </div>
          <div className="shrink-0">
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-primary-hover hover:-translate-y-0.5 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              {isUploading ? 'Uploading...' : 'Upload CSV'}
              <input
                type="file"
                accept=".csv,.txt,text/csv"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploading}
              />
            </label>
          </div>
        </div>
      </Card>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-[var(--color-border)] pb-2">
        {[
          { id: 'overview' as const, label: '📊 Overview' },
          { id: 'pending' as const, label: `⏳ Pending (${stats?.pendingPayments || 0})` },
          { id: 'batches' as const, label: '📁 Upload History' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-primary bg-primary/5 text-primary'
                : 'text-text-muted hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* How it works */}
          <Card variant="default" padding="lg">
            <h3 className="text-sm font-semibold text-white mb-3">How UTR Verification Works</h3>
            <div className="space-y-3 text-sm text-text-secondary">
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">1</div>
                <p>Attendees register for your event and enter their 12-digit UPI UTR/Ref number during checkout. Their tickets are held with <strong>PENDING_PAYMENT</strong> status.</p>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">2</div>
                <p>Download your bank statement from your banking app (HDFC, SBI, Paytm, Google Pay, etc.) as a CSV file. It should contain the UTR numbers of incoming payments.</p>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">3</div>
                <p>Upload the CSV file using the form above. The system scans for 12-digit UTR numbers and automatically matches them against pending payments.</p>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">4</div>
                <p>Matched payments are automatically verified, orders are confirmed, and tickets are issued. Unmatched UTRs remain pending for manual review.</p>
              </div>
            </div>
          </Card>

          {/* Quick stats */}
          {batches.length > 0 && (
            <Card variant="default" padding="lg">
              <h3 className="text-sm font-semibold text-white mb-3">Recent Activity</h3>
              <div className="space-y-2">
                {batches.slice(0, 5).map((batch) => (
                  <div key={batch.id} className="flex items-center justify-between rounded-lg bg-surface-elevated p-3 text-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg shrink-0">📄</span>
                      <div className="min-w-0">
                        <p className="truncate text-white font-medium">{batch.filename}</p>
                        <p className="text-xs text-text-muted">
                          {batch.rowCount} records • {batch.matchedCount} matched • {batch.unmatchedCount} unmatched
                        </p>
                      </div>
                    </div>
                    <Badge variant={batch.matchedCount > 0 ? 'success' : 'warning'} size="sm">
                      {batch.matchedCount > 0 ? `${batch.matchedCount} verified` : 'No matches'}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Pending payments tab */}
      {activeTab === 'pending' && (
        <div className="space-y-3">
          {(pendingPayments.length === 0 && (!stats || stats.pendingPayments === 0)) ? (
            <EmptyState
              icon="✅"
              title="No pending payments"
              description="All UTR payments have been verified. Upload a bank statement to auto-verify, or check back later."
            />
          ) : pendingPayments.length === 0 ? (
            <div className="space-y-3">
              <EmptyState
                icon="📤"
                title="Upload a bank statement to verify"
                description="Use the upload form above to upload your bank statement CSV. The system will automatically match UTR numbers."
              />
              <div className="text-center text-sm text-text-muted">
                <p>{stats?.pendingPayments || 0} payments are waiting for verification</p>
              </div>
            </div>
          ) : (
            pendingPayments.map((payment: any) => (
              <div
                key={payment.id}
                className="flex items-center gap-4 rounded-lg border border-[var(--color-border)] bg-surface p-4 transition-colors hover:bg-surface-hover"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10 text-sm font-bold text-warning shrink-0">
                  ⏳
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white truncate">
                      {payment.attendee?.fullName || payment.user?.displayName || 'Unknown'}
                    </p>
                    <Badge variant="warning" size="sm">PENDING</Badge>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                    <span>{payment.attendee?.email || payment.user?.email}</span>
                    <span className="font-mono">{payment.ticketNumber}</span>
                    {payment.order?.bookingType && <span>{payment.order.bookingType}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Button
                    variant="primary"
                    size="sm"
                    isLoading={verifyingId === payment.id}
                    onClick={() => handleManualVerify(payment.id)}
                  >
                    Verify Manually
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Batches tab */}
      {activeTab === 'batches' && (
        <div className="space-y-3">
          {batches.length === 0 ? (
            <EmptyState
              icon="📁"
              title="No bank statements uploaded"
              description="Upload a CSV bank statement to start verifying UTR payments automatically."
            />
          ) : (
            batches.map((batch) => (
              <Card key={batch.id} variant="default" padding="md">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📄</span>
                      <p className="font-medium text-white truncate">{batch.filename}</p>
                      <Badge variant={batch.status === 'COMPLETED' ? 'success' : 'warning'} size="sm">
                        {batch.status}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-text-muted">
                      <span>📊 {batch.rowCount} total records</span>
                      <span className="text-success">✅ {batch.matchedCount} matched</span>
                      {batch.unmatchedCount > 0 && (
                        <span className="text-warning">⏳ {batch.unmatchedCount} unmatched</span>
                      )}
                      <span>👤 by {batch.uploaded.displayName}</span>
                      <span>🕐 {new Date(batch.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
