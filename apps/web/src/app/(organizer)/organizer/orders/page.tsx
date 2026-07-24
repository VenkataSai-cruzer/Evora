'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import Link from 'next/link';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  user: { name: string; email: string };
  event: { title: string; id: string };
  attendees: { id: string; attendeeName: string }[];
}

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'PENDING_VERIFICATION', label: 'Pending' },
  { value: 'PENDING_PAYMENT', label: 'Awaiting Payment' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function OrganizerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ limit: '50' });
    if (statusFilter) params.set('status', statusFilter);
    api.get<{ orders: Order[]; total: number }>(`/organizer/orders?${params.toString()}`)
      .then((res) => setOrders(res.orders))
      .catch(() => setError('Failed to load orders'))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  if (loading) return <div className="h-32 animate-pulse rounded-xl bg-surface-elevated" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Orders</h1>
        <p className="mt-1 text-sm text-text-secondary">Orders from your assigned events</p>
      </div>
      {error && <div className="rounded-lg bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === tab.value
                ? 'bg-primary/10 text-primary'
                : 'text-text-muted hover:text-white hover:bg-surface-hover'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-12 text-center">
          <p className="text-text-muted">
            {statusFilter ? `No orders with status "${statusFilter}" found for your events.` : 'No orders found for your events.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-white">{order.orderNumber}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      order.status === 'CONFIRMED' ? 'bg-success/10 text-success' :
                      order.status === 'REJECTED' ? 'bg-error/10 text-error' :
                      order.status === 'CANCELLED' ? 'bg-surface-elevated text-text-muted' :
                      'bg-warning/10 text-warning'
                    }`}>{order.status}</span>
                  </div>
                  <p className="mt-1 text-sm text-white">{order.user.name}</p>
                  <p className="text-xs text-text-muted">{order.event.title}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {order.attendees.map((a) => (
                      <span key={a.id} className="rounded-md bg-surface-elevated px-2 py-0.5 text-xs text-text-secondary">
                        {a.attendeeName}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <Link
                    href={`/organizer/events/${order.event.id}`}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover transition-colors"
                  >
                    View Event
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
