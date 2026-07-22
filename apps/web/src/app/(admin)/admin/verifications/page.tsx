'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/dates';

export default function AdminVerificationsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; orderNumber: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [filter, setFilter] = useState('PENDING_PAYMENT');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<{ orders: any[]; total: number }>(`/admin/orders?status=${filter}&limit=50`);
      setOrders(res.orders);
      setTotal(res.total);
    } catch {
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(id: string) {
    setActionLoading(id);
    setError('');
    try {
      await api.post(`/admin/orders/${id}/approve`, {});
      await load();
    } catch (err: any) {
      setError(err.message || 'Approval failed');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject() {
    if (!rejectModal) return;
    if (!rejectReason.trim()) { setError('Please enter a rejection reason'); return; }
    setActionLoading(rejectModal.id);
    setError('');
    try {
      await api.post(`/admin/orders/${rejectModal.id}/reject`, { reason: rejectReason });
      setRejectModal(null);
      setRejectReason('');
      await load();
    } catch (err: any) {
      setError(err.message || 'Rejection failed');
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Payment Verifications</h1>
          <p className="mt-1 text-sm text-text-secondary">Review UTR submissions and approve tickets</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[['PENDING_PAYMENT', 'Pending'], ['CONFIRMED', 'Approved'], ['CANCELLED', 'Rejected']].map(([status, label]) => (
          <button key={status} onClick={() => setFilter(status)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filter === status ? 'bg-primary text-white' : 'bg-surface-elevated text-text-secondary hover:text-white'}`}>
            {label}
          </button>
        ))}
        <button onClick={load} className="ml-auto rounded-lg bg-surface-elevated px-3 py-1.5 text-xs text-text-secondary hover:text-white transition-colors">Refresh</button>
      </div>

      {error && <div className="rounded-lg bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-elevated" />)}</div>
      ) : orders.length > 0 ? (
        <div className="space-y-3">
          {orders.map((order) => {
            const proof = order.paymentProof;
            return (
              <div key={order.id} className="rounded-xl border border-[var(--color-border)] bg-surface p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-white">{order.event?.title}</p>
                      <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${order.status === 'PENDING_PAYMENT' ? 'bg-warning/10 text-warning' : order.status === 'CONFIRMED' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                        {order.status === 'PENDING_PAYMENT' ? 'Pending' : order.status === 'CONFIRMED' ? 'Approved' : 'Rejected'}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-text-muted">
                      <span>Order: <span className="font-mono text-white">{order.orderNumber}</span></span>
                      <span>{order.user?.name} — {order.user?.email}</span>
                      {order.user?.phone && <span>📞 {order.user.phone}</span>}
                      <span>₹{(order.total / 100).toLocaleString()}</span>
                      <span>{order.attendees?.length || 0} attendee(s)</span>
                      <span>{formatDate(order.createdAt)}</span>
                    </div>

                    {/* Attendee names */}
                    {order.attendees?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {order.attendees.map((a: any) => (
                          <span key={a.id} className="rounded-full bg-surface-elevated px-2 py-0.5 text-xs text-text-secondary">
                            {a.attendeeName}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Payment Proof */}
                    {proof && (
                      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-[var(--color-border)] bg-surface-elevated p-3">
                        <div className="text-xs space-y-0.5">
                          <p className="text-text-muted">UTR: <span className="font-mono text-primary font-medium">{proof.utrNumber}</span></p>
                          <p className="text-text-muted">Amount: ₹{(proof.amount / 100).toLocaleString()} · Submitted {formatDate(proof.submittedAt)}</p>
                          <p className="text-text-muted">
                            Status: <span className={`font-medium ${proof.status === 'APPROVED' ? 'text-success' : proof.status === 'REJECTED' ? 'text-error' : 'text-warning'}`}>{proof.status}</span>
                          </p>
                          {proof.rejectionReason && <p className="text-error text-xs">Rejection reason: {proof.rejectionReason}</p>}
                        </div>
                        {proof.googleDriveViewUrl && (
                          <a href={proof.googleDriveViewUrl} target="_blank" rel="noopener noreferrer"
                            className="ml-auto rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
                            View Screenshot ↗
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {order.status === 'PENDING_PAYMENT' && (
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button onClick={() => handleApprove(order.id)} disabled={actionLoading === order.id}
                        className="rounded-lg bg-success px-4 py-1.5 text-xs font-medium text-white hover:bg-success/90 disabled:opacity-50 transition-colors">
                        {actionLoading === order.id ? '...' : 'Approve'}
                      </button>
                      <button onClick={() => setRejectModal({ id: order.id, orderNumber: order.orderNumber })} disabled={actionLoading === order.id}
                        className="rounded-lg border border-[var(--color-border)] px-4 py-1.5 text-xs text-text-secondary hover:bg-surface-hover hover:text-white disabled:opacity-50 transition-colors">
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-12 text-center">
          <p className="text-text-muted">No {filter === 'PENDING_PAYMENT' ? 'pending' : filter === 'CONFIRMED' ? 'approved' : 'rejected'} orders.</p>
        </div>
      )}

      {total > orders.length && <p className="text-center text-xs text-text-muted">Showing {orders.length} of {total}</p>}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-surface p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">Reject Payment</h3>
            <p className="mt-1 text-sm text-text-secondary">Order: <span className="font-mono">{rejectModal.orderNumber}</span></p>
            <div className="mt-4">
              <label className="mb-1.5 block text-sm text-text-secondary">Reason <span className="text-error">*</span></label>
              <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., UTR mismatch, insufficient amount, duplicate transaction"
                className="w-full rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2.5 text-sm text-white placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none" rows={3} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => { setRejectModal(null); setRejectReason(''); setError(''); }}
                className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-text-secondary hover:bg-surface-hover hover:text-white transition-colors">Cancel</button>
              <button onClick={handleReject} disabled={actionLoading === rejectModal.id || !rejectReason.trim()}
                className="rounded-lg bg-error px-4 py-2 text-sm font-medium text-white hover:bg-error/90 disabled:opacity-50 transition-colors">
                {actionLoading === rejectModal.id ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
