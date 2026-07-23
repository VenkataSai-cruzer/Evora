'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface SubmissionSuccessProps {
  orderNumber: string;
  isResubmission?: boolean;
  verificationSlaHours?: number;
  email?: string;
  submittedAt?: string;
}

export function SubmissionSuccess({
  orderNumber,
  isResubmission = false,
  verificationSlaHours = 6,
  email,
  submittedAt: propSubmittedAt,
}: SubmissionSuccessProps) {
  const [timeSince, setTimeSince] = useState('just now');
  const submittedAt = propSubmittedAt || new Date().toISOString();

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const diffMs = now.getTime() - new Date(submittedAt).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) setTimeSince('just now');
      else if (diffMins < 60) setTimeSince(`${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`);
      else setTimeSince(`${Math.floor(diffMins / 60)} hour${Math.floor(diffMins / 60) !== 1 ? 's' : ''} ago`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 30000);
    return () => clearInterval(interval);
  }, [submittedAt]);

  // Estimate verification deadline
  const deadline = new Date(Date.now() + verificationSlaHours * 60 * 60 * 1000);
  const deadlineStr = deadline.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const deadlineDateStr = deadline.toLocaleDateString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="rounded-xl border border-success/20 bg-success/5 overflow-hidden">
      {/* Success header */}
      <div className="px-6 py-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
          <svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h2 className="mt-4 text-xl font-bold text-white">
          {isResubmission ? 'Payment Resubmitted Successfully' : 'Payment Submitted Successfully'}
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          {isResubmission
            ? 'Your updated payment proof has been received and is under review.'
            : 'Your payment proof has been received and is under review.'}
        </p>
      </div>

      {/* Order details */}
      <div className="border-t border-success/10 px-6 py-4 space-y-3">
        {/* Order number */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">Order Number</span>
          <span className="font-mono text-sm font-medium text-white">{orderNumber}</span>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">Payment Status</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning border border-warning/20">
            <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" />
            Pending Verification
          </span>
        </div>

        {/* Submitted time */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">Submitted</span>
          <span className="text-xs text-text-secondary">{timeSince}</span>
        </div>

        {/* SLA estimate */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">Expected Review</span>
          <span className="text-xs font-medium text-text-secondary">
            Within {deadlineDateStr} {deadlineStr} (~{verificationSlaHours} hours)
          </span>
        </div>
      </div>

      {/* Next steps */}
      <div className="border-t border-success/10 px-6 py-5 space-y-3">
        <h4 className="text-xs font-semibold text-white uppercase tracking-wider">What happens next?</h4>

        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success/10 text-success text-xs font-bold">1</span>
            <p className="text-xs text-text-secondary">Our team reviews your payment proof</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success/10 text-success text-xs font-bold">2</span>
            <p className="text-xs text-text-secondary">You&apos;ll receive a notification once verified</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success/10 text-success text-xs font-bold">3</span>
            <p className="text-xs text-text-secondary">
              {email ? (
                <>Your ticket will be available in your Bookings and emailed to <span className="text-white">{email}</span></>
              ) : (
                'Your ticket will be available in your Bookings'
              )}
            </p>
          </div>
        </div>

        {/* Notification methods */}
        <div className="mt-4 flex flex-wrap gap-4 text-2xs text-text-muted">
          <span className="flex items-center gap-1">
            <span className="text-success">✓</span> Dashboard
          </span>
          <span className="flex items-center gap-1">
            <span className="text-success">✓</span> Email
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-success/10 px-6 py-4 flex flex-col sm:flex-row gap-3">
        <Link
          href="/my-bookings"
          className="flex-1 rounded-lg bg-primary py-2.5 text-center text-sm font-medium text-white hover:bg-primary-hover transition-colors"
        >
          View Bookings
        </Link>
        <Link
          href={`/payment-status?order=${orderNumber}`}
          className="flex-1 rounded-lg border border-[var(--color-border)] py-2.5 text-center text-sm font-medium text-white hover:bg-surface-hover transition-colors"
        >
          View Payment Status
        </Link>
      </div>
    </div>
  );
}
