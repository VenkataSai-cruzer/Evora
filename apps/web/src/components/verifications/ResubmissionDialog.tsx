'use client';

import { useState } from 'react';

interface ResubmissionDialogProps {
  open: boolean;
  onClose: () => void;
  onRequest: (_message?: string) => void;
  loading?: boolean;
  orderNumber?: string;
}

export function ResubmissionDialog({
  open,
  onClose,
  onRequest,
  loading,
  orderNumber,
}: ResubmissionDialogProps) {
  const [message, setMessage] = useState('');

  if (!open) return null;

  function handleSubmit() {
    onRequest(message.trim() || undefined);
  }

  function handleClose() {
    setMessage('');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-surface p-6 shadow-2xl">
        {/* Icon */}
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/10">
          <svg className="h-6 w-6 text-orange-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
          </svg>
        </div>

        <h3 className="mt-4 text-lg font-semibold text-white text-center">Request Resubmission</h3>
        {orderNumber && (
          <p className="mt-1 text-sm text-text-secondary text-center">
            Order: <span className="font-mono">{orderNumber}</span>
          </p>
        )}
        <p className="mt-1 text-xs text-text-muted text-center">
          The attendee will be asked to submit a new payment proof.
        </p>

        <div className="mt-5">
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">
            Message to attendee (optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g., The screenshot was unclear. Please upload a clearer image."
            rows={3}
            className="w-full rounded-lg border border-[var(--color-border)] bg-surface-elevated px-3 py-2.5 text-sm text-white placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
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
            disabled={loading}
            className="flex-1 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-500/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Requesting...' : 'Request Resubmission'}
          </button>
        </div>
      </div>
    </div>
  );
}
