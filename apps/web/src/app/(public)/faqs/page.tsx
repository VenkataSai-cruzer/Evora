'use client';

import { useState } from 'react';

const FAQS = [
  { q: 'How do I book a ticket?', a: 'Browse our events page, select an event, choose your ticket type, and complete the booking process. You\'ll receive payment instructions after booking.' },
  { q: 'What payment methods are accepted?', a: 'We accept UPI payments. After booking, you\'ll see the payment QR code and UPI ID details.' },
  { q: 'How do I get my ticket after payment?', a: 'Once your payment is verified by the organizer, your ticket will be generated and available in the "My Ticket" section.' },
  { q: 'How long does payment verification take?', a: 'Payment verification is done manually and typically takes a few hours. You\'ll be notified once it\'s confirmed.' },
  { q: 'Can I get a refund?', a: 'Tickets are non-refundable once confirmed. Please check the event terms before booking.' },
  { q: 'What if the event is cancelled?', a: 'If an event is cancelled by the organizer, you will be notified and offered a full refund or transfer to a rescheduled date.' },
];

export default function FAQsPage() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-white">FAQs</h1>
      <p className="mt-1 text-text-secondary">Frequently asked questions</p>

      <div className="mt-8 space-y-2">
        {FAQS.map((faq, i) => (
          <div key={i} className="rounded-xl border border-[var(--color-border)] bg-surface overflow-hidden">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-surface-hover"
            >
              <span className="text-sm font-medium text-white">{faq.q}</span>
              <svg className={`h-4 w-4 text-text-muted transition-transform ${open === i ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            {open === i && (
              <div className="border-t border-[var(--color-border)] px-4 py-3">
                <p className="text-sm text-text-secondary">{faq.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
