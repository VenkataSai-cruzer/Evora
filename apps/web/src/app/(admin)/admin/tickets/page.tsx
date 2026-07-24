'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { listAdminTickets } from '@/lib/api-client';
import type { AdminTicketListItem } from '@/lib/api-client';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/dates';

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: 'success',
  CHECKED_IN: 'info',
  CANCELLED: 'error',
  EXPIRED: 'warning',
  REVOKED: 'error',
};

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<AdminTicketListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const limit = 30;

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAdminTickets({
        page,
        limit,
        search: search || undefined,
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
      });
      setTickets(res.tickets);
      setTotal(res.total);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [page, search, statusFilter, categoryFilter]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Tickets</h1>
        <p className="text-sm text-text-muted">{total} total</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search ticket number, name, email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-xs"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2 text-sm text-white"
        >
          <option value="">All statuses</option>
          <option value="CONFIRMED">Active</option>
          <option value="CHECKED_IN">Checked In</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="EXPIRED">Expired</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2 text-sm text-white"
        >
          <option value="">All categories</option>
          <option value="PAID">Paid</option>
          <option value="COMPLIMENTARY">Complimentary</option>
          <option value="VIP">VIP</option>
          <option value="MEDIA">Media</option>
          <option value="STAFF">Staff</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="h-48 animate-pulse rounded-xl bg-surface-elevated" />
      ) : tickets.length === 0 ? (
        <EmptyState
          title="No tickets found"
          description="No tickets match your current filters."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead className="bg-surface-hover">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-text-muted">Ticket</th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">Attendee</th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">Event</th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">Type</th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">Category</th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">Status</th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">Issued</th>
                <th className="px-4 py-3 text-right font-medium text-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-surface-hover/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-white">
                    {ticket.ticketNumber}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-white">{ticket.attendeeName || '-'}</p>
                    {ticket.attendeeEmail && (
                      <p className="text-xs text-text-muted">{ticket.attendeeEmail}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/events/${ticket.event.id}`} className="text-primary hover:underline">
                      {ticket.event.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {ticket.ticketType?.name || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-text-muted">{ticket.ticketCategory}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={(STATUS_COLORS[ticket.status] || 'default') as any}>
                      {ticket.status === 'CHECKED_IN' ? 'Checked In' : ticket.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {formatDate(ticket.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/tickets/${ticket.ticketNumber}`}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-[var(--color-border)] bg-surface px-3 py-1.5 text-sm text-text-muted disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-text-muted">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-[var(--color-border)] bg-surface px-3 py-1.5 text-sm text-text-muted disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
