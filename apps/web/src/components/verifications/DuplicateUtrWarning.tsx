'use client';

interface DuplicateUtrWarningProps {
  relatedOrder?: {
    orderNumber: string;
    eventTitle: string;
    status: string;
  } | null;
  loading?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PENDING: 'Pending',
  SUCCEEDED: 'Succeeded',
  FAILED: 'Failed',
};

export function DuplicateUtrWarning({
  relatedOrder,
  loading,
}: DuplicateUtrWarningProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3">
        <div className="h-4 w-32 animate-pulse rounded bg-orange-500/10" />
      </div>
    );
  }

  if (!relatedOrder) return null;

  return (
    <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500/10 text-orange-400 text-xs font-bold">!</span>
        <p className="text-xs font-medium text-orange-400">Duplicate UTR Detected</p>
      </div>

      <div className="text-xs space-y-0.5 text-text-muted pl-7">
        <p>
          Previously used in:{' '}
          <span className="font-mono text-white">{relatedOrder.orderNumber}</span>
        </p>
        <p>
          Event: <span className="text-white">{relatedOrder.eventTitle}</span>
        </p>
        <p>
          Status:{' '}
          <span className={`font-medium ${
            relatedOrder.status === 'APPROVED' || relatedOrder.status === 'SUCCEEDED'
              ? 'text-success'
              : relatedOrder.status === 'REJECTED' || relatedOrder.status === 'FAILED'
              ? 'text-error'
              : 'text-warning'
          }`}>
            {STATUS_LABELS[relatedOrder.status] || relatedOrder.status}
          </span>
        </p>
        <p className="text-2xs text-text-muted">
          Review carefully before approving — this UTR has been used on a different order.
        </p>
      </div>
    </div>
  );
}
