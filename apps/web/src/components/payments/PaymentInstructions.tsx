'use client';

import { useState } from 'react';

interface PaymentInstructionsProps {
  amount: number;
  currency?: string;
  upiId?: string;
  accountName?: string;
  eventTitle?: string;
}

function formatPrice(amount: number, currency: string): string {
  const symbol = currency === 'INR' ? '₹' : '$';
  // Amounts are stored in paise/cents (e.g., 15000 for ₹150)
  const displayAmount = amount / 100;
  if (currency === 'INR') {
    return `${symbol}${displayAmount.toLocaleString('en-IN')}`;
  }
  return `${symbol}${displayAmount.toLocaleString()}`;
}

export function PaymentInstructions({
  amount,
  currency = 'INR',
  upiId = 'payments@7notes',
  accountName = '7 NOTES Events',
  eventTitle,
}: PaymentInstructionsProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const upiDeepLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(accountName)}&am=${amount}&cu=${currency}&tn=${encodeURIComponent(eventTitle ? `Ticket for ${eventTitle}` : 'Event Ticket')}`;

  async function handleCopyUpiId() {
    try {
      await navigator.clipboard.writeText(upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = upiId;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleOpenUpiApp() {
    window.open(upiDeepLink, '_blank');
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-surface overflow-hidden">
      {/* Header */}
      <div className="border-b border-[var(--color-border)] bg-primary/5 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Payment Instructions</h3>
            <p className="text-xs text-text-secondary">Pay via UPI and submit your proof below</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Amount to Pay */}
        <div className="rounded-lg bg-surface-elevated px-4 py-3 text-center">
          <p className="text-xs text-text-muted">Amount to Pay</p>
          <p className="mt-1 text-2xl font-bold text-white">{formatPrice(amount, currency)}</p>
        </div>

        {/* UPI ID with copy */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">UPI ID</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-lg border border-[var(--color-border)] bg-surface-elevated px-3 py-2.5 font-mono text-sm text-white">
              {upiId}
            </div>
            <button
              onClick={handleCopyUpiId}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border)] bg-surface-elevated text-text-secondary hover:text-white hover:border-primary transition-colors"
              title="Copy UPI ID"
            >
              {copied ? (
                <svg className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
              )}
            </button>
          </div>
          {copied && (
            <p className="mt-1 text-xs text-success">Copied to clipboard!</p>
          )}
        </div>

        {/* Account Name */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">Account Name</label>
          <p className="rounded-lg border border-[var(--color-border)] bg-surface-elevated px-3 py-2.5 text-sm text-white">
            {accountName}
          </p>
        </div>

        {/* Steps */}
        <div className="rounded-lg border border-[var(--color-border)] p-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex w-full items-center justify-between text-sm font-medium text-white"
          >
            <span>How to pay via UPI</span>
            <svg
              className={`h-4 w-4 text-text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          {expanded && (
            <ol className="mt-3 space-y-2 text-xs text-text-secondary list-decimal list-inside">
              <li>Open your UPI app (Google Pay, PhonePe, Paytm, BHIM, etc.)</li>
              <li>Tap <strong className="text-white">Pay / Send</strong></li>
              <li>Enter UPI ID: <span className="font-mono text-white">{upiId}</span></li>
              <li>Enter amount: <span className="font-medium text-white">{formatPrice(amount, currency)}</span></li>
              <li>Complete the payment and note the <strong className="text-white">UTR / Transaction Reference</strong> number shown on the confirmation screen</li>
              <li>Take a <strong className="text-white">screenshot</strong> of the payment confirmation</li>
              <li>Come back and fill in the form below with the UTR and screenshot</li>
            </ol>
          )}
        </div>

        {/* Open UPI App button */}
        <button
          onClick={handleOpenUpiApp}
          className="w-full rounded-lg bg-primary/10 border border-primary/20 py-2.5 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
        >
          Open UPI App
        </button>

        {/* QR Code */}
        <div className="text-center">
          <p className="mb-2 text-xs text-text-muted">Or scan to pay</p>
          <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-border)] bg-surface-elevated">
            <div className="text-center">
              <svg className="mx-auto h-10 w-10 text-text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
              </svg>
              <p className="mt-1 text-2xs text-text-muted">QR will render here</p>
            </div>
          </div>
          <p className="mt-2 text-2xs text-text-muted">Scan with any UPI app to pay</p>
        </div>

        {/* Important note */}
        <div className="rounded-lg bg-warning/5 border border-warning/10 px-4 py-3">
          <div className="flex items-start gap-2">
            <span className="text-warning text-sm flex-shrink-0">⚠</span>
            <p className="text-xs text-text-secondary">
              Only submit after you have <strong className="text-white">completed the payment</strong> and received a 
              UTR number. Payments without a valid UTR cannot be verified.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
