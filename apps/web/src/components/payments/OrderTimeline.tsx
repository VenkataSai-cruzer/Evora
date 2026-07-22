'use client';

interface TimelineEvent {
  type: 'created' | 'submitted' | 'rejected' | 'resubmitted' | 'approved' | 'ticket_issued' | 'checked_in';
  label: string;
  timestamp: string;
  detail?: string;
}

interface OrderTimelineProps {
  events: TimelineEvent[];
}

const EVENT_ICONS: Record<TimelineEvent['type'], string> = {
  created: '📋',
  submitted: '💳',
  rejected: '✗',
  resubmitted: '🔄',
  approved: '✓',
  ticket_issued: '🎟️',
  checked_in: '🎉',
};

const EVENT_COLORS: Record<TimelineEvent['type'], string> = {
  created: 'border-blue-500/30 bg-blue-500/5 text-blue-400',
  submitted: 'border-warning/30 bg-warning/5 text-warning',
  rejected: 'border-error/30 bg-error/5 text-error',
  resubmitted: 'border-purple-500/30 bg-purple-500/5 text-purple-400',
  approved: 'border-success/30 bg-success/5 text-success',
  ticket_issued: 'border-primary/30 bg-primary/5 text-primary',
  checked_in: 'border-green-500/30 bg-green-500/5 text-green-400',
};

function formatTimestamp(ts: string): { date: string; time: string } {
  const d = new Date(ts);
  return {
    date: d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
  };
}

export function OrderTimeline({ events }: OrderTimelineProps) {
  if (events.length === 0) return null;

  return (
    <div className="relative space-y-0">
      {/* Vertical line */}
      <div className="absolute left-[17px] top-3 bottom-3 w-0.5 bg-[var(--color-border)]" />

      {events.map((event, i) => {
        const { date, time } = formatTimestamp(event.timestamp);
        const isLast = i === events.length - 1;
        const isPending = event.type === 'submitted' && isLast;

        return (
          <div key={i} className={`relative flex gap-4 pb-6 ${isLast ? '' : ''}`}>
            {/* Icon circle */}
            <div className={`relative z-10 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border text-sm font-bold ${
              EVENT_COLORS[event.type]
            } ${isPending ? 'animate-pulse' : ''}`}>
              {EVENT_ICONS[event.type]}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-white">{event.label}</p>
                <p className="flex-shrink-0 text-xs text-text-muted">{time}</p>
              </div>
              {event.detail && (
                <p className="mt-0.5 text-xs text-text-secondary">{event.detail}</p>
              )}
              <p className="mt-0.5 text-2xs text-text-muted">{date}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Build timeline events from order and payment proof data.
 */
export function buildTimelineFromOrder(order: any): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // Order created
  if (order.createdAt) {
    events.push({
      type: 'created',
      label: 'Order Created',
      timestamp: order.createdAt,
      detail: `Order #${order.orderNumber}`,
    });
  }

  // Payment submitted (from proof or order history)
  if (order.paymentProof?.submittedAt) {
    events.push({
      type: 'submitted',
      label: order.paymentProof.status === 'REJECTED' ? 'Payment Submitted' : 'Payment Submitted',
      timestamp: order.paymentProof.submittedAt,
      detail: order.paymentProof.utrNumber ? `UTR: ${order.paymentProof.utrNumber}` : undefined,
    });
  }

  // Rejected
  if (order.status === 'REJECTED' && order.paymentProof?.rejectionReason) {
    events.push({
      type: 'rejected',
      label: 'Payment Rejected',
      timestamp: order.paymentProof.reviewedAt || order.updatedAt,
      detail: `Reason: ${order.paymentProof.rejectionReason}`,
    });
  }

  // Resubmitted (check resubmissionCount)
  if (order.resubmissionCount && order.resubmissionCount > 0) {
    events.push({
      type: 'resubmitted',
      label: 'Payment Resubmitted',
      timestamp: order.updatedAt,
      detail: `Attempt ${order.resubmissionCount + 1}`,
    });
  }

  // Approved / Confirmed
  if (order.status === 'CONFIRMED' && order.paidAt) {
    events.push({
      type: 'approved',
      label: 'Payment Approved',
      timestamp: order.paidAt,
    });
  }

  return events;
}
