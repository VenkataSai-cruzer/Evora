'use client';

interface Attendee {
  attendeeName: string;
  attendeeEmail?: string | null;
  ticketType?: { name: string; price: number } | null;
}

interface OrderSummaryCardProps {
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  event?: { title: string; slug?: string } | null;
  attendees?: Attendee[];
  ticketsCount?: number;
  resubmissionCount?: number;
  loading?: boolean;
}

function formatPrice(total: number): string {
  return `₹${(total / 100).toLocaleString()}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function OrderSummaryCard({
  orderNumber,
  status,
  total,
  createdAt,
  event,
  attendees = [],
  ticketsCount,
  resubmissionCount,
  loading,
}: OrderSummaryCardProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-surface p-4 space-y-3">
        <div className="h-4 w-32 animate-pulse rounded bg-surface-elevated" />
        <div className="h-3 w-48 animate-pulse rounded bg-surface-elevated" />
        <div className="h-3 w-24 animate-pulse rounded bg-surface-elevated" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-surface p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wider">Order Summary</p>
          <p className="font-mono text-sm font-semibold text-white mt-0.5">{orderNumber}</p>
        </div>
        <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${
          status === 'PENDING_PAYMENT' || status === 'PENDING_VERIFICATION'
            ? 'bg-warning/10 text-warning'
            : status === 'CONFIRMED'
            ? 'bg-success/10 text-success'
            : 'bg-error/10 text-error'
        }`}>
          {status}
        </span>
      </div>

      {/* Event */}
      {event && (
        <div className="text-xs text-text-secondary">
          <span className="text-text-muted">Event:</span>{' '}
          <span className="text-white font-medium">{event.title}</span>
        </div>
      )}

      {/* Amount */}
      <div className="text-xs text-text-secondary">
        <span className="text-text-muted">Total:</span>{' '}
        <span className="text-white font-semibold">{formatPrice(total)}</span>
      </div>

      {/* Created */}
      <div className="text-xs text-text-muted">
        Created: {formatDate(createdAt)}
      </div>

      {/* Resubmission count */}
      {resubmissionCount !== undefined && resubmissionCount > 0 && (
        <div className="text-xs text-purple-400">
          Resubmission #{resubmissionCount}
        </div>
      )}

      {/* Attendees */}
      {attendees.length > 0 && (
        <div>
          <p className="text-xs text-text-muted mb-1.5">
            Attendees ({attendees.length})
            {ticketsCount !== undefined && ticketsCount > 0 
              ? ` — ${ticketsCount} ticket(s)` 
              : ''}
          </p>
          <div className="space-y-1">
            {attendees.map((a, i) => (
              <div key={i} className="rounded-md bg-surface-elevated px-2.5 py-1.5 text-xs">
                <p className="text-white font-medium">{a.attendeeName}</p>
                {a.attendeeEmail && (
                  <p className="text-text-muted">{a.attendeeEmail}</p>
                )}
                {a.ticketType && (
                  <p className="text-text-muted">
                    {a.ticketType.name} — {formatPrice(a.ticketType.price)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
