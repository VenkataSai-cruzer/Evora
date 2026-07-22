'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api-client';

const ACTION_COLORS: Record<string, string> = {
  PAYMENT_APPROVED: 'text-success',
  PAYMENT_REJECTED: 'text-error',
  TICKET_GENERATED: 'text-blue-400',
  COMPLIMENTARY_TICKET_CREATED: 'text-purple-400',
  CHECK_IN_SUCCESS: 'text-success',
  CHECK_IN_DUPLICATE: 'text-warning',
  USER_ROLE_CHANGED: 'text-orange-400',
  ORGANIZER_ASSIGNED: 'text-purple-400',
  SCANNER_ASSIGNED: 'text-blue-400',
  EVENT_PUBLISHED: 'text-success',
  EVENT_PAUSED: 'text-warning',
  EVENT_CLOSED: 'text-error',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(p), limit: '50' });
      if (actionFilter) params.set('action', actionFilter);
      if (eventFilter) params.set('eventId', eventFilter);
      const res = await api.get<{ logs: any[]; total: number }>(`/admin/audit-logs?${params}`);
      setLogs(res.logs);
      setTotal(res.total);
      setPage(p);
    } catch {
      setError('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [actionFilter, eventFilter]);

  useEffect(() => { load(1); }, [load]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
        <p className="mt-1 text-sm text-text-secondary">{total} total entries</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          placeholder="Filter by action (e.g. PAYMENT_APPROVED)"
          className="flex-1 min-w-[200px] rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2 text-sm text-white placeholder:text-text-muted focus:border-primary focus:outline-none"
          onKeyDown={(e) => e.key === 'Enter' && load(1)}
        />
        <button onClick={() => load(1)} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors">
          Filter
        </button>
        <button onClick={() => { setActionFilter(''); setEventFilter(''); setTimeout(() => load(1), 0); }} className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-text-secondary hover:text-white transition-colors">
          Clear
        </button>
      </div>

      {error && <div className="rounded-lg bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}

      {loading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-10 animate-pulse rounded-lg bg-surface-elevated" />)}</div>
      ) : (
        <>
          <div className="overflow-auto rounded-xl border border-[var(--color-border)]">
            <table className="min-w-full text-xs">
              <thead className="border-b border-[var(--color-border)] bg-surface-elevated">
                <tr>
                  {['Time', 'Action', 'Actor', 'Entity', 'Details'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] bg-surface">
                {logs.map((log) => {
                  let meta: Record<string, unknown> = {};
                  try { meta = JSON.parse(log.metadata || '{}'); } catch { /* ignore */ }
                  return (
                    <tr key={log.id} className="hover:bg-surface-elevated transition-colors">
                      <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="px-4 py-2.5 font-medium whitespace-nowrap">
                        <span className={ACTION_COLORS[log.action] || 'text-text-secondary'}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-text-muted">
                        {log.actor ? (
                          <span>{log.actor.name}<br /><span className="text-text-muted opacity-60">{log.actorRole}</span></span>
                        ) : <span className="opacity-40">System</span>}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-text-muted">
                        <span className="text-text-secondary">{log.entityType}</span><br />
                        <span className="opacity-60 text-xs">{log.entityId.slice(0, 8)}…</span>
                      </td>
                      <td className="px-4 py-2.5 text-text-muted max-w-xs truncate">
                        {Object.entries(meta).filter(([k]) => !['source'].includes(k)).map(([k, v]) => (
                          <span key={k} className="mr-2">{k}: <span className="text-white">{String(v)}</span></span>
                        ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {logs.length === 0 && <div className="p-8 text-center text-sm text-text-muted">No audit log entries found.</div>}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Showing {logs.length} of {total}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => load(page - 1)} className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 disabled:opacity-40 hover:text-white transition-colors">← Prev</button>
              <button disabled={page * 50 >= total} onClick={() => load(page + 1)} className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 disabled:opacity-40 hover:text-white transition-colors">Next →</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
