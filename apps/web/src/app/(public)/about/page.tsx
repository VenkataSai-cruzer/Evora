import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About',
  description: '7 NOTES is the official event platform for live music experiences.',
};

export default function AboutPage() {
  return (
    <div className="page-container py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold text-white">About 7 NOTES</h1>
        <p className="mt-4 text-lg text-text-secondary">
          7 NOTES organizes live music events. Browse, book, and attend — all in one place.
        </p>
      </div>
      <section className="mx-auto mt-12 max-w-3xl space-y-4 text-sm text-text-secondary">
        <p>7 NOTES is the official event platform for live music experiences. Every event is organized by the 7 NOTES team. Tickets are verified, payments confirmed, and check-ins recorded.</p>
      </section>
      <section className="mt-12 text-center">
        <Link href="/events" className="rounded-lg bg-primary px-6 py-3 font-medium text-white hover:bg-primary-hover">Browse events</Link>
      </section>
    </div>
  );
}
