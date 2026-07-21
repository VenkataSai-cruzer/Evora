import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About',
  description: '7 NOTES is the official event platform for live music experiences.',
};

const VALUES = [
  {
    icon: '✦',
    title: 'Music First',
    desc: 'Everything starts with the music. The platform exists to make live events happen.',
  },
  {
    icon: '✦',
    title: 'Clear and Direct',
    desc: 'Book a ticket, show up, listen. No unnecessary steps, no confusion.',
  },
  {
    icon: '✦',
    title: 'Built for Real Events',
    desc: 'Designed around the way live music actually works — from booking to check-in.',
  },
];

export default function AboutPage() {
  return (
    <div className="page-container py-16">
      {/* Hero */}
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold text-white">About 7 NOTES</h1>
        <p className="mt-4 text-lg leading-relaxed text-text-secondary">
          7 NOTES is the official event platform for live music experiences.
          Browse events, book tickets, and attend — all in one place.
        </p>
      </div>

      {/* What we do */}
      <section className="mx-auto mt-16 max-w-3xl">
        <h2 className="text-2xl font-bold text-white">What this is</h2>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-text-secondary">
          <p>
            7 NOTES organizes live music events. The platform handles ticketing, payments, 
            check-ins, and communication — so the focus stays on the music.
          </p>
          <p>
            Every event on this platform is organized by the 7 NOTES team. Tickets are verified, 
            payments are confirmed against the receiving account, and check-ins are recorded.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="mt-16">
        <h2 className="text-2xl font-bold text-white text-center">How we work</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {VALUES.map((value) => (
            <div
              key={value.title}
              className="rounded-xl border border-[var(--color-border)] bg-surface p-6 text-center"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-surface-elevated">
                <span className="text-lg text-primary">{value.icon}</span>
              </div>
              <h3 className="mt-4 font-semibold text-white">{value.title}</h3>
              <p className="mt-2 text-sm text-text-secondary">{value.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-16 text-center">
        <h2 className="text-2xl font-bold text-white">See upcoming events</h2>
        <p className="mt-2 text-text-secondary">Browse the current lineup and book your spot.</p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <Link
            href="/events"
            className="rounded-lg bg-primary px-6 py-3 font-medium text-white transition-all hover:bg-primary-hover hover:-translate-y-0.5"
          >
            Browse events
          </Link>
          <Link
            href="/contact"
            className="rounded-lg border border-[var(--color-border)] px-6 py-3 font-medium text-text-secondary transition-all hover:bg-surface-hover"
          >
            Get in touch
          </Link>
        </div>
      </section>
    </div>
  );
}
