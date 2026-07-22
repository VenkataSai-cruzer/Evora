'use client';

interface QueueOrder {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  resubmissionCount?: number;
  user?: { name: string; email: string };
  event?: { title: string };
  attendees?: Array<{ attendeeName: string }>;
  paymentProof?: {
    status: string;
    submittedAt?: string;
    utrNumber?: string;
  } | null;
}

interface VerificationQueueProps {
  orders: QueueOrder[];
  selectedId: string | null;
  onSelect: (_order: QueueOrder) => void;
  loading?: boolean;
}

function formatPrice(total: number): string {
  return `₹${(total / 100).toLocaleString()}`;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays === 1) return 'yesterday';
  return `${diffDays}d ago`;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING_PAYMENT: { label: 'Awaiting Payment', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  PENDING_VERIFICATION: { label: 'Pending', color: 'bg-warning/10 text-warning border-warning/20' },
  REJECTED: { label: 'Rejected', color: 'bg-error/10 text-error border-error/20' },
  CONFIRMED: { label: 'Approved', color: 'bg-success/10 text-success border-success/20' },
  CANCELLED: { label: 'Cancelled', color: 'bg-surface-elevated text-text-muted border-[var(--color-border)]' },
};

export function VerificationQueue({
  orders,
  selectedId,
  onSelect,
  loading,
}: VerificationQueueProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-elevated" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-surface p-8 text-center">
        <p className="text-sm text-text-muted">No orders match the current filter.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {orders.map((order) => {
        const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.CANCELLED;
        const isSelected = order.id === selectedId;
        const isResubmission = (order.resubmissionCount || 0) > 0;
        const hasProof = order.paymentProof?.status === 'PENDING';

        return (
          <button
            key={order.id}
            onClick={() => onSelect(order)}
            className={`w-full text-left rounded-lg border p-3 transition-all ${
              isSelected
                ? 'border-primary/50 bg-primary/5'
                : 'border-[var(--color-border)] bg-surface hover:bg-surface-hover hover:border-primary/30'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white truncate">
                    {order.orderNumber}
                  </p>
                  <span className={`inline-flex items-center rounded-full border px-1.5 py-0 text-2xs font-medium ${config.color}`}>
                    {config.label}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-text-secondary truncate">
                  {order.event?.title || 'Unknown Event'}
                </p>
                <div className="mt-0.5 flex items-center gap-2 text-2xs text-text-muted">
                  <span>{order.user?.name || 'Unknown'}</span>
                  <span>•</span>
                  <span>{formatPrice(order.total)}</span>
                  <span>•</span>
                  <span>{timeAgo(order.createdAt)}</span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {isResubmission && (
                  <span className="text-2xs text-purple-400 font-medium">
                    Resubmission #{order.resubmissionCount}
                  </span>
                )}
                {hasProof && (
                  <span className="flex items-center gap-1 text-2xs text-warning">
                    <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" />
                    Needs review
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
