import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { formatDate, formatTime } from '@/lib/prisma-types';
import { TicketPassClient } from './TicketPassClient';

interface PageProps {
  params: { ticketNumber: string };
}

export const metadata: Metadata = {
  title: 'Event Pass',
  description: 'View your event ticket and pass.',
};

const STATUS_STYLES: Record<string, { variant: 'success' | 'warning' | 'error' | 'default' | 'primary' | 'outline'; label: string }> = {
  CONFIRMED: { variant: 'success', label: 'Confirmed' },
  CHECKED_IN: { variant: 'primary', label: 'Checked In' },
  CANCELLED: { variant: 'error', label: 'Cancelled' },
  EXPIRED: { variant: 'default', label: 'Expired' },
};

export default async function TicketDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect(`/auth/login?callbackUrl=/tickets/${params.ticketNumber}`);
  }

  const ticket = await prisma.ticket.findUnique({
    where: { ticketNumber: params.ticketNumber },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          slug: true,
          coverImageUrl: true,
          eventLogoUrl: true,
          edition: true,
          startDate: true,
          startTime: true,
          endDate: true,
          endTime: true,
          venueName: true,
          venueAddress: true,
          entryGate: true,
          entryInstructions: true,
          capacity: true,
          ticketType: true,
          priceAmount: true,
          status: true,
          organizerId: true,
          organizer: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
      order: {
        select: {
          id: true,
          orderNumber: true,
          bookingType: true,
          attendeeCount: true,
          status: true,
        },
      },
      attendee: {
        select: {
          id: true,
          fullName: true,
          email: true,
          ticketCategory: true,
          isCheckedIn: true,
          checkedInAt: true,
        },
      },
      user: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
    },
  });

  if (!ticket) {
    notFound();
  }

  // Authorization
  const isPurchaser = ticket.userId === session.user.id;
  const isOrganizer = ticket.event.organizerId === session.user.id;
  const isAdmin = session.user.role === 'ADMIN';
  const isAttendee = ticket.attendee?.email === session.user.email;

  if (!isPurchaser && !isOrganizer && !isAdmin && !isAttendee) {
    notFound();
  }

  const statusStyle = STATUS_STYLES[ticket.status] || { variant: 'default' as const, label: ticket.status };
  const canViewQR = (ticket.status === 'CONFIRMED' || ticket.status === 'CHECKED_IN')
    && (isPurchaser || isOrganizer || isAdmin);
  const displayPrice = ticket.event.ticketType === 'FREE' ? 'Free' : ticket.event.priceAmount
    ? `$${(ticket.event.priceAmount / 100).toFixed(2)}`
    : 'Free';

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="mx-auto max-w-md">
        {/* Back link */}
        <Link
          href="/tickets"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          My Tickets
        </Link>

        {/* The pass card */}
        <div className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-b from-surface to-surface-elevated shadow-xl shadow-primary/5">
          {/* Header with status */}
          <div className="relative bg-gradient-to-r from-primary/20 to-primary/5 p-5">
            <div className="flex items-center justify-between">
              <div>
                {ticket.event.eventLogoUrl ? (
                  <img src={ticket.event.eventLogoUrl} alt="" className="mb-2 h-8 object-contain" />
                ) : null}
                <h1 className="text-xl font-bold text-white">{ticket.event.title}</h1>
                {ticket.event.edition && (
                  <p className="mt-0.5 text-xs font-medium text-primary">{ticket.event.edition}</p>
                )}
              </div>
              <Badge variant={statusStyle.variant} size="md">{statusStyle.label}</Badge>
            </div>
            <p className="mt-2 text-lg font-semibold text-success">{displayPrice}</p>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {/* Attendee info */}
            <div className="rounded-xl bg-surface/50 border border-[var(--color-border)] p-4">
              <p className="text-xs text-text-muted uppercase tracking-wider">Attendee</p>
              <p className="mt-1 text-lg font-bold text-white">{ticket.attendee?.fullName || ticket.user.displayName}</p>
              <p className="text-sm text-primary font-medium">{ticket.attendee?.ticketCategory || ticket.category || 'General'}</p>
            </div>

            {/* Details grid */}
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-[var(--color-border)] last:border-0">
                <span className="text-xs text-text-muted uppercase tracking-wider">Date</span>
                <span className="text-sm font-semibold text-white">{formatDate(ticket.event.startDate)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[var(--color-border)] last:border-0">
                <span className="text-xs text-text-muted uppercase tracking-wider">Time</span>
                <span className="text-sm font-semibold text-white">
                  {formatTime(ticket.event.startTime)}
                  {ticket.event.endTime ? ` – ${formatTime(ticket.event.endTime)}` : ''}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[var(--color-border)] last:border-0">
                <span className="text-xs text-text-muted uppercase tracking-wider">Venue</span>
                <span className="text-sm font-semibold text-white text-right">{ticket.event.venueName}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[var(--color-border)] last:border-0">
                <span className="text-xs text-text-muted uppercase tracking-wider">Address</span>
                <span className="text-sm font-semibold text-white text-right">{ticket.event.venueAddress}</span>
              </div>
              {ticket.event.entryGate && (
                <div className="flex justify-between items-center py-2 border-b border-[var(--color-border)] last:border-0">
                  <span className="text-xs text-text-muted uppercase tracking-wider">Entry Gate</span>
                  <span className="text-sm font-semibold text-white">{ticket.event.entryGate}</span>
                </div>
              )}
              {ticket.order?.bookingType && (
                <div className="flex justify-between items-center py-2 border-b border-[var(--color-border)] last:border-0">
                  <span className="text-xs text-text-muted uppercase tracking-wider">Booking</span>
                  <span className="text-sm font-semibold text-white">{ticket.order.bookingType}</span>
                </div>
              )}
              {ticket.order?.orderNumber && (
                <div className="flex justify-between items-center py-2 border-b border-[var(--color-border)] last:border-0">
                  <span className="text-xs text-text-muted uppercase tracking-wider">Order</span>
                  <span className="text-sm font-mono font-semibold text-white">{ticket.order.orderNumber}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2 border-b border-[var(--color-border)] last:border-0">
                <span className="text-xs text-text-muted uppercase tracking-wider">Ticket No.</span>
                <span className="text-sm font-mono font-semibold text-white">{ticket.ticketNumber}</span>
              </div>
            </div>

            {/* Entry instructions */}
            {ticket.event.entryInstructions && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                <p className="text-xs font-medium text-primary mb-1">📋 Entry Instructions</p>
                <p className="text-xs text-text-secondary">{ticket.event.entryInstructions}</p>
              </div>
            )}

            {/* QR Code Section */}
            {canViewQR && (
              <TicketPassClient
                ticketNumber={ticket.ticketNumber}
                qrSecret={ticket.qrSecret}
                status={ticket.status}

              />
            )}

            {/* Status explanations */}
            {ticket.status === 'CHECKED_IN' && ticket.attendee?.checkedInAt && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                <p className="text-xs font-medium text-primary">✅ Checked In</p>
                <p className="mt-1 text-xs text-text-secondary">
                  Checked in at {ticket.attendee.checkedInAt.toLocaleTimeString()}
                </p>
              </div>
            )}
            {ticket.status === 'CANCELLED' && (
              <div className="rounded-lg border border-error/30 bg-error-bg p-3">
                <p className="text-xs font-medium text-error">This ticket has been cancelled.</p>
              </div>
            )}

            {/* Organizer info */}
            <div className="flex items-center gap-3 pt-2 border-t border-[var(--color-border)]">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {ticket.event.organizer.displayName.charAt(0)}
              </div>
              <div>
                <p className="text-xs text-text-muted">Organized by</p>
                <p className="text-sm font-medium text-white">{ticket.event.organizer.displayName}</p>
              </div>
            </div>
          </div>            {/* No-refund notice */}
            <div className="rounded-lg border border-warning/20 bg-warning-bg/50 p-3">
              <p className="text-xs font-medium text-warning">Non-Refundable &amp; Non-Transferable</p>
              <p className="mt-0.5 text-xs text-warning/80">
                Tickets are non-refundable and non-transferable once confirmed.
              </p>
            </div>

            {/* Footer */}
          <div className="border-t border-[var(--color-border)] p-4 text-center">
            <p className="text-xs text-text-muted">
              Final ticket status is verified at the venue.
            </p>
            <p className="mt-1 text-xs text-text-muted">Jamming Events</p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3">
          <a
            href={`/api/tickets/${ticket.ticketNumber}/download`}
            download
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-white transition-all hover:bg-primary-hover"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download Pass (HTML)
          </a>

          <Link
            href={`/events/${ticket.event.slug}`}
            className="flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-3 text-sm font-medium text-text-secondary transition-all hover:bg-surface-hover hover:text-white"
          >
            View Event Details
          </Link>

          {(isPurchaser || isOrganizer || isAdmin) && (ticket.status === 'CONFIRMED') && (
            <form action={`/api/tickets/${ticket.ticketNumber}/cancel`} method="POST">
              <button
                type="submit"
                className="w-full rounded-lg border border-error/30 px-4 py-3 text-sm font-medium text-error transition-all hover:bg-error-bg"
                onClick={(e) => {
                  if (!confirm('Are you sure you want to cancel this ticket? This cannot be undone.')) {
                    e.preventDefault();
                  }
                }}
              >
                Cancel Ticket
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
