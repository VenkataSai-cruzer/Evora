'use client';

import { useState } from 'react';

interface PaymentInstructionsProps {
  amount: number;
  currency?: string;
  accountName?: string;
  upiId?: string;
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
  accountName = 'SUNKARI MOHAN TEJA',
  upiId = '9381755977-2@ybl',
}: PaymentInstructionsProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrError, setQrError] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  };

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
            <p className="text-xs text-text-secondary">Complete payment using the details below</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Amount to Pay */}
        <div className="rounded-lg bg-surface-elevated px-4 py-3 text-center">
          <p className="text-xs text-text-muted">Amount to Pay</p>
          <p className="mt-1 text-2xl font-bold text-white">{formatPrice(amount, currency)}</p>
        </div>

        {/* Official Bank QR Code */}
        <div className="text-center">
          <p className="mb-3 text-xs text-text-muted">Scan QR or use UPI ID below to pay</p>
          <div className="mx-auto inline-flex flex-col items-center rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-lg">
            {qrError ? (
              <div className="flex h-64 w-64 flex-col items-center justify-center gap-2 rounded-lg bg-gray-50">
                <svg className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
                </svg>
                <p className="text-xs text-gray-400">QR unavailable</p>
                <p className="text-xs font-medium text-primary">Use UPI ID below</p>
              </div>
            ) : (
              <img
                src="/brand/QR.jpeg"
                alt="Bank QR Code"
                className="h-64 w-64 object-contain"
                onError={() => setQrError(true)}
              />
            )}
            <p className="mt-2 text-xs font-semibold text-gray-800">
              {accountName}
            </p>
          </div>
        </div>

        {/* Pay via UPI ID — always visible */}
        <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
          <div className="bg-primary/5 border-b border-[var(--color-border)] px-4 py-2.5">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <p className="text-xs font-semibold text-white">Pay via UPI</p>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="text-2xs text-text-muted uppercase tracking-wider">Account Holder</label>
              <p className="mt-0.5 text-sm font-medium text-white">{accountName}</p>
            </div>
            <div>
              <label className="text-2xs text-text-muted uppercase tracking-wider">UPI ID</label>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-sm font-mono font-bold text-primary flex-1">{upiId}</span>
                <button
                  onClick={handleCopy}
                  className={`flex-shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    copied
                      ? 'bg-green-400/10 text-green-400'
                      : 'bg-primary/10 text-primary hover:bg-primary/20'
                  }`}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <div className="flex gap-3 text-2xs text-text-muted">
              <span>Open GPay / PhonePe / Paytm</span>
              <span className="text-white/20">|</span>
              <span>Enter UPI ID & amount</span>
              <span className="text-white/20">|</span>
              <span>Pay</span>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="rounded-lg border border-[var(--color-border)] p-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex w-full items-center justify-between text-sm font-medium text-white"
          >
            <span>How to pay</span>
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
              <li>Open your UPI or banking app (GPay, PhonePe, Paytm, etc.)</li>
              <li>Scan the QR code or use the UPI ID to pay</li>
              <li>Enter amount: <span className="font-medium text-white">{formatPrice(amount, currency)}</span></li>
              <li>Verify the account holder name: <span className="font-medium text-white">{accountName}</span></li>
              <li>Complete the payment and note the <strong className="text-white">UTR / Transaction Reference</strong> number shown on the confirmation screen</li>
              <li>Take a <strong className="text-white">screenshot</strong> of the payment confirmation</li>
              <li>Come back and fill in the form below with the UTR and screenshot</li>
            </ol>
          )}
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
