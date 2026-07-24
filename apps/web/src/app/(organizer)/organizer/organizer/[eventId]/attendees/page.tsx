'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function OrganizerAttendeesPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [tickets, setTickets] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  async function load(q?: string) {
    setLoading(true);
    try {
      const qs = q ? `?search=${encodeURIComponent(q)}` : '';
      const res = await api.get<{ tickets: any[]; total: number }>(`/organizer/events/${eventId}/attendees${qs}`);
      setTickets(res.tickets);
      setTotal(res.total);
    } catch {
      setError('Failed to load attendees');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [eventId]);

  async function handleExport() {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:10000/api/v1';
    const a = document.createElement('a');
    a.href = `${apiBase}/organizer/events/${eventId}/attendees/export`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white">Attendees</h1>
          <p className="text-xs text-text-muted">{total} visible tickets</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/organizer/${eventId}/analytics`} className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-text-secondary hover:text-white transition-colors">Analytics</Link>
          <button onClick={handleExport} className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-text-secondary hover:text-white transition-colors">Export CSV</button>
        </div>
      </div>

      <div className="flex gap-2">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or ticket number..."
          className="flex-1 rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2 text-sm text-white placeholder:text-text-muted focus:border-primary focus:outline-none" />
        <button onClick={() => load(search)} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors">Search</button>
      </div>

      {error && <div className="rounded-lg bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}

      <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-2">
        <p className="text-xs text-yellow-400">Complimentary, VIP, and other admin-only tickets are not visible here.</p>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-elevated" />)}</div>
      ) : (
        <div className="overflow-auto rounded-xl border border-[var(--color-border)]">
          <table className="min-w-full text-xs">
            <thead className="border-b border-[var(--color-border)] bg-surface-elevated">
              <tr>{['Ticket #', 'Name', 'Email', 'Type', 'Status', 'Checked In'].map(h => <th key={h} className="px-4 py-2.5 text-left font-medium text-text-muted">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)] bg-surface">
              {tickets.map((t) => (
                <tr key={t.id} className="hover:bg-surface-elevated transition-colors">
                  <td className="px-4 py-2.5 font-mono text-white">{t.ticketNumber}</td>
                  <td className="px-4 py-2.5 text-white">{t.attendeeName}</td>
                  <td className="px-4 py-2.5 text-text-muted">{t.attendeeEmail}</td>
                  <td className="px-4 py-2.5 text-text-muted">{t.ticketType?.name}</td>
                  <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${t.status === 'CHECKED_IN' ? 'bg-success/10 text-success' : 'bg-blue-500/10 text-blue-400'}`}>{t.status}</span></td>
                  <td className="px-4 py-2.5 text-text-muted">{t.checkIn?.checkedInAt ? new Date(t.checkIn.checkedInAt).toLocaleTimeString('en-IN') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {tickets.length === 0 && <div className="p-8 text-center text-sm text-text-muted">No attendees found.</div>}
        </div>
      )}
    </div>
  );
}
