'use client';

import { useState } from 'react';

interface RejectDialogProps {
  open: boolean;
  onClose: () => void;
  onReject: (_reason: string, _customMessage?: string) => void;
  loading?: boolean;
  orderNumber?: string;
}

const PREDEFINED_REASONS = [
  { value: 'UTR_NOT_FOUND', label: 'UTR not found' },
  { value: 'DUPLICATE_UTR', label: 'Duplicate UTR' },
  { value: 'PAYMENT_NOT_RECEIVED', label: 'Payment not received' },
  { value: 'INCORRECT_AMOUNT', label: 'Incorrect amount' },
  { value: 'SCREENSHOT_UNCLEAR', label: 'Screenshot unclear' },
  { value: 'SCREENSHOT_MISMATCH', label: 'Screenshot does not match transaction' },
  { value: 'FAKE_PROOF', label: 'Fake or edited proof suspected' },
  { value: 'WRONG_EVENT', label: 'Wrong event payment' },
  { value: 'OTHER', label: 'Other' },
];

export function RejectDialog({
  open,
  onClose,
  onReject,
  loading,
  orderNumber,
}: RejectDialogProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [customMessage, setCustomMessage] = useState('');

  if (!open) return null;

  const selectedOption = PREDEFINED_REASONS.find((r) => r.value === selectedReason);
  const needsCustom = selectedReason === 'OTHER';
  const isValid = selectedReason && (!needsCustom || customMessage.trim().length > 0);

  function handleSubmit() {
    if (!isValid) return;
    const reasonLabel = selectedOption?.label || selectedReason;
    const message = needsCustom ? customMessage.trim() : undefined;
    onReject(reasonLabel, message);
  }

  function handleClose() {
    setSelectedReason('');
    setCustomMessage('');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-surface p-6 shadow-2xl">
        {/* Icon */}
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-error/10">
          <svg className="h-6 w-6 text-error" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>

        <h3 className="mt-4 text-lg font-semibold text-white text-center">Reject Payment</h3>
        {orderNumber && (
          <p className="mt-1 text-sm text-text-secondary text-center">
            Order: <span className="font-mono">{orderNumber}</span>
          </p>
        )}

        <div className="mt-5 space-y-4">
          {/* Reason dropdown */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">
              Reason <span className="text-error">*</span>
            </label>
            <select
              value={selectedReason}
              onChange={(e) => { setSelectedReason(e.target.value); setCustomMessage(''); }}
              className="w-full rounded-lg border border-[var(--color-border)] bg-surface-elevated px-3 py-2.5 text-sm text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="" disabled>Select a reason...</option>
              {PREDEFINED_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Custom message for "Other" */}
          {needsCustom && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                Describe the issue <span className="text-error">*</span>
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Please describe why this payment is being rejected..."
                rows={3}
                className="w-full rounded-lg border border-[var(--color-border)] bg-surface-elevated px-3 py-2.5 text-sm text-white placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>
          )}

          {/* Optional custom message for any reason */}
          {selectedReason && !needsCustom && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                Custom message to attendee (optional)
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Additional context for the attendee..."
                rows={2}
                className="w-full rounded-lg border border-[var(--color-border)] bg-surface-elevated px-3 py-2.5 text-sm text-white placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-5 flex gap-2">
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-text-secondary hover:bg-surface-hover hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || loading}
            className="flex-1 rounded-lg bg-error px-4 py-2 text-sm font-medium text-white hover:bg-error/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Rejecting...' : 'Reject Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}
