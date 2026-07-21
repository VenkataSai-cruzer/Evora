export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { RegistrationFlow } from './RegistrationFlow';
import { formatDateLong } from '@/lib/dates';
import { getEventBySlug } from '@/lib/api-client';

interface EventPageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  try {
    const event = await getEventBySlug(params.slug);
    return {
      title: event.title,
      description: event.shortDescription?.slice(0, 160) || '',
      openGraph: event.posterObjectKey ? { images: [event.posterObjectKey] } : undefined,
    };
  } catch {
    return { title: 'Event Not Found' };
  }
}

export default async function EventDetailPage({ params }: EventPageProps) {
  let event;
  try {
    event = await getEventBySlug(params.slug);
  } catch {
    notFound();
  }

  if (!event || event.status !== 'PUBLISHED') {
    notFound();
  }

  const spotsLeft = event.totalCapacity - event._count.tickets;
  const fillPercent = event.totalCapacity > 0
    ? Math.round((event._count.tickets / event.totalCapacity) * 100)
    : 0;

  const capacityColor =
    fillPercent >= 95 ? 'bg-error' :
    fillPercent >= 80 ? 'bg-warning' :
    fillPercent >= 50 ? 'bg-primary' :
    'bg-success';

  const isFree = event.ticketTypes.some((t) => t.price === 0);
  const minPrice = Math.min(...event.ticketTypes.map((t) => t.price));

  return (
    <div className="page-container py-8">
      <Link
        href="/events"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-white"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to events
      </Link>

      <div className="relative mt-4 aspect-[21/9] overflow-hidden rounded-xl bg-surface-elevated">
        {event.posterObjectKey ? (
          <img
            src={event.posterObjectKey}
            alt={event.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-6xl opacity-20">🎵</span>
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">{event.title}</h1>
              {event.shortDescription && (
                <p className="mt-2 text-text-secondary">{event.shortDescription}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant={isFree ? 'success' : 'primary'} size="md">
                  {isFree ? 'Free' : `₹${(minPrice / 100).toFixed(0)}`}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-lg">📅</span>
              <div>
                <p className="font-medium text-white">{formatDateLong(event.startAt)}</p>
                {event.endAt && (
                  <p className="text-sm text-text-secondary">
                    Ends: {formatDateLong(event.endAt)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-lg">📍</span>
              <div>
                <p className="font-medium text-white">{event.venueName}</p>
                <p className="text-sm text-text-secondary">{event.venueAddress}</p>
              </div>
            </div>
          </div>

          {event.description && (
            <section>
              <h2 className="text-lg font-semibold text-white">About this event</h2>
              <div className="mt-2 text-sm leading-relaxed text-text-secondary whitespace-pre-line">
                {event.description}
              </div>
            </section>
          )}

          {event.performers && event.performers.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-white">Performers</h2>
              <div className="mt-3 space-y-3">
                {event.performers.map((performer: { id: string; name: string; instrument: string | null }) => (
                  <div key={performer.id} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                      {performer.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{performer.name}</p>
                      {performer.instrument && (
                        <p className="text-xs text-text-muted">{performer.instrument}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {event.faqs && event.faqs.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-white">FAQs</h2>
              <div className="mt-3 space-y-3">
                {event.faqs.map((faq: { id: string; question: string; answer: string }) => (
                  <div key={faq.id} className="rounded-lg border border-[var(--color-border)] bg-surface p-4">
                    <p className="text-sm font-medium text-white">{faq.question}</p>
                    <p className="mt-1 text-xs text-text-secondary">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {event.organizer && (
            <section className="rounded-xl border border-[var(--color-border)] bg-surface p-4">
              <h2 className="text-sm font-semibold text-white">Organized by</h2>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                  {event.organizer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{event.organizer.name}</p>
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-xl border border-[var(--color-border)] bg-surface p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {isFree ? 'Free' : `₹${(minPrice / 100).toFixed(0)}`}
              </div>
              <p className="mt-1 text-sm text-text-secondary">
                {isFree ? 'Free entry' : 'per person'}
              </p>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between text-sm">
                <span className={`font-medium ${spotsLeft === 0 ? 'text-error' : 'text-text-secondary'}`}>
                  {spotsLeft > 0 ? `${spotsLeft} spots left` : 'Event full'}
                </span>
                <span className="text-text-muted">
                  {event._count.tickets}/{event.totalCapacity}
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-elevated">
                <div
                  className={`h-full rounded-full transition-all ${capacityColor}`}
                  style={{ width: `${Math.min(fillPercent, 100)}%` }}
                />
              </div>
            </div>

            <div className="mt-6">
              <RegistrationFlow
                eventId={event.id}
                eventSlug={event.slug}
                eventTitle={event.title}
                eventDate={formatDateLong(event.startAt)}
                venueName={event.venueName}
                venueAddress={event.venueAddress || ''}
                posterObjectKey={event.posterObjectKey}
                spotsLeft={spotsLeft}
                ticketTypes={event.ticketTypes.map((t) => ({
                  id: t.id,
                  name: t.name,
                  price: t.price,
                  capacity: t.capacity,
                  soldCount: t.soldCount,
                  maxPerOrder: t.maxPerOrder,
                }))}
                contactEmail={event.contactEmail}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
