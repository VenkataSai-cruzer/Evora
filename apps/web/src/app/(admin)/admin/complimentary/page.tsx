'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';

interface AdminEvent {
  id: string;
  title: string;
  ticketTypes: { id: string; name: string }[];
}

const TICKET_CATEGORIES = ['COMPLIMENTARY', 'VIP', 'MEDIA', 'ARTIST', 'SPONSOR', 'STAFF', 'VOLUNTEER'];

export default function ComplimentaryTicketsPage() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string; count?: number } | null>(null);

  const [form, setForm] = useState({
    eventId: '',
    attendeeName: '',
    attendeeEmail: '',
    attendeePhone: '',
    quantity: 1,
    ticketCategory: 'COMPLIMENTARY',
    reason: '',
    internalNote: '',
    sendNotification: true,
    ticketTypeId: '',
  });

  useEffect(() => {
    api.get<{ events: AdminEvent[] }>('/admin/events?limit=100')
      .then((res) => { setEvents(res.events); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selectedEvent = events.find((e) => e.id === form.eventId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.eventId || !form.attendeeName || !form.attendeeEmail || !form.reason) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await api.post<any>(`/admin/events/${form.eventId}/complimentary-tickets`, {
        attendeeName: form.attendeeName,
        attendeeEmail: form.attendeeEmail,
        attendeePhone: form.attendeePhone || undefined,
        quantity: form.quantity,
        ticketCategory: form.ticketCategory,
        reason: form.reason,
        internalNote: form.internalNote || undefined,
        sendNotification: form.sendNotification,
        ticketTypeId: form.ticketTypeId || undefined,
      });
      setResult({ success: true, message: `${res.count} ticket(s) issued successfully.`, count: res.count });
      setForm((f) => ({ ...f, attendeeName: '', attendeeEmail: '', attendeePhone: '', reason: '', internalNote: '', quantity: 1 }));
    } catch (err: any) {
      setResult({ success: false, message: err.message || 'Failed to issue tickets' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Complimentary Tickets</h1>
        <p className="mt-1 text-sm text-text-secondary">Issue VIP, media, artist, or other admin-only tickets.</p>
      </div>

      <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 px-4 py-3">
        <p className="text-xs text-yellow-400">
          These tickets are <strong>ADMIN_ONLY</strong> visibility. Organizers cannot see them. They count toward capacity but are not visible in organizer reports.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-[var(--color-border)] bg-surface p-6 space-y-4">
        {/* Event */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">Event <span className="text-error">*</span></label>
          {loading ? <div className="h-10 animate-pulse rounded-lg bg-surface-elevated" /> : (
            <select value={form.eventId} onChange={(e) => setForm((f) => ({ ...f, eventId: e.target.value, ticketTypeId: '' }))}
              className="w-full rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2.5 text-sm text-white focus:border-primary focus:outline-none" required>
              <option value="">Select event...</option>
              {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
            </select>
          )}
        </div>

        {/* Ticket Type */}
        {selectedEvent && selectedEvent.ticketTypes.length > 0 && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Ticket Type (optional — uses first active if blank)</label>
            <select value={form.ticketTypeId} onChange={(e) => setForm((f) => ({ ...f, ticketTypeId: e.target.value }))}
              className="w-full rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2.5 text-sm text-white focus:border-primary focus:outline-none">
              <option value="">Auto-select</option>
              {selectedEvent.ticketTypes.map((tt) => <option key={tt.id} value={tt.id}>{tt.name}</option>)}
            </select>
          </div>
        )}

        {/* Category */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">Ticket Category <span className="text-error">*</span></label>
          <select value={form.ticketCategory} onChange={(e) => setForm((f) => ({ ...f, ticketCategory: e.target.value }))}
            className="w-full rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2.5 text-sm text-white focus:border-primary focus:outline-none" required>
            {TICKET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Quantity */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">Quantity <span className="text-error">*</span></label>
          <input type="number" min={1} max={50} value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
            className="w-full rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2.5 text-sm text-white focus:border-primary focus:outline-none" required />
        </div>

        {/* Attendee */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Attendee Name <span className="text-error">*</span></label>
            <input type="text" value={form.attendeeName} onChange={(e) => setForm((f) => ({ ...f, attendeeName: e.target.value }))}
              placeholder="Full name" className="w-full rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2.5 text-sm text-white placeholder:text-text-muted focus:border-primary focus:outline-none" required />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Phone</label>
            <input type="tel" value={form.attendeePhone} onChange={(e) => setForm((f) => ({ ...f, attendeePhone: e.target.value }))}
              placeholder="+91 9876543210" className="w-full rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2.5 text-sm text-white placeholder:text-text-muted focus:border-primary focus:outline-none" />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">Attendee Email <span className="text-error">*</span></label>
          <input type="email" value={form.attendeeEmail} onChange={(e) => setForm((f) => ({ ...f, attendeeEmail: e.target.value }))}
            placeholder="attendee@example.com" className="w-full rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2.5 text-sm text-white placeholder:text-text-muted focus:border-primary focus:outline-none" required />
        </div>

        {/* Reason */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">Reason (required) <span className="text-error">*</span></label>
          <input type="text" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            placeholder="e.g. Press pass, Artist guest, Sponsor allocation" className="w-full rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2.5 text-sm text-white placeholder:text-text-muted focus:border-primary focus:outline-none" required />
        </div>

        {/* Internal note */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">Internal Note (optional)</label>
          <input type="text" value={form.internalNote} onChange={(e) => setForm((f) => ({ ...f, internalNote: e.target.value }))}
            placeholder="Internal note — not sent to attendee" className="w-full rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2.5 text-sm text-white placeholder:text-text-muted focus:border-primary focus:outline-none" />
        </div>

        {/* Notification toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={form.sendNotification} onChange={(e) => setForm((f) => ({ ...f, sendNotification: e.target.checked }))} className="h-4 w-4 rounded border-[var(--color-border)]" />
          <span className="text-sm text-text-secondary">Send email notification to attendee</span>
        </label>

        {result && (
          <div className={`rounded-lg px-4 py-3 text-sm ${result.success ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
            {result.message}
          </div>
        )}

        <button type="submit" disabled={submitting || !form.eventId || !form.attendeeName || !form.attendeeEmail || !form.reason}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
          {submitting ? 'Issuing...' : `Issue ${form.quantity} ${form.ticketCategory} Ticket${form.quantity > 1 ? 's' : ''}`}
        </button>
      </form>
    </div>
  );
}
