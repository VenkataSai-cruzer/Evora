'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getAdminTicket, api } from '@/lib/api-client';
import type { AdminTicketDetailResponse } from '@/lib/api-client';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/dates';

export default function AdminTicketDetailPage() {
  const params = useParams();
  const ticketNumber = params.ticketNumber as string;
  const [ticket, setTicket] = useState<AdminTicketDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewError, setPreviewError] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [qrObjectUrl, setQrObjectUrl] = useState<string | null>(null);
  const qrUrlRef = useRef<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getAdminTicket(ticketNumber);
        setTicket(data);

        // Fetch QR via API client (includes auth cookies)
        try {
          const { blob } = await api.fetchBinary(`/tickets/${ticketNumber}/qr`);
          const url = URL.createObjectURL(blob);
          qrUrlRef.current = url;
          setQrObjectUrl(url);
        } catch {
          setPreviewError(true);
        }
      } catch {
        setPreviewError(true);
      }
      finally { setLoading(false); }
    }
    load();

    // Cleanup: revoke previous object URL when ticketNumber changes or on unmount
    return () => {
      if (qrUrlRef.current) {
        URL.revokeObjectURL(qrUrlRef.current);
        qrUrlRef.current = null;
      }
    };
  }, [ticketNumber]);

  if (loading) {
    return <div className="h-64 animate-pulse rounded-xl bg-surface-elevated" />;
  }

  if (!ticket) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-surface p-8 text-center">
        <p className="text-text-muted">Ticket not found</p>
        <Link href="/admin/tickets" className="mt-2 inline-block text-sm text-primary hover:underline">
          ← Back to tickets
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/tickets" className="text-sm text-primary hover:underline">
            ← Tickets
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-white">{ticket.ticketNumber}</h1>
        </div>
        <Badge variant={ticket.status === 'CONFIRMED' ? 'success' : ticket.status === 'CHECKED_IN' ? 'primary' : 'error'}>
          {ticket.status === 'CHECKED_IN' ? 'Checked In' : ticket.status}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event Info */}
          <section className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
            <h2 className="mb-3 text-sm font-semibold text-white uppercase tracking-wider">Event</h2>
            <div className="space-y-2">
              <Link href={`/admin/events/${ticket.event.id}`} className="text-primary hover:underline font-medium">
                {ticket.event.title}
              </Link>
              <p className="text-sm text-text-muted">
                {formatDate(ticket.event.startAt)}{ticket.event.endAt ? ` - ${formatDate(ticket.event.endAt)}` : ''}
              </p>
              <p className="text-sm text-text-muted">{ticket.event.venueName}{ticket.event.venueAddress ? `, ${ticket.event.venueAddress}` : ''}</p>
            </div>
          </section>

          {/* Attendee Info */}
          <section className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
            <h2 className="mb-3 text-sm font-semibold text-white uppercase tracking-wider">Attendee</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-text-muted">Name</p>
                <p className="text-white">{ticket.attendeeName || ticket.user?.name || '-'}</p>
              </div>
              <div>
                <p className="text-text-muted">Email</p>
                <p className="text-white">{ticket.attendeeEmail || ticket.user?.email || '-'}</p>
              </div>
              <div>
                <p className="text-text-muted">Phone</p>
                <p className="text-white">{ticket.attendeePhone || '-'}</p>
              </div>
              <div>
                <p className="text-text-muted">Account</p>
                <p className="text-white">{ticket.user?.name || 'No account'}</p>
              </div>
            </div>
          </section>

          {/* Ticket Details */}
          <section className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
            <h2 className="mb-3 text-sm font-semibold text-white uppercase tracking-wider">Ticket Details</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-text-muted">Ticket Number</p>
                <p className="font-mono text-white">{ticket.ticketNumber}</p>
              </div>
              <div>
                <p className="text-text-muted">Type</p>
                <p className="text-white">{ticket.ticketType?.name || '-'}</p>
              </div>
              <div>
                <p className="text-text-muted">Category</p>
                <p className="text-white">{ticket.ticketCategory}</p>
              </div>
              <div>
                <p className="text-text-muted">Source</p>
                <p className="text-white">{ticket.source}</p>
              </div>
              <div>
                <p className="text-text-muted">Price Paid</p>
                <p className="text-white">₹{(ticket.pricePaid / 100).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-text-muted">Visibility</p>
                <p className="text-white">{ticket.visibility}</p>
              </div>
              <div>
                <p className="text-text-muted">Issued By</p>
                <p className="text-white">{ticket.issuedBy?.name || '-'}</p>
              </div>
              <div>
                <p className="text-text-muted">Issued At</p>
                <p className="text-white">{formatDate(ticket.issuedAt)}</p>
              </div>
            </div>
          </section>

          {/* Order Info */}
          {ticket.order && (
            <section className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
              <h2 className="mb-3 text-sm font-semibold text-white uppercase tracking-wider">Order</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-text-muted">Order Number</p>
                  <Link href={`/admin/orders/${ticket.order.id}`} className="font-mono text-primary hover:underline">
                    {ticket.order.orderNumber}
                  </Link>
                </div>
                <div>
                  <p className="text-text-muted">Order Status</p>
                  <p className="text-white">{ticket.order.status}</p>
                </div>
                <div>
                  <p className="text-text-muted">Total</p>
                  <p className="text-white">₹{(ticket.order.total / 100).toFixed(2)}</p>
                </div>
              </div>
            </section>
          )}

          {/* Check-in Info */}
          {ticket.checkIn && (
            <section className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
              <h2 className="mb-3 text-sm font-semibold text-white uppercase tracking-wider">Check-in</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-text-muted">Status</p>
                  <Badge variant="primary">Checked In</Badge>
                </div>
                <div>
                  <p className="text-text-muted">Time</p>
                  <p className="text-white">{formatDate(ticket.checkIn.checkedInAt)}</p>
                </div>
                <div>
                  <p className="text-text-muted">Gate</p>
                  <p className="text-white">{ticket.checkIn.gateName || '-'}</p>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Sidebar — QR + Actions */}
        <div className="space-y-4">
          {/* QR Code Preview */}
          <section className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
            <h2 className="mb-3 text-sm font-semibold text-white uppercase tracking-wider">Ticket QR</h2>
            {previewError ? (
              <div className="flex h-48 items-center justify-center rounded-lg bg-surface-hover">
                <p className="text-xs text-text-muted">QR preview unavailable</p>
              </div>
            ) : qrObjectUrl ? (
              <img
                src={qrObjectUrl}
                alt="Ticket QR Code"
                className="mx-auto h-48 w-48 rounded-lg"
              />
            ) : (
              <div className="flex h-48 items-center justify-center rounded-lg bg-surface-hover">
                <p className="text-xs text-text-muted">Loading QR...</p>
              </div>
            )}
          </section>

          {/* Actions */}
          <section className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
            <h2 className="mb-3 text-sm font-semibold text-white uppercase tracking-wider">Actions</h2>
            <div className="space-y-2">
              <Link
                href={`/tickets/${ticket.ticketNumber}`}
                target="_blank"
                className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
              >
                View Ticket
              </Link>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/tickets/${ticket.ticketNumber}`;
                  navigator.clipboard.writeText(url);
                }}
                className="flex w-full items-center justify-center rounded-lg border border-[var(--color-border)] bg-surface px-4 py-2 text-sm text-text-muted hover:text-white transition-colors"
              >
                Copy Ticket Link
              </button>
              <button
                onClick={async () => {
                  setDownloadingPdf(true);
                  try {
                    const { blob } = await api.fetchBinary(`/tickets/${ticket.ticketNumber}/download`);
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${ticket.ticketNumber}.pdf`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch {
                    alert('Download failed — ticket may need QR migration first.');
                  } finally {
                    setDownloadingPdf(false);
                  }
                }}
                disabled={downloadingPdf}
                className="flex w-full items-center justify-center rounded-lg border border-[var(--color-border)] bg-surface px-4 py-2 text-sm text-text-muted hover:text-white disabled:opacity-50 transition-colors"
              >
                {downloadingPdf ? 'Downloading...' : 'Download PDF'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
