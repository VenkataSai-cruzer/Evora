'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getTicket } from '@/lib/api-client';
import { formatDate, formatTime } from '@/lib/dates';

export default function TicketDetailPage() {
  const { ticketNumber } = useParams<{ ticketNumber: string }>();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ticketNumber) return;
    getTicket(ticketNumber)
      .then(setTicket)
      .catch(() => setError('Ticket not found'))
      .finally(() => setLoading(false));
  }, [ticketNumber]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-surface-elevated" />
        <div className="h-80 rounded-xl bg-surface-elevated" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="text-center py-12">
        <h1 className="text-xl font-bold text-white">Ticket not found</h1>
        <Link href="/my-ticket" className="mt-4 inline-block text-sm text-primary">&larr; My Tickets</Link>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    CONFIRMED: 'text-success',
    CHECKED_IN: 'text-primary',
    PENDING_PAYMENT: 'text-warning',
    CANCELLED: 'text-error',
    EXPIRED: 'text-text-muted',
  };

  return (
    <div className="space-y-6">
      <Link href="/my-ticket" className="text-sm text-text-muted hover:text-white transition-colors">
        &larr; My Tickets
      </Link>

      <h1 className="text-2xl font-bold text-white">Ticket</h1>

      {/* ── Pass Card ────────────────────────────────── */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-surface overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-6 text-center border-b border-[var(--color-border)]">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-1">7 NOTES</p>
          <h2 className="text-xl font-bold text-white">{ticket.event?.title}</h2>
          <p className={`mt-2 text-sm font-semibold ${statusColors[ticket.status] || 'text-text-muted'}`}>
            {ticket.status === 'CHECKED_IN' ? 'CHECKED IN' : ticket.status}
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="text-center">
            <p className="text-lg font-semibold text-white">{ticket.attendee?.attendeeName || ticket.user?.name}</p>
            <p className="text-xs text-text-muted">{ticket.ticketType?.name}</p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Event</span>
              <span className="text-white">{ticket.event?.title}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Date</span>
              <span className="text-white">{ticket.event ? formatDate(ticket.event.startAt) : ''}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Time</span>
              <span className="text-white">{ticket.event ? formatTime(ticket.event.startAt) : ''}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Venue</span>
              <span className="text-white text-right">{ticket.event?.venueName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Ticket #</span>
              <span className="text-white font-mono text-xs">{ticket.ticketNumber}</span>
            </div>
            {ticket.order && (
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Order</span>
                <span className="text-white font-mono text-xs">{ticket.order.orderNumber}</span>
              </div>
            )}
          </div>

          {/* QR Code — rendered from qrToken via API */}
          <div className="flex flex-col items-center py-4 gap-2">
            {ticket.qrCodeUrl ? (
              <img src={ticket.qrCodeUrl} alt="Ticket QR Code" className="h-44 w-44 rounded-xl border-4 border-white object-contain" />
            ) : (
              <div className="flex h-44 w-44 flex-col items-center justify-center rounded-xl bg-white gap-2">
                <span className="text-4xl text-black opacity-20">◆</span>
                <span className="text-xs text-black/40">QR generating...</span>
              </div>
            )}
            <p className="text-center text-xs text-text-muted">Show this QR at the venue for entry</p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--color-border)] bg-surface-elevated p-4 text-center">
          <p className="text-xs text-text-muted">
            {ticket.event?.organizer?.name || '7 NOTES'} &middot; {ticket.event?.venueAddress || ticket.event?.venueName}
          </p>
        </div>
      </div>

      {/* ── Check-in Status ──────────────────────────── */}
      {ticket.checkIn && (
        <div className="rounded-xl border border-success/20 bg-success/5 p-4">
          <div className="flex items-center gap-2">
            <span className="text-success">✓</span>
            <p className="text-sm text-success font-medium">
              Checked in at {formatTime(ticket.checkIn.checkedInAt)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
