'use client';

import Link from 'next/link';

interface OrderCardProps {
  order: {
    orderNumber: string;
    status: string;
    total: number;
    currency: string;
    createdAt: string;
    updatedAt: string;
    event?: {
      title: string;
      slug: string;
      startAt?: string;
      venueName?: string;
      posterObjectKey?: string;
    };
    paymentProof?: {
      status: string;
      utrNumber?: string;
      rejectionReason?: string;
      submittedAt?: string;
    };
  };
  /** Estimated verification hours — could come from event config or be static */
  verificationSlaHours?: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  PENDING_PAYMENT: { label: 'Awaiting Payment', color: 'bg-warning/10 text-warning border-warning/20', icon: '⏳' },
  PENDING_VERIFICATION: { label: 'Pending Verification', color: 'bg-warning/10 text-warning border-warning/20', icon: '⏳' },
  REJECTED: { label: 'Payment Rejected', color: 'bg-error/10 text-error border-error/20', icon: '✗' },
  CONFIRMED: { label: 'Confirmed', color: 'bg-success/10 text-success border-success/20', icon: '✓' },
  CANCELLED: { label: 'Cancelled', color: 'bg-error/5 text-text-muted border-[var(--color-border)]', icon: '—' },
  EXPIRED: { label: 'Expired', color: 'bg-surface-elevated text-text-muted border-[var(--color-border)]', icon: '⌛' },
};

function getSlaLabel(createdAt: string, slaHours: number): string {
  const created = new Date(createdAt);
  const deadline = new Date(created.getTime() + slaHours * 60 * 60 * 1000);
  const now = new Date();

  if (now > deadline) return 'Exceeded estimated time';
  const remainingMs = deadline.getTime() - now.getTime();
  const remainingHrs = Math.floor(remainingMs / (1000 * 60 * 60));
  const remainingMins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

  if (remainingHrs > 0) return `~${remainingHrs}h ${remainingMins}m remaining`;
  if (remainingMins > 0) return `~${remainingMins}m remaining`;
  return 'Any moment now';
}

function formatPrice(total: number, currency: string): string {
  const symbol = currency === 'INR' ? '₹' : '$';
  return `${symbol}${(total / 100).toLocaleString()}`;
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

export function OrderCard({ order, verificationSlaHours = 6 }: OrderCardProps) {
  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.CANCELLED;
  const needsVerification = order.status === 'PENDING_VERIFICATION';
  const isRejected = order.status === 'REJECTED';
  const isConfirmed = order.status === 'CONFIRMED';

  return (
    <Link
      href={
        isConfirmed
          ? `/my-ticket`
          : `/payment-status?order=${order.orderNumber}`
      }
      className="block rounded-xl border border-[var(--color-border)] bg-surface transition-all hover:border-primary/50 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5"
    >
      <div className="p-4 sm:p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {order.event?.title || 'Event'}
            </p>
            <p className="mt-0.5 font-mono text-xs text-text-muted">
              {order.orderNumber}
            </p>
          </div>
          <span className={`flex-shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${config.color}`}>
            <span>{config.icon}</span>
            <span>{config.label}</span>
          </span>
        </div>

        {/* Event details */}
        {order.event && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
            {order.event.startAt && (
              <span>
                {new Date(order.event.startAt).toLocaleDateString('en-IN', {
                  weekday: 'short', month: 'short', day: 'numeric',
                })}
              </span>
            )}
            {order.event.venueName && <span>{order.event.venueName}</span>}
            <span className="font-medium text-white">{formatPrice(order.total, order.currency)}</span>
          </div>
        )}

        {/* Verification SLA */}
        {needsVerification && (
          <div className="mt-3 rounded-lg bg-warning/5 border border-warning/10 px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" />
              <p className="text-xs text-warning">
                {getSlaLabel(order.createdAt, verificationSlaHours)}
              </p>
            </div>
          </div>
        )}

        {/* Rejection alert */}
        {isRejected && order.paymentProof?.rejectionReason && (
          <div className="mt-3 rounded-lg bg-error/5 border border-error/10 px-3 py-2">
            <p className="text-xs font-medium text-error">Reason: {order.paymentProof.rejectionReason}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between border-t border-[var(--color-border)] pt-3">
          <p className="text-2xs text-text-muted">
            {timeAgo(order.createdAt)}
          </p>
          {!isConfirmed && (
            <span className="text-xs font-medium text-primary group-hover:text-primary-hover">
              {isRejected ? 'Resubmit →' : 'View Details →'}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
