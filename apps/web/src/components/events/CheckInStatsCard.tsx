'use client';

/**
 * CheckInStatsCard — live check-in statistics widget.
 *
 * Auto-polls every 15 seconds and shows:
 *   - Total tickets issued (CONFIRMED + CHECKED_IN)
 *   - Checked in count
 *   - Remaining (total - checked in)
 *   - Capacity usage (sold vs capacity)
 *
 * Handles capacity changes, new check-ins, and ticket cancellations
 * by polling the backend for fresh data.
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '@/lib/api-client';

export interface CheckInStatsData {
  totalTickets: number;
  checkedIn: number;
  remaining: number;
  totalCapacity: number | null;
  totalSold: number;
  hasCapacityTypes: boolean;
}

interface CheckInStatsCardProps {
  /** API path to poll (e.g. /admin/events/abc/checkin-stats) */
  apiPath: string;
  /** Polling interval in ms (default 15000) */
  pollIntervalMs?: number;
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-IN');
}

export function CheckInStatsCard({
  apiPath,
  pollIntervalMs = 15000,
}: CheckInStatsCardProps) {
  const [data, setData] = useState<CheckInStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get<CheckInStatsData>(apiPath);
      if (mountedRef.current) {
        setData(res);
        setError(null);
        setLoading(false);
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setError(err.message || 'Failed to load stats');
        setLoading(false);
      }
    }
  }, [apiPath]);

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    fetchStats();

    // Auto-poll at the given interval
    const interval = setInterval(fetchStats, pollIntervalMs);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchStats, pollIntervalMs]);

  // ── Loading skeleton ──────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-surface overflow-hidden animate-pulse">
        <div className="border-b border-[var(--color-border)] bg-surface-hover/50 px-5 py-3">
          <div className="h-3 w-28 rounded bg-surface-elevated" />
        </div>
        <div className="p-5">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-16 rounded bg-surface-elevated" />
                <div className="h-7 w-12 rounded bg-surface-elevated" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-surface overflow-hidden">
        <div className="border-b border-[var(--color-border)] bg-surface-hover/50 px-5 py-3">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Check-in Stats</h2>
        </div>
        <div className="p-5 text-center">
          <p className="text-xs text-text-muted">{error || 'Stats unavailable'}</p>
          <button
            onClick={() => { setLoading(true); fetchStats(); }}
            className="mt-2 rounded-lg border border-[var(--color-border)] bg-surface-elevated px-3 py-1 text-2xs text-text-secondary hover:text-white transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const pct =
    data.hasCapacityTypes && data.totalCapacity && data.totalCapacity > 0
      ? Math.round((data.totalSold / data.totalCapacity) * 100)
      : null;

  const checkinPct = data.totalTickets > 0
    ? Math.round((data.checkedIn / data.totalTickets) * 100)
    : 0;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-surface overflow-hidden">
      {/* Header with live indicator */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-surface-hover/50 px-5 py-3">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
          </span>
          Check-in Stats
        </h2>
        <span className="text-2xs text-text-muted">Live</span>
      </div>

      <div className="p-5 space-y-4">
        {/* Three stat cards */}
        <div className="grid grid-cols-3 gap-3">
          {/* Total Tickets */}
          <div className="rounded-lg bg-surface-elevated/50 border border-[var(--color-border)] p-3 text-center">
            <p className="text-2xs text-text-muted uppercase tracking-wider mb-1">Total</p>
            <p className="text-2xl font-bold text-white">{formatNumber(data.totalTickets)}</p>
            <p className="text-2xs text-text-muted mt-0.5">tickets</p>
          </div>

          {/* Checked In */}
          <div className="rounded-lg bg-success/5 border border-success/20 p-3 text-center">
            <p className="text-2xs text-text-muted uppercase tracking-wider mb-1">Checked In</p>
            <p className="text-2xl font-bold text-success">{formatNumber(data.checkedIn)}</p>
            <p className="text-2xs text-success/70 mt-0.5">{checkinPct}% of total</p>
          </div>

          {/* Remaining */}
          <div className="rounded-lg bg-surface-elevated/50 border border-[var(--color-border)] p-3 text-center">
            <p className="text-2xs text-text-muted uppercase tracking-wider mb-1">Remaining</p>
            <p className={`text-2xl font-bold ${data.remaining > 0 ? 'text-warning' : 'text-text-muted'}`}>
              {formatNumber(data.remaining)}
            </p>
            <p className="text-2xs text-text-muted mt-0.5">to check in</p>
          </div>
        </div>

        {/* Check-in progress bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-text-muted">Check-in Progress</span>
            <span className="text-white font-medium">{checkinPct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-surface-elevated overflow-hidden">
            <div
              className="h-full rounded-full bg-success transition-all duration-500 ease-out"
              style={{ width: `${Math.min(checkinPct, 100)}%` }}
            />
          </div>
        </div>

        {/* Capacity usage bar */}
        {data.hasCapacityTypes && data.totalCapacity && data.totalCapacity > 0 && (
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-text-muted">Capacity Used</span>
              <span className="text-white font-medium">
                {formatNumber(data.totalSold)} / {formatNumber(data.totalCapacity)}
                {pct !== null && (
                  <span className={`ml-1 font-normal ${pct >= 100 ? 'text-error' : pct >= 80 ? 'text-warning' : 'text-text-muted'}`}>
                    ({pct}%)
                  </span>
                )}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-surface-elevated overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  pct !== null && pct >= 100 ? 'bg-error' : pct !== null && pct >= 80 ? 'bg-warning' : 'bg-primary'
                }`}
                style={{ width: `${Math.min(pct || 0, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer timestamp */}
        <p className="text-2xs text-text-muted text-center">
          Updates every {pollIntervalMs / 1000}s &middot; Auto-refreshing
        </p>
      </div>
    </div>
  );
}
