import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'FAQs',
  description: 'Frequently asked questions about 7 NOTES events and ticketing.',
};

const FAQS = [
  {
    q: 'How do I book a ticket?',
    a: 'Browse the events page, select an event, choose your ticket type, and complete the registration. You will need a 7 NOTES account to book.',
  },
  {
    q: 'How do payments work?',
    a: 'Payments are processed through UPI. After booking, you will receive payment details including the official 7 NOTES UPI QR. Once the payment appears in our receiving account, your booking is confirmed.',
  },
  {
    q: 'How long does payment verification take?',
    a: 'Payment verification is done manually. It may take up to 15\u201330 minutes during event hours. We recommend booking in advance.',
  },
  {
    q: 'Can I cancel or get a refund?',
    a: 'Tickets are non-refundable and non-transferable once confirmed. Please check the event terms before booking.',
  },
  {
    q: 'How do I access my ticket?',
    a: 'After payment is confirmed, your ticket appears under My Tickets in your account. You can view the QR code from there.',
  },
  {
    q: 'What happens at check-in?',
    a: 'Present your ticket QR code at the venue. Our team will scan it to verify your entry. Each ticket can be scanned only once.',
  },
];

export default function FAQsPage() {
  return (
    <div className="page-container py-16">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Frequently Asked Questions</h1>
          <p className="mt-2 text-text-secondary">
            Everything you need to know about 7 NOTES events.
          </p>
        </div>

        <div className="mt-12 space-y-4">
          {FAQS.map((faq, i) => (
            <details
              key={i}
              className="group rounded-xl border border-[var(--color-border)] bg-surface overflow-hidden"
            >
              <summary className="flex cursor-pointer items-center justify-between p-4 text-sm font-medium text-white transition-colors hover:bg-surface-hover [&::-webkit-details-marker]:hidden">
                {faq.q}
                <svg
                  className="h-4 w-4 shrink-0 text-text-muted transition-transform duration-200 group-open:rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </summary>
              <div className="border-t border-[var(--color-border)] px-4 py-3">
                <p className="text-sm text-text-secondary leading-relaxed">{faq.a}</p>
              </div>
            </details>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-text-muted">
            Still have questions?{' '}
            <Link href="/contact" className="font-medium text-primary hover:text-primary-hover">
              Get in touch
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
