'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, checkUtr } from '@/lib/api-client';
import {
  VerificationStats,
  VerificationFilters,
  VerificationQueue,
  OrderSummaryCard,
  PaymentDetailsCard,
  ScreenshotViewer,
  DuplicateUtrWarning,
  PaymentHistoryTimeline,
  ApprovalDialog,
  RejectDialog,
  ResubmissionDialog,
} from '@/components/verifications';

export default function AdminVerificationsPage() {
  // ── State ─────────────────────────────────────────────────
  const [orders, setOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState('PENDING_PAYMENT');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [orderDetail, setOrderDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Stats (unfiltered counts)
  const [stats, setStats] = useState({
    pending: 0,
    pendingVerification: 0,
    approved: 0,
    rejected: 0,
  });

  // Duplicate UTR
  const [utrCheck, setUtrCheck] = useState<{
    loading: boolean;
    result: any | null;
  }>({ loading: false, result: null });

  // Ticket link after approval
  const [lastApproval, setLastApproval] = useState<{
    ticketNumbers: string[];
    orderNumber: string;
  } | null>(null);

  // Dialogs
  const [showApproval, setShowApproval] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showResubmit, setShowResubmit] = useState(false);

  // ── Data Loading ───────────────────────────────────────────
  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch filtered orders for queue
      const [res, statsRes] = await Promise.all([
        api.get<{ orders: any[]; total: number }>(
          `/admin/orders?status=${filter}&limit=50`,
        ),
        // Fetch unfiltered count for stats (limit=1, no filter = all)
        api.get<{ orders: any[]; total: number }>('/admin/orders?limit=200').catch(() => null),
      ]);
      setOrders(res.orders);
      setTotal(res.total);

      // Compute stats from unfiltered data
      if (statsRes) {
        const s = { pending: 0, pendingVerification: 0, approved: 0, rejected: 0 };
        for (const o of statsRes.orders) {
          if (o.status === 'PENDING_PAYMENT') s.pending++;
          else if (o.status === 'PENDING_VERIFICATION') s.pendingVerification++;
          else if (o.status === 'CONFIRMED') s.approved++;
          else if (o.status === 'REJECTED') s.rejected++;
        }
        setStats(s);
      }

      // If the selected order is no longer in the list, deselect
      if (selectedOrder && !res.orders.find((o: any) => o.id === selectedOrder.id)) {
        setSelectedOrder(null);
        setOrderDetail(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // Load order detail when selected
  useEffect(() => {
    if (!selectedOrder) return;

    setDetailLoading(true);
    setUtrCheck({ loading: false, result: null });

    api
      .get<{ order: any }>(`/admin/orders/${selectedOrder.id}`)
      .then((res) => {
        setOrderDetail(res.order);
        // Check UTR for duplicates
        const utr = res.order?.paymentProof?.utrNumber;
        if (utr) {
          setUtrCheck((prev) => ({ ...prev, loading: true }));
          checkUtr(utr)
            .then((result) => setUtrCheck({ loading: false, result }))
            .catch(() => setUtrCheck({ loading: false, result: null }));
        }
      })
      .catch(() => setOrderDetail(null))
      .finally(() => setDetailLoading(false));
  }, [selectedOrder?.id]);

  // ── Actions ─────────────────────────────────────────────────
  async function handleApprove() {
    if (!selectedOrder) return;
    setActionLoading(true);
    setError('');
    try {
      const res = await api.post<{
        success: boolean;
        message: string;
        data?: { orderNumber: string; ticketsCreated: number; ticketNumbers: string[] };
      }>(`/admin/orders/${selectedOrder.id}/approve`, {
        expectedProofUpdatedAt: orderDetail?.paymentProof?.updatedAt,
      });
      setShowApproval(false);
      // Save ticket info for display
      if (res.data?.ticketNumbers?.length) {
        setLastApproval({
          ticketNumbers: res.data.ticketNumbers,
          orderNumber: res.data.orderNumber,
        });
      }
      setSelectedOrder(null);
      setOrderDetail(null);
      await loadOrders();
    } catch (err: any) {
      // Handle 409 Conflict specifically
      if (err.message?.includes('409') || err.statusCode === 409) {
        setError('This payment was modified or reviewed by another user. Refresh the order to view its latest status.');
      } else {
        setError(err.message || 'Approval failed');
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(reason: string, customMessage?: string) {
    if (!selectedOrder) return;
    setActionLoading(true);
    setError('');
    try {
      await api.post(`/admin/orders/${selectedOrder.id}/reject`, {
        reason: customMessage ? `${reason} — ${customMessage}` : reason,
      });
      setShowReject(false);
      setSelectedOrder(null);
      setOrderDetail(null);
      await loadOrders();
    } catch (err: any) {
      setError(err.message || 'Rejection failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRequestResubmission(message?: string) {
    if (!selectedOrder) return;
    setActionLoading(true);
    setError('');
    try {
      await api.post(`/admin/orders/${selectedOrder.id}/request-resubmission`, {
        message,
      });
      setShowResubmit(false);
      setSelectedOrder(null);
      setOrderDetail(null);
      await loadOrders();
    } catch (err: any) {
      setError(err.message || 'Request failed');
    } finally {
      setActionLoading(false);
    }
  }

  // ── Derived state ────────────────────────────────────────────
  const proof = orderDetail?.paymentProof || selectedOrder?.paymentProof || null;
  const attendees = orderDetail?.attendees || selectedOrder?.attendees || [];
  const isPending =
    selectedOrder?.status === 'PENDING_PAYMENT' ||
    selectedOrder?.status === 'PENDING_VERIFICATION';
  const isUtrAlreadyApproved =
    utrCheck.result?.relatedOrder?.status === 'APPROVED' ||
    utrCheck.result?.relatedOrder?.status === 'SUCCEEDED';

  const filterOptions = [
    { value: 'PENDING_PAYMENT', label: 'Awaiting Payment' },
    { value: 'PENDING_VERIFICATION', label: 'Pending Verification' },
    { value: 'CONFIRMED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: '', label: 'All' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Payment Verifications</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Review UTR submissions and approve tickets
          </p>
        </div>
      </div>

      {/* Stats — unfiltered counts */}
      <VerificationStats
        pendingCount={stats.pending}
        pendingVerificationCount={stats.pendingVerification}
        approvedCount={stats.approved}
        rejectedCount={stats.rejected}
        totalCount={total}
        loading={loading && orders.length === 0}
      />

      {/* Filters */}
      <VerificationFilters
        statusOptions={filterOptions}
        activeStatus={filter}
        onStatusChange={(s) => { setFilter(s); setSelectedOrder(null); setOrderDetail(null); }}
        onRefresh={loadOrders}
        loading={loading}
      />

      {error && (
        <div className="rounded-lg bg-error/10 border border-error/20 px-4 py-3 text-xs text-error">
          {error}
        </div>
      )}

      {/* Main layout: left queue + right details */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Left: Queue */}
        <div className="xl:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-text-muted">
              {loading ? 'Loading...' : `${orders.length} order${orders.length !== 1 ? 's' : ''}${total > orders.length ? ` (${total} total)` : ''}`}
            </p>
          </div>
          <VerificationQueue
            orders={orders}
            selectedId={selectedOrder?.id || null}
            onSelect={(order) => setSelectedOrder(order)}
            loading={loading}
          />
        </div>

        {/* Right: Detail Panel */}
        <div className="xl:col-span-2">
          {!selectedOrder ? (
            <div className="rounded-xl border border-[var(--color-border)] bg-surface p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25-2.25M12 13.875V7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-3 text-sm text-text-muted">
                Select an order from the queue to review
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Row 1: Order Summary + Payment Details */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <OrderSummaryCard
                  orderNumber={selectedOrder.orderNumber}
                  status={selectedOrder.status}
                  total={selectedOrder.total}
                  createdAt={selectedOrder.createdAt}
                  event={selectedOrder.event}
                  attendees={attendees}
                  ticketsCount={orderDetail?.tickets?.length}
                  resubmissionCount={orderDetail?.resubmissionCount || selectedOrder.resubmissionCount}
                  loading={detailLoading}
                />
                <PaymentDetailsCard
                  proof={proof}
                  orderTotal={selectedOrder.total}
                  loading={detailLoading}
                />
              </div>

              {/* Screenshot */}
              <ScreenshotViewer
                proofId={proof?.id}
                mimeType={proof?.mimeType}
                googleDriveViewUrl={proof?.googleDriveViewUrl}
                loading={detailLoading}
              />

              {/* Duplicate UTR Warning */}
              {proof?.utrNumber && utrCheck.result?.duplicate && (
                <DuplicateUtrWarning
                  relatedOrder={utrCheck.result?.relatedOrder}
                  submissionCount={utrCheck.result?.submissionCount}
                  isAlreadyApproved={utrCheck.result?.relatedOrder?.status === 'APPROVED' || utrCheck.result?.relatedOrder?.status === 'SUCCEEDED'}
                  loading={utrCheck.loading}
                />
              )}

              {/* Payment History Timeline */}
              <PaymentHistoryTimeline
                currentProof={proof}
                archivedProofs={orderDetail?.paymentProofHistory || []}
                loading={detailLoading}
              />

              {/* Actions */}
              {isPending && (
                <div className="rounded-xl border border-[var(--color-border)] bg-surface p-4">
                  <p className="text-xs text-text-muted uppercase tracking-wider mb-3">
                    Review Actions
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setShowApproval(true)}
                      disabled={actionLoading || isUtrAlreadyApproved}
                      className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                        isUtrAlreadyApproved
                          ? 'bg-error/10 text-error border border-error/20 cursor-not-allowed'
                          : 'bg-success text-white hover:bg-success/90'
                      }`}
                      title={isUtrAlreadyApproved ? 'This UTR is already approved on another order. Approval blocked.' : 'Approve payment'}
                    >
                      {actionLoading ? 'Processing...' : isUtrAlreadyApproved ? 'UTR Already Approved' : '✓ Approve'}
                    </button>
                    <button
                      onClick={() => setShowReject(true)}
                      disabled={actionLoading}
                      className="rounded-lg border border-[var(--color-border)] bg-surface-elevated px-5 py-2 text-sm font-medium text-error hover:bg-error/10 transition-colors disabled:opacity-50"
                    >
                      ✗ Reject
                    </button>
                    <button
                      onClick={() => setShowResubmit(true)}
                      disabled={actionLoading}
                      className="rounded-lg border border-[var(--color-border)] bg-surface-elevated px-5 py-2 text-sm font-medium text-orange-400 hover:bg-orange-500/10 transition-colors disabled:opacity-50"
                    >
                      ↩ Request Resubmission
                    </button>
                  </div>
                </div>
              )}

              {/* Ticket approval success banner */}
              {lastApproval && (
                <div className="rounded-xl border border-success/20 bg-success/5 p-4">
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-medium text-success">Tickets Generated</p>
                  </div>
                  <div className="mt-2 text-xs text-text-secondary space-y-1">
                    <p>Order: <span className="font-mono">{lastApproval.orderNumber}</span></p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {lastApproval.ticketNumbers.map((num) => (
                        <a
                          key={num}
                          href={`/tickets/${num}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md bg-success/10 border border-success/20 px-2.5 py-1 font-mono text-2xs text-success hover:bg-success/20 transition-colors"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                          </svg>
                          {num}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Rejection info on already-rejected orders */}
              {selectedOrder.status === 'REJECTED' && proof?.rejectionReason && (
                <div className="rounded-xl border border-error/20 bg-error/5 p-4">
                  <p className="text-xs font-medium text-error">Order Rejected</p>
                  <p className="mt-1 text-sm text-text-secondary">
                    Reason: {proof.rejectionReason}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    User can resubmit payment proof.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <ApprovalDialog
        open={showApproval}
        onClose={() => setShowApproval(false)}
        onConfirm={handleApprove}
        loading={actionLoading}
        order={
          selectedOrder
            ? {
                orderNumber: selectedOrder.orderNumber,
                total: selectedOrder.total,
                eventTitle: selectedOrder.event?.title,
                attendeeCount: attendees.length,
                utrNumber: proof?.utrNumber,
              }
            : undefined
        }
      />

      <RejectDialog
        open={showReject}
        onClose={() => setShowReject(false)}
        onReject={handleReject}
        loading={actionLoading}
        orderNumber={selectedOrder?.orderNumber}
      />

      <ResubmissionDialog
        open={showResubmit}
        onClose={() => setShowResubmit(false)}
        onRequest={handleRequestResubmission}
        loading={actionLoading}
        orderNumber={selectedOrder?.orderNumber}
      />
    </div>
  );
}
