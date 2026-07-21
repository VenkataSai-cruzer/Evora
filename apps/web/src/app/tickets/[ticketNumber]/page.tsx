'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/lib/auth-provider';
import { formatDate } from '@/lib/dates';
import { getTicket } from '@/lib/api-client';
import { TicketPassClient } from './TicketPassClient';
import type { TicketDetailResponse } from '@/lib/api-client';

const STATUS_STYLES: Record<string, { variant: 'success' | 'warning' | 'error' | 'default' | 'primary' | 'outline'; label: string }> = {
  CONFIRMED: { variant: 'success', label: 'Confirmed' },
  CHECKED_IN: { variant: 'primary', label: 'Checked In' },
  CANCELLED: { variant: 'error', label: 'Cancelled' },
  EXPIRED: { variant: 'default', label: 'Expired' },
};

interface PageProps {
  params: { ticketNumber: string };
}

export default function TicketDetailPage({ params }: PageProps) {
  return (
    <AuthGuard>
      <TicketDetailContent ticketNumber={params.ticketNumber} />
    </AuthGuard>
  );
}

function TicketDetailContent({ ticketNumber }: { ticketNumber: string }) {
  const { user } = useAuth();
  const [ticket, setTicket] = useState<TicketDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFoundState, setNotFound] = useState(false);

  useEffect(() => {
    if (!user) return;
    const uid = user.id;
    const urole = user.role;

    async function load() {
      try {
        const data = await getTicket(ticketNumber);
        if (!data) {
          setNotFound(true);
          return;
        }
        const isOwner = data.userId === uid;
        const isOrganizer = data.event.organizerId === uid;
        const isAdmin = urole === 'ADMIN';
        if (!isOwner && !isOrganizer && !isAdmin) {
          setNotFound(true);
          return;
        }
        setTicket(data);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [ticketNumber, user]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-surface-elevated" />
          <div className="h-4 w-32 rounded bg-surface-elevated" />
        </div>
      </div>
    );
  }

  if (notFoundState || !ticket) {
    notFound();
    return null;
  }

  const statusStyle = STATUS_STYLES[ticket.status] || { variant: 'default' as const, label: ticket.status };
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

            {(ticket.status === 'CONFIRMED' || ticket.status === 'CHECKED_IN') && (
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
