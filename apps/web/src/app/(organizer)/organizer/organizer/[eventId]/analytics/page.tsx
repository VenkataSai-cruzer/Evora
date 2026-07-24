'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Analytics {
  eventTitle: string;
  totalCapacity: number;
  totalExpectedAttendance: number;
  totalCheckedIn: number;
  visibleTickets: number;
  pendingOrders: number;
  confirmedOrders: number;
}

export default function OrganizerAnalyticsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Analytics>(`/organizer/events/${eventId}/analytics`)
      .then(setData)
      .catch(() => setError('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-elevated" />)}</div>;

  if (error) return <div className="rounded-lg bg-error/10 px-4 py-3 text-sm text-error">{error}</div>;

  if (!data) return null;

  const checkInPct = data.totalExpectedAttendance > 0
    ? Math.round((data.totalCheckedIn / data.totalExpectedAttendance) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">{data.eventTitle}</h1>
          <p className="text-xs text-text-muted">Analytics</p>
        </div>
        <Link href={`/organizer/${eventId}/attendees`} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover">
          View Attendees
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: 'Total Capacity', value: data.totalCapacity, color: 'text-white' },
          { label: 'Expected Attendance', value: data.totalExpectedAttendance, color: 'text-blue-400', note: 'Confirmed tickets' },
          { label: 'Checked In', value: data.totalCheckedIn, color: 'text-success', note: `${checkInPct}% of expected` },
          { label: 'Visible Tickets', value: data.visibleTickets, color: 'text-white', note: 'Paid tickets only' },
          { label: 'Pending Orders', value: data.pendingOrders, color: 'text-warning' },
          { label: 'Confirmed Orders', value: data.confirmedOrders, color: 'text-success' },
        ].map(({ label, value, color, note }) => (
          <div key={label} className="rounded-xl border border-[var(--color-border)] bg-surface p-4">
            <p className="text-xs text-text-muted uppercase tracking-wider">{label}</p>
            <p className={`mt-1 text-3xl font-bold ${color}`}>{value.toLocaleString()}</p>
            {note && <p className="mt-0.5 text-xs text-text-muted">{note}</p>}
          </div>
        ))}
      </div>

      {/* Check-in progress bar */}
      {data.totalExpectedAttendance > 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-white">Check-in Progress</p>
            <p className="text-sm font-bold text-success">{checkInPct}%</p>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-surface-elevated">
            <div
              className="h-full rounded-full bg-success transition-all duration-500"
              style={{ width: `${Math.min(checkInPct, 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-text-muted">{data.totalCheckedIn} of {data.totalExpectedAttendance} checked in</p>
        </div>
      )}

      <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
        <p className="text-xs text-yellow-400">
          Complimentary, VIP, and admin-only tickets are excluded from visible counts but included in Expected Attendance.
        </p>
      </div>
    </div>
  );
}
