import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { RegistrationFlow } from './RegistrationFlow';
import { parseInstruments, formatTime, formatDateLong, SKILL_LABELS } from '@/lib/prisma-types';

interface EventPageProps {
  params: { slug: string };
}

export async function generateStaticParams() {
  try {
    const events = await prisma.event.findMany({
      where: { status: { in: ['PUBLISHED', 'SALES_OPEN'] }, visibility: 'PUBLIC' },
      select: { slug: true },
    });
    return events.map((event) => ({ slug: event.slug }));
  } catch {
    // If DB is unavailable during build, fall back to dynamic rendering
    return [];
  }
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const event = await prisma.event.findUnique({
    where: { slug: params.slug },
    select: { title: true, description: true, coverImageUrl: true },
  });

  if (!event) return { title: 'Event Not Found' };

  return {
    title: event.title,
    description: event.description.slice(0, 160),
    openGraph: event.coverImageUrl ? { images: [event.coverImageUrl] } : undefined,
  };
}

export default async function EventDetailPage({ params }: EventPageProps) {
  const event = await prisma.event.findUnique({
    where: { slug: params.slug },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      coverImageUrl: true,
      startDate: true,
      startTime: true,
      endDate: true,
      endTime: true,
      venueName: true,
      venueAddress: true,
      venueLat: true,
      venueLng: true,
      capacity: true,
      ticketType: true,
      priceAmount: true,
      upiId: true,
      upiQrCodeUrl: true,
      instruments: true,
      skillLevel: true,
      status: true,
      visibility: true,
      organizer: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          bio: true,
        },
      },
      _count: {
        select: {
          tickets: {              where: { status: { in: ['CONFIRMED', 'CHECKED_IN'] } },
          },
        },
      },
    },
  });

  if (!event || !['PUBLISHED', 'SALES_OPEN'].includes(event.status) || event.visibility !== 'PUBLIC') {
    notFound();
  }

  const instrumentsList = parseInstruments(event.instruments);
  const spotsLeft = event.capacity - event._count.tickets;
  const fillPercent = event.capacity > 0
    ? Math.round((event._count.tickets / event.capacity) * 100)
    : 0;

  const capacityColor =
    fillPercent >= 95 ? 'bg-error' :
    fillPercent >= 80 ? 'bg-warning' :
    fillPercent >= 50 ? 'bg-primary' :
    'bg-success';

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
        {event.coverImageUrl ? (
          <img
            src={event.coverImageUrl}
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
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant={event.ticketType === 'FREE' ? 'success' : 'primary'} size="md">
                  {event.ticketType === 'FREE' ? 'Free' : event.priceAmount ? `$${(event.priceAmount / 100).toFixed(2)}` : 'Free'}
                </Badge>
                <Badge variant="outline" size="md">
                  {SKILL_LABELS[event.skillLevel] || event.skillLevel}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-lg">📅</span>
              <div>
                <p className="font-medium text-white">{formatDateLong(event.startDate)}</p>
                <p className="text-sm text-text-secondary">
                  {formatTime(event.startTime)}
                  {event.endTime ? ` – ${event.endTime}` : ''}
                </p>
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

          <section>
            <h2 className="text-lg font-semibold text-white">About this event</h2>
            <div className="mt-2 text-sm leading-relaxed text-text-secondary whitespace-pre-line">
              {event.description}
            </div>
          </section>

          {instrumentsList.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-white">Instruments needed</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {instrumentsList.map((inst: string) => (
                  <Badge key={inst} variant="primary" size="md">
                    {inst}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-xl border border-[var(--color-border)] bg-surface p-4">
            <h2 className="text-sm font-semibold text-white">Organized by</h2>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                {event.organizer.displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{event.organizer.displayName}</p>
                {event.organizer.bio && (
                  <p className="text-xs text-text-muted">{event.organizer.bio}</p>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-xl border border-[var(--color-border)] bg-surface p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {event.ticketType === 'FREE' ? 'Free' : event.priceAmount ? `$${(event.priceAmount / 100).toFixed(2)}` : 'Free'}
              </div>
              <p className="mt-1 text-sm text-text-secondary">
                {event.ticketType === 'FREE' ? 'Free entry' : 'per ticket'}
              </p>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between text-sm">
                <span className={`font-medium ${spotsLeft === 0 ? 'text-error' : 'text-text-secondary'}`}>
                  {spotsLeft > 0 ? `${spotsLeft} spots left` : 'Event full'}
                </span>
                <span className="text-text-muted">
                  {event._count.tickets}/{event.capacity}
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
                eventDate={formatDateLong(event.startDate)}
                eventTime={formatTime(event.startTime)}
                venueName={event.venueName}
                venueAddress={event.venueAddress}
                coverImageUrl={event.coverImageUrl}
                ticketType={event.ticketType}
                capacity={event.capacity}
                spotsLeft={spotsLeft}
                upiId={event.upiId}
                upiQrCodeUrl={event.upiQrCodeUrl}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
