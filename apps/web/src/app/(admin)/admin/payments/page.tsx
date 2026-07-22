'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { listAdminOrders } from '@/lib/api-client';
import { formatDate } from '@/lib/dates';

export default function AdminPaymentsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAdminOrders({ status: filter || undefined, limit: 100 });
      setOrders(res.orders);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const allPayments = orders.flatMap(order =>
    (order.payments || []).map((p: any) => ({
      ...p,
      orderNumber: order.orderNumber,
      userName: order.user?.name,
      userEmail: order.user?.email,
      eventTitle: order.event?.title,
      orderStatus: order.status,
    }))
  ).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Payments</h1>
      <p className="mt-1 text-sm text-text-secondary">All UTR payment submissions</p>

      <div className="flex gap-2">
        {['', 'PENDING_PAYMENT', 'CONFIRMED'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === status ? 'bg-primary text-white' : 'bg-surface-elevated text-text-secondary hover:text-white'
            }`}
          >
            {status ? (status === 'PENDING_PAYMENT' ? 'Pending' : 'Approved') : 'All'}
          </button>
        ))}
        <Link href="/admin/verifications" className="ml-auto rounded-lg bg-surface-elevated px-3 py-1.5 text-xs text-text-secondary hover:text-white transition-colors">
          Verify Payments
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-elevated" />)}
        </div>
      ) : allPayments.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs text-text-muted uppercase tracking-wider">
                <th className="pb-3 pr-4 font-medium">UTR</th>
                <th className="pb-3 pr-4 font-medium">Order</th>
                <th className="pb-3 pr-4 font-medium">User</th>
                <th className="pb-3 pr-4 font-medium">Event</th>
                <th className="pb-3 pr-4 font-medium">Amount</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 pr-4 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {allPayments.map((payment: any) => (
                <tr key={payment.id} className="border-b border-[var(--color-border)] text-white">
                  <td className="py-3 pr-4 font-mono text-xs">{payment.utrNumber || '-'}</td>
                  <td className="py-3 pr-4 font-mono text-xs">{payment.orderNumber}</td>
                  <td className="py-3 pr-4">
                    <p className="text-sm">{payment.userName}</p>
                    <p className="text-xs text-text-muted">{payment.userEmail}</p>
                  </td>
                  <td className="py-3 pr-4 text-sm">{payment.eventTitle}</td>
                  <td className="py-3 pr-4 text-sm">₹{(payment.amount / 100).toLocaleString()}</td>
                  <td className="py-3 pr-4">
                    <span className={`text-xs font-medium ${
                      payment.status === 'SUCCEEDED' ? 'text-success' :
                      payment.status === 'PENDING' ? 'text-warning' :
                      payment.status === 'FAILED' ? 'text-error' : 'text-text-muted'
                    }`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-xs text-text-muted">{formatDate(payment.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-12 text-center">
          <p className="text-text-muted">No payments found.</p>
        </div>
      )}
    </div>
  );
}
