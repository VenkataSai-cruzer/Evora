'use client';

import { useState } from 'react';

interface PaymentInstructionsProps {
  amount: number;
  currency?: string;
  accountName?: string;
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
}: PaymentInstructionsProps) {
  const [expanded, setExpanded] = useState(false);

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
            <p className="text-xs text-text-secondary">Scan the QR to pay and submit your proof below</p>
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
          <p className="mb-3 text-xs text-text-muted">Scan the QR to pay</p>
          <div className="mx-auto inline-flex flex-col items-center rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-lg">
            <img
              src="/brand/QR.jpeg"
              alt="Bank QR Code"
              className="h-64 w-64 object-contain"
            />
            <p className="mt-2 text-xs font-semibold text-gray-800">
              {accountName}
            </p>
          </div>
          <p className="mt-2 text-2xs text-text-muted">Scan with any UPI or banking app to pay</p>
        </div>

        {/* Account Name */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">Account Holder</label>
          <p className="rounded-lg border border-[var(--color-border)] bg-surface-elevated px-3 py-2.5 text-sm text-white font-medium">
            {accountName}
          </p>
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
              <li>Scan the QR code above or enter the account details manually</li>
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
