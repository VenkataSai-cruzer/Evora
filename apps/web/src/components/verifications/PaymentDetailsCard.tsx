'use client';

interface PaymentProof {
  id?: string;
  utrNumber: string;
  amount: number;
  status: string;
  submittedAt: string;
  rejectionReason?: string | null;
  mimeType?: string;
  googleDriveViewUrl?: string | null;
  reviewedAt?: string | null;
}

interface PaymentDetailsCardProps {
  proof: PaymentProof | null;
  orderTotal: number;
  loading?: boolean;
}

function formatPrice(amount: number): string {
  return `₹${(amount / 100).toLocaleString()}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusBadge(status: string): { label: string; color: string } {
  switch (status) {
    case 'PENDING':
      return { label: 'Pending Review', color: 'bg-warning/10 text-warning border-warning/20' };
    case 'APPROVED':
      return { label: 'Approved', color: 'bg-success/10 text-success border-success/20' };
    case 'REJECTED':
      return { label: 'Rejected', color: 'bg-error/10 text-error border-error/20' };
    case 'RESUBMISSION_REQUESTED':
      return { label: 'Resubmission Requested', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' };
    default:
      return { label: status, color: 'bg-surface-elevated text-text-muted border-[var(--color-border)]' };
  }
}

export function PaymentDetailsCard({
  proof,
  orderTotal,
  loading,
}: PaymentDetailsCardProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-surface p-4 space-y-3">
        <div className="h-4 w-28 animate-pulse rounded bg-surface-elevated" />
        <div className="h-3 w-36 animate-pulse rounded bg-surface-elevated" />
        <div className="h-3 w-24 animate-pulse rounded bg-surface-elevated" />
      </div>
    );
  }

  if (!proof) {
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-surface p-4">
        <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Payment Details</p>
        <p className="text-sm text-text-secondary">No payment proof submitted yet.</p>
      </div>
    );
  }

  const badge = statusBadge(proof.status);

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-surface p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-muted uppercase tracking-wider">Payment Details</p>
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-2xs font-medium ${badge.color}`}>
          {badge.label}
        </span>
      </div>

      {/* UTR */}
      <div className="text-xs">
        <span className="text-text-muted">UTR:</span>{' '}
        <span className="font-mono text-primary font-medium">{proof.utrNumber}</span>
      </div>

      {/* Amount comparison */}
      <div className="text-xs space-y-0.5">
        <p><span className="text-text-muted">Expected:</span> <span className="text-white">{formatPrice(orderTotal)}</span></p>
        <p><span className="text-text-muted">Submitted:</span> <span className="text-white">{formatPrice(proof.amount)}</span></p>
        {proof.amount !== orderTotal && (
          <p className="text-error text-2xs">Amount mismatch — expected {formatPrice(orderTotal)}, submitted {formatPrice(proof.amount)}</p>
        )}
      </div>

      {/* Submitted time */}
      <div className="text-xs text-text-muted">
        Submitted: {formatDateTime(proof.submittedAt)}
      </div>

      {/* Reviewed time */}
      {proof.reviewedAt && (
        <div className="text-xs text-text-muted">
          Reviewed: {formatDateTime(proof.reviewedAt)}
        </div>
      )}

      {/* Rejection info */}
      {proof.rejectionReason && (
        <div className="rounded-md bg-error/5 border border-error/10 px-2.5 py-1.5">
          <p className="text-xs text-error font-medium">Rejection reason</p>
          <p className="text-xs text-text-secondary mt-0.5">{proof.rejectionReason}</p>
        </div>
      )}
    </div>
  );
}
