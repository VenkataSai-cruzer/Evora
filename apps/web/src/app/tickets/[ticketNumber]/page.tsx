export const dynamic = 'force-dynamic';

import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/dates';
import { getSession, getTicket } from '@/lib/api-client';
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
  const session = await getSession();
  if (!session) {
    redirect(`/auth/login?callbackUrl=/tickets/${params.ticketNumber}`);
  }

  let ticket;
  try {
    ticket = await getTicket(params.ticketNumber);
  } catch {
    notFound();
  }

  if (!ticket) {
    notFound();
  }

  const isPurchaser = ticket.userId === session.id;
  const isOrganizer = ticket.event.organizerId === session.id;
  const isAdmin = session.role === 'ADMIN';
  const isAttendee = ticket.attendee?.attendeeEmail === session.email;

  if (!isPurchaser && !isOrganizer && !isAdmin && !isAttendee) {
    notFound();
  }

  const statusStyle = STATUS_STYLES[ticket.status] || { variant: 'default' as const, label: ticket.status };
  const canViewQR = (ticket.status === 'CONFIRMED' || ticket.status === 'CHECKED_IN')
    && (isPurchaser || isOrganizer || isAdmin);
  const displayPrice = ticket.ticketType?.price === 0 ? 'Free' : `₹${((ticket.ticketType?.price || 0) / 100).toFixed(0)}`;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="mx-auto max-w-md">
        <Link
          href="/tickets"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          My Tickets
        </Link>

        <div className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-b from-surface to-surface-elevated shadow-xl shadow-primary/5">
          <div className="relative bg-gradient-to-r from-primary/20 to-primary/5 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-white">{ticket.event.title}</h1>
              </div>
              <Badge variant={statusStyle.variant} size="md">{statusStyle.label}</Badge>
            </div>
            <p className="mt-2 text-lg font-semibold text-success">{displayPrice}</p>
          </div>

          <div className="p-5 space-y-4">
            <div className="rounded-xl bg-surface/50 p-4">
              <p className="text-xs text-text-muted">Attendee</p>
              <p className="mt-1 text-base font-semibold text-white">
                {ticket.attendee?.attendeeName || ticket.user.name}
              </p>
              {ticket.attendee?.attendeeEmail && (
                <p className="text-xs text-text-muted">{ticket.attendee.attendeeEmail}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-surface/50 p-3">
                <p className="text-xs text-text-muted">Ticket</p>
                <p className="mt-0.5 text-sm font-mono font-medium text-white">{ticket.ticketNumber}</p>
              </div>
              <div className="rounded-xl bg-surface/50 p-3">
                <p className="text-xs text-text-muted">Type</p>
                <p className="mt-0.5 text-sm font-medium text-white">{ticket.ticketType?.name}</p>
              </div>
            </div>

            <div className="rounded-xl bg-surface/50 p-4">
              <p className="text-xs text-text-muted">Event</p>
              <p className="mt-1 text-base font-semibold text-white">{ticket.event.title}</p>
              <p className="mt-1 text-sm text-text-secondary">{formatDate(ticket.event.startAt)}</p>
              <p className="text-sm text-text-secondary">{ticket.event.venueName}</p>
              {ticket.event.venueAddress && (
                <p className="text-xs text-text-muted">{ticket.event.venueAddress}</p>
              )}
            </div>

            {ticket.order && (
              <div className="rounded-xl bg-surface/50 p-3">
                <p className="text-xs text-text-muted">Order</p>
                <p className="mt-0.5 text-sm font-mono font-medium text-white">{ticket.order.orderNumber}</p>
                <p className="text-xs text-text-muted">Status: {ticket.order.status}</p>
              </div>
            )}

            <div className="rounded-xl bg-surface/50 p-3">
              <p className="text-xs text-text-muted">Organized by</p>
              <p className="mt-0.5 text-sm font-medium text-white">{ticket.event.organizer?.name || 'Unknown'}</p>
            </div>

            {canViewQR && (
              <TicketPassClient
                ticketNumber={ticket.ticketNumber}
                attendeeName={ticket.attendee?.attendeeName || ticket.user.name}
                eventTitle={ticket.event.title}
                eventDate={formatDate(ticket.event.startAt)}
                venueName={ticket.event.venueName}
                ticketTypeName={ticket.ticketType?.name || ''}
              />
            )}

            <div className="flex gap-2">
              <span
                className="flex-1 rounded-lg bg-primary/30 px-4 py-2.5 text-center text-sm font-medium text-primary/50 cursor-not-allowed"
                title="Ticket file generation is not available in staging yet"
              >
                Download Pass
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
