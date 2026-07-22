'use client';

interface ApprovalDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  order?: {
    orderNumber: string;
    total: number;
    eventTitle?: string;
    attendeeCount: number;
    utrNumber?: string;
  };
}

function formatPrice(total: number): string {
  return `₹${(total / 100).toLocaleString()}`;
}

export function ApprovalDialog({
  open,
  onClose,
  onConfirm,
  loading,
  order,
}: ApprovalDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-surface p-6 shadow-2xl">
        {/* Icon */}
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
          <svg className="h-6 w-6 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h3 className="mt-4 text-lg font-semibold text-white text-center">Approve this payment?</h3>
        <p className="mt-1 text-sm text-text-secondary text-center">
          This will generate tickets for the attendee(s).
        </p>

        {/* Order summary */}
        {order && (
          <div className="mt-4 rounded-lg bg-surface-elevated border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-xs text-text-muted">Order</span>
              <span className="text-xs font-mono text-white">{order.orderNumber}</span>
            </div>
            {order.eventTitle && (
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-xs text-text-muted">Event</span>
                <span className="text-xs text-white">{order.eventTitle}</span>
              </div>
            )}
            {order.utrNumber && (
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-xs text-text-muted">UTR</span>
                <span className="text-xs font-mono text-primary">{order.utrNumber}</span>
              </div>
            )}
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-xs text-text-muted">Amount</span>
              <span className="text-xs font-semibold text-white">{formatPrice(order.total)}</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-xs text-text-muted">Tickets to issue</span>
              <span className="text-xs font-semibold text-white">{order.attendeeCount}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-text-secondary hover:bg-surface-hover hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-lg bg-success px-4 py-2 text-sm font-medium text-white hover:bg-success/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Approving...' : 'Approve & Generate Tickets'}
          </button>
        </div>
      </div>
    </div>
  );
}
