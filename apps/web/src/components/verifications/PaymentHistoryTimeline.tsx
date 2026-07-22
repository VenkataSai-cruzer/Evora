'use client';

import { getProofImageUrl } from '@/lib/api-client';

interface Attempt {
  id?: string;
  attemptNumber: number;
  utrNumber: string;
  status: string;
  submittedAt: string;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  reviewedByName?: string | null;
}

interface PaymentHistoryTimelineProps {
  currentProof: {
    id?: string;
    utrNumber: string;
    status: string;
    submittedAt: string;
    reviewedAt?: string | null;
    rejectionReason?: string | null;
  } | null;
  archivedProofs?: Attempt[];
  loading?: boolean;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusIcon(status: string): string {
  switch (status) {
    case 'APPROVED': return '✓';
    case 'REJECTED': return '✗';
    case 'PENDING': return '⏳';
    case 'RESUBMISSION_REQUESTED': return '📝';
    default: return '•';
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'APPROVED': return 'text-success border-success/30 bg-success/5';
    case 'REJECTED': return 'text-error border-error/30 bg-error/5';
    case 'PENDING': return 'text-warning border-warning/30 bg-warning/5';
    case 'RESUBMISSION_REQUESTED': return 'text-orange-400 border-orange-500/30 bg-orange-500/5';
    default: return 'text-text-muted border-[var(--color-border)] bg-surface-elevated';
  }
}

export function PaymentHistoryTimeline({
  currentProof,
  archivedProofs = [],
  loading,
}: PaymentHistoryTimelineProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-surface-elevated" />
        ))}
      </div>
    );
  }

  // Build all attempts: archived + current
  const allAttempts: Attempt[] = [
    ...archivedProofs.map((p, i) => ({
      ...p,
      attemptNumber: i + 1,
    })),
    ...(currentProof
      ? [
          {
            id: currentProof.id,
            attemptNumber: archivedProofs.length + 1,
            utrNumber: currentProof.utrNumber,
            status: currentProof.status,
            submittedAt: currentProof.submittedAt,
            reviewedAt: currentProof.reviewedAt,
            rejectionReason: currentProof.rejectionReason,
          },
        ]
      : []),
  ];

  if (allAttempts.length === 0) return null;

  return (
    <div className="space-y-0">
      <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
        Submission History ({allAttempts.length} attempt{allAttempts.length !== 1 ? 's' : ''})
      </h4>

      <div className="relative space-y-0">
        {/* Vertical line */}
        <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-[var(--color-border)]" />

        {allAttempts.map((attempt, i) => {
          const isCurrent = i === allAttempts.length - 1;
          const screenshotUrl = attempt.id ? getProofImageUrl(attempt.id) : null;

          return (
            <div key={i} className={`relative flex gap-3 pb-4 last:pb-0 ${isCurrent ? '' : 'opacity-80'}`}>
              {/* Icon */}
              <div
                className={`relative z-10 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border text-xs ${statusColor(attempt.status)}`}
              >
                {statusIcon(attempt.status)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-white">
                    Attempt {attempt.attemptNumber}
                    {isCurrent ? (
                      <span className="ml-1.5 text-2xs text-primary font-normal">(Current)</span>
                    ) : (
                      <span className="ml-1.5 text-2xs text-text-muted font-normal">(Archived)</span>
                    )}
                  </p>
                  <span className={`text-2xs rounded-full px-1.5 py-0.5 font-medium ${
                    attempt.status === 'APPROVED' ? 'bg-success/10 text-success' :
                    attempt.status === 'REJECTED' ? 'bg-error/10 text-error' :
                    attempt.status === 'PENDING' ? 'bg-warning/10 text-warning' :
                    'bg-orange-500/10 text-orange-400'
                  }`}>
                    {attempt.status}
                  </span>
                </div>

                <div className="mt-0.5 text-2xs text-text-muted space-y-0.5">
                  <p>UTR: <span className="font-mono text-text-secondary">{attempt.utrNumber}</span></p>
                  <p>Submitted: {formatDateTime(attempt.submittedAt)}</p>
                  {attempt.reviewedAt && <p>Reviewed: {formatDateTime(attempt.reviewedAt)}</p>}
                  {attempt.reviewedByName && <p>By: {attempt.reviewedByName}</p>}
                  {attempt.rejectionReason && (
                    <p className="text-error">
                      Rejected: {attempt.rejectionReason}
                    </p>
                  )}
                </div>

                {/* Screenshot link */}
                {screenshotUrl && (
                  <a
                    href={screenshotUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-surface-elevated px-2 py-0.5 text-2xs text-text-secondary hover:text-white hover:bg-surface-hover transition-colors"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                    </svg>
                    View screenshot
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
