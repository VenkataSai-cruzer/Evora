'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';

interface Attendee {
  id: string;
  ticketNumber: string;
  status: string;
  category: string | null;
  type: string;
  purchasedAt: string;
  attendee: {
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    ticketCategory: string | null;
    isCheckedIn: boolean;
    checkedInAt: string | null;
  } | null;
  order: {
    id: string;
    orderNumber: string;
    bookingType: string;
    attendeeCount: number;
    status: string;
  } | null;
  user: {
    id: string;
    displayName: string;
    email: string;
  };
}

const STATUS_STYLES: Record<string, 'success' | 'warning' | 'error' | 'default' | 'primary' | 'outline'> = {
  VALID: 'success',
  CONFIRMED: 'success',
  CHECKED_IN: 'primary',
  CANCELLED: 'error',
  EXPIRED: 'default',
};

export default function AttendeesPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ticketTypeFilter, setTicketTypeFilter] = useState('');
  const [bookingModeFilter, setBookingModeFilter] = useState('');
  const [availableTicketTypes, setAvailableTicketTypes] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [eventTitle, setEventTitle] = useState('');

  const BOOKING_MODES = ['', 'SOLO', 'DUO', 'TRIO', 'GROUP'];
  const STATUSES = ['', 'CONFIRMED', 'CHECKED_IN', 'CANCELLED', 'EXPIRED'];

  const fetchAttendees = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.set('search', search);
      if (statusFilter) queryParams.set('status', statusFilter);
      if (ticketTypeFilter) queryParams.set('ticketType', ticketTypeFilter);
      if (bookingModeFilter) queryParams.set('bookingMode', bookingModeFilter);
      queryParams.set('page', page.toString());
      queryParams.set('limit', '50');

      const res = await fetch(`/api/dashboard/events/${eventId}/attendees?${queryParams}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setAttendees(data.tickets);
      setTotal(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
      if (data.filters?.ticketTypes) {
        setAvailableTicketTypes(data.filters.ticketTypes);
      }
    } catch {
      setError('Failed to load attendees');
    } finally {
      setIsLoading(false);
    }
  }, [eventId, search, statusFilter, ticketTypeFilter, bookingModeFilter, page]);

  const fetchEvent = useCallback(async () => {
    try {
      const res = await fetch(`/api/dashboard/events/${eventId}`);
      if (!res.ok) return;
      const data = await res.json();
      setEventTitle(data.event?.title || '');
    } catch { /* ignore */ }
  }, [eventId]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  useEffect(() => {
    fetchAttendees();
  }, [fetchAttendees]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchAttendees();
  }

  function handleExport() {
    window.open(`/api/dashboard/events/${eventId}/attendees/export`, '_blank');
  }

  if (isLoading && attendees.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton variant="text" className="h-8 w-64" />
        <Skeleton variant="card" className="h-20" />
        <Skeleton variant="card" className="h-20" />
        <Skeleton variant="card" className="h-20" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon="⚠️"
        title="Error"
        description={error}
        action={{ label: 'Try Again', onClick: () => fetchAttendees() }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href={`/dashboard/events/${eventId}`}
            className="text-sm text-primary transition-colors hover:text-primary-hover mb-1 inline-block"
          >
            ← Back to Event
          </Link>
          <h1 className="text-2xl font-bold text-white">Attendees</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {eventTitle} &bull; {total} total {total === 1 ? 'attendee' : 'attendees'}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={handleExport}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px] max-w-sm">
          <Input
            placeholder="Search by name, email, ticket or order number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2.5 text-sm text-white"
        >
          <option value="">All Statuses</option>
          {STATUSES.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>

        {availableTicketTypes.length > 0 && (
          <select
            value={ticketTypeFilter}
            onChange={(e) => { setTicketTypeFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2.5 text-sm text-white"
          >
            <option value="">All Ticket Types</option>
            {availableTicketTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}

        <select
          value={bookingModeFilter}
          onChange={(e) => { setBookingModeFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2.5 text-sm text-white"
        >
          <option value="">All Booking Modes</option>
          {BOOKING_MODES.filter(Boolean).map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* Attendee list */}
      {attendees.length === 0 ? (
        <EmptyState
          icon="🎫"
          title="No attendees found"
          description={search || statusFilter || ticketTypeFilter || bookingModeFilter
            ? 'Try adjusting your filters.'
            : 'No one has registered for this event yet.'}
          action={search || statusFilter || ticketTypeFilter || bookingModeFilter
            ? { label: 'Clear Filters', onClick: () => {
                setSearch('');
                setStatusFilter('');
                setTicketTypeFilter('');
                setBookingModeFilter('');
                setPage(1);
              }}
            : undefined}
        />
      ) : (
        <div className="space-y-2">
          {attendees.map((ticket) => (
            <div
              key={ticket.id}
              className="flex items-center gap-4 rounded-lg border border-[var(--color-border)] bg-surface p-4 transition-colors hover:bg-surface-hover"
            >
              {/* Avatar */}
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary shrink-0">
                {(ticket.attendee?.fullName || ticket.user.displayName).charAt(0).toUpperCase()}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-white truncate">
                    {ticket.attendee?.fullName || ticket.user.displayName}
                  </p>
                  <Badge
                    variant={STATUS_STYLES[ticket.status] || 'default'}
                    size="sm"
                  >
                    {ticket.status}
                  </Badge>
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                  <span>{ticket.attendee?.email || ticket.user.email}</span>
                  <span className="font-mono">{ticket.ticketNumber}</span>
                  {ticket.attendee?.ticketCategory && <span>{ticket.attendee.ticketCategory}</span>}
                  {ticket.order?.bookingType && <span>{ticket.order.bookingType}</span>}
                  {ticket.attendee?.isCheckedIn && (
                    <span className="text-primary">✓ Checked in</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/tickets/${ticket.ticketNumber}`}
                  className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-white"
                >
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-hover hover:text-white disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-text-muted">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-hover hover:text-white disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
