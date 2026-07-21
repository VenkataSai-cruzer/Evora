export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { formatDateLong } from '@/lib/dates';
import { getEventBySlug } from '@/lib/api-client';
import { BookingForm } from './BookingForm';

interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const event = await getEventBySlug(params.slug);
    return { title: event.title, description: event.shortDescription?.slice(0, 160) || '' };
  } catch { return { title: 'Event Not Found' }; }
}

export default async function EventDetailPage({ params }: Props) {
  let event;
  try { event = await getEventBySlug(params.slug); } catch { notFound(); }
  if (!event || event.status !== 'PUBLISHED') notFound();

  const minPrice = Math.min(...event.ticketTypes.map(t => t.price));
  const spotsLeft = event.totalCapacity - event._count.tickets;

  return (
    <div className="page-container py-8">
      <Link href="/events" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-white">
        &larr; Back to events
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white">{event.title}</h1>
            {event.shortDescription && <p className="mt-2 text-text-secondary">{event.shortDescription}</p>}
          </div>

          <div className="space-y-3">
            <p className="text-white"><span className="text-text-muted">Date:</span> {formatDateLong(event.startAt)}</p>
            <p className="text-white"><span className="text-text-muted">Venue:</span> {event.venueName}</p>
            {event.venueAddress && <p className="text-sm text-text-muted">{event.venueAddress}</p>}
          </div>

          {event.description && (
            <section>
              <h2 className="text-lg font-semibold text-white">About</h2>
              <div className="mt-2 text-sm text-text-secondary whitespace-pre-line">{event.description}</div>
            </section>
          )}

          {event.faqs && event.faqs.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-white">FAQs</h2>
              <div className="mt-3 space-y-3">
                {event.faqs.map(faq => (
                  <div key={faq.id} className="rounded-lg border border-[var(--color-border)] bg-surface p-4">
                    <p className="text-sm font-medium text-white">{faq.question}</p>
                    <p className="mt-1 text-xs text-text-secondary">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {event.performers && event.performers.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-white">Performers</h2>
              <div className="mt-3 space-y-2">
                {event.performers.map(p => (
                  <div key={p.id} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm text-primary">{p.name.charAt(0)}</div>
                    <div><p className="text-sm text-white">{p.name}</p>{p.instrument && <p className="text-xs text-text-muted">{p.instrument}</p>}</div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-xl border border-[var(--color-border)] bg-surface p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">₹{(minPrice / 100).toFixed(0)}</div>
              <p className="mt-1 text-sm text-text-secondary">per person</p>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">{spotsLeft > 0 ? `${spotsLeft} spots left` : 'Event full'}</span>
                <span className="text-text-muted">{event._count.tickets}/{event.totalCapacity}</span>
              </div>
            </div>
            <BookingForm
              eventId={event.id}
              ticketTypes={event.ticketTypes.map(t => ({
                id: t.id,
                name: t.name,
                price: t.price,
                capacity: t.capacity,
                maxPerOrder: t.maxPerOrder,
              }))}
              contactEmail={event.contactEmail}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
