'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getTicket } from '@/lib/api-client';
import { formatDate, formatTime } from '@/lib/dates';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:10000/api/v1';

const STATUS_LABELS: Record<string, { label: string; color: string; description: string }> = {
  CONFIRMED: { label: 'Valid for entry', color: 'text-success', description: 'Show your ticket at the venue for entry.' },
  CHECKED_IN: { label: 'Checked in', color: 'text-primary', description: '' },
  REVOKED: { label: 'This ticket has been revoked', color: 'text-error', description: 'Contact the organizer for more information.' },
  CANCELLED: { label: 'This ticket has been cancelled', color: 'text-text-muted', description: 'Contact the organizer for more information.' },
  EXPIRED: { label: 'This event has ended', color: 'text-text-muted', description: 'Thank you for attending!' },
};

export default function TicketDetailPage() {
  const { ticketNumber } = useParams<{ ticketNumber: string }>();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [renderUrl, setRenderUrl] = useState<string | null>(null);
  const [renderError, setRenderError] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const loadTicket = useCallback(async () => {
    if (!ticketNumber) return;
    try {
      const t = await getTicket(ticketNumber);
      setTicket(t);

      // Load render image: fetch as blob for cookie-based auth (cross-origin)
      const renderEndpoint = `${API_BASE_URL}/tickets/${encodeURIComponent(ticketNumber)}/render`;
      try {
        const res = await fetch(renderEndpoint, { credentials: 'include' });
        if (res.ok) {
          const blob = await res.blob();
          setRenderUrl(URL.createObjectURL(blob));
        } else {
          setRenderError(true);
        }
      } catch {
        setRenderError(true);
      }
    } catch (err: any) {
      setError(err.message || 'Ticket not found');
    } finally {
      setLoading(false);
    }
  }, [ticketNumber]);

  useEffect(() => {
    loadTicket();
    return () => {
      // Cleanup object URL on unmount
      if (renderUrl) URL.revokeObjectURL(renderUrl);
    };
  }, [loadTicket]);

  const handleDownload = async () => {
    if (!ticketNumber) return;
    setDownloading(true);
    try {
      const endpoint = `${API_BASE_URL}/tickets/${encodeURIComponent(ticketNumber)}/download`;
      const res = await fetch(endpoint, { credentials: 'include' });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${ticketNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-24 rounded bg-surface-elevated" />
        <div className="h-8 w-48 rounded bg-surface-elevated" />
        <div className="h-[500px] rounded-xl bg-surface-elevated" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="space-y-6">
        <Link href="/tickets" className="text-sm text-text-muted hover:text-white transition-colors">&larr; My Tickets</Link>
        <div className="rounded-xl border border-error/20 bg-error/5 p-12 text-center">
          <h1 className="text-xl font-bold text-white">Ticket not found</h1>
          <p className="mt-2 text-sm text-text-secondary">{error || 'This ticket does not exist or you do not have access.'}</p>
          <Link href="/tickets" className="mt-6 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover transition-colors">
            My Tickets
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[ticket.status] || STATUS_LABELS.EXPIRED;
  const isRevokedOrCancelled = ['REVOKED', 'CANCELLED', 'EXPIRED'].includes(ticket.status);
  const isActive = ticket.status === 'CONFIRMED';
  const isCheckedIn = ticket.status === 'CHECKED_IN' || !!ticket.checkIn;

  return (
    <div className="space-y-6">
      <Link href="/tickets" className="text-sm text-text-muted hover:text-white transition-colors">&larr; My Tickets</Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Ticket</h1>
        <span className={`text-xs font-medium ${statusInfo.color}`}>{ticket.ticketNumber}</span>
      </div>

      {/* Status Banner */}
      <div className={`rounded-xl border p-4 ${
        isActive ? 'border-success/20 bg-success/5' :
        isCheckedIn ? 'border-primary/20 bg-primary/5' :
        isRevokedOrCancelled ? 'border-error/20 bg-error/5' :
        'border-[var(--color-border)] bg-surface'
      }`}>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${statusInfo.color}`}>
            {isActive ? '✓' : isCheckedIn ? '✓' : '✗'}
          </span>
          <div>
            <p className={`text-sm font-medium ${statusInfo.color}`}>{statusInfo.label}</p>
            {statusInfo.description && (
              <p className="text-xs text-text-muted mt-0.5">{statusInfo.description}</p>
            )}
            {isCheckedIn && ticket.checkIn?.checkedInAt && (
              <p className="text-xs text-text-muted mt-0.5">
                Checked in at {formatTime(ticket.checkIn.checkedInAt)} on {formatDate(ticket.checkIn.checkedInAt)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Ticket Render (Ticket.png-based) */}
      <div className="rounded-xl border border-[var(--color-border)] bg-surface overflow-hidden">
        {renderUrl ? (
          <div className="flex justify-center bg-black/5 p-4">
            <img
              src={renderUrl}
              alt={`Ticket ${ticketNumber}`}
              className="max-w-full h-auto rounded-lg shadow-md"
              style={{ maxHeight: '600px', width: 'auto' }}
            />
          </div>
        ) : renderError ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <span className="text-4xl mb-2">🎫</span>
            <p className="text-sm text-text-muted">Ticket preview unavailable</p>
            <p className="text-xs text-text-muted mt-1">You can still download the PDF.</p>
          </div>
        ) : (
          <div className="flex items-center justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>

      {/* Ticket Details */}
      <div className="rounded-xl border border-[var(--color-border)] bg-surface p-5 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">Event</span>
          <span className="text-white font-medium text-right">{ticket.event?.title || 'Event'}</span>
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
          <span className="text-text-muted">Attendee</span>
          <span className="text-white">{ticket.attendee?.attendeeName || ticket.user?.name || 'Attendee'}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">Ticket Type</span>
          <span className="text-white">{ticket.ticketType?.name || 'Standard'}</span>
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

      {/* Actions */}
      <div className="flex gap-3">
        {isActive && (
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {downloading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Downloading...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download PDF
              </>
            )}
          </button>
        )}
        {ticket.event?.slug && (
          <Link href={`/events/${ticket.event.slug}`}
            className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-lg border border-[var(--color-border)] bg-surface px-5 text-sm font-medium text-text-secondary hover:text-white hover:bg-surface-hover transition-colors"
          >
            Event Details
          </Link>
        )}
      </div>
    </div>
  );
}
