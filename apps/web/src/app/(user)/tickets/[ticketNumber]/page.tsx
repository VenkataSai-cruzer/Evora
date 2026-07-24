'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getTicket } from '@/lib/api-client';
import { formatDate, formatTime } from '@/lib/dates';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:10000/api/v1';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  CONFIRMED: { label: 'Valid for entry', color: 'text-success' },
  CHECKED_IN: { label: 'Checked in', color: 'text-primary' },
  REVOKED: { label: 'Revoked', color: 'text-error' },
  CANCELLED: { label: 'Cancelled', color: 'text-text-muted' },
  EXPIRED: { label: 'Expired', color: 'text-text-muted' },
};

export default function TicketDetailPage() {
  const { ticketNumber } = useParams<{ ticketNumber: string }>();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [renderUrl, setRenderUrl] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
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
          // Show meaningful error from backend
          try {
            const errData = await res.json();
            setRenderError(errData.error || 'Render failed');
          } catch {
            setRenderError(`Render failed (${res.status})`);
          }
        }
      } catch (fetchErr: any) {
        setRenderError(fetchErr.message || 'Network error');
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

  // ── Loading state ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="mx-auto max-w-lg animate-pulse space-y-4 py-8">
        <div className="h-4 w-24 rounded bg-surface-elevated" />
        <div className="h-[500px] rounded-xl bg-surface-elevated" />
        <div className="h-11 w-full rounded-lg bg-surface-elevated" />
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────
  if (error || !ticket) {
    return (
      <div className="mx-auto max-w-lg space-y-6 py-8">
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
  const isActive = ticket.status === 'CONFIRMED';
  const isCheckedIn = ticket.status === 'CHECKED_IN' || !!ticket.checkIn;

  return (
    <div className="mx-auto max-w-lg space-y-4 py-8">
      {/* ── Back link ─────────────────────────────────────── */}
      <Link href="/tickets" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-white transition-colors">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        My Tickets
      </Link>

      {/* ── Status badge ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
          isActive ? 'bg-success/10 text-success' :
          isCheckedIn ? 'bg-primary/10 text-primary' :
          'bg-surface-elevated text-text-muted'
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-success' : isCheckedIn ? 'bg-primary' : 'bg-text-muted'}`} />
          {statusInfo.label}
        </span>
        {isCheckedIn && ticket.checkIn?.checkedInAt && (
          <span className="text-xs text-text-muted">
            {formatDate(ticket.checkIn.checkedInAt)} {formatTime(ticket.checkIn.checkedInAt)}
          </span>
        )}
      </div>

      {/* ── THE TICKET — rendered Ticket.png ──────────────── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-surface overflow-hidden shadow-lg">
        {renderUrl ? (
          <div className="flex justify-center bg-black/5">
            <img
              src={renderUrl}
              alt={`Ticket ${ticketNumber}`}
              className="max-w-full h-auto"
              style={{ width: '100%', maxWidth: '500px' }}
            />
          </div>
        ) : renderError ? (
          // Fallback: show a minimal error with retry option
          <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
            <span className="text-4xl mb-3">🎫</span>
            <p className="text-sm font-medium text-white">Ticket unavailable</p>
            <p className="mt-1 text-xs text-text-muted max-w-xs">{renderError}</p>
            <button
              onClick={() => { setRenderError(null); setRenderUrl(null); loadTicket(); }}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white hover:bg-primary-hover transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center p-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>

      {/* ── Download button (only for active tickets) ────── */}
      <button
        onClick={handleDownload}
        disabled={!isActive || downloading}
        className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover transition-colors disabled:opacity-50 shadow-lg shadow-primary/20"
      >
        {downloading ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Downloading...
          </>
        ) : (
          <>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download PDF
          </>
        )}
      </button>

      {/* ── Ticket number (minimal) ──────────────────────── */}
      <p className="text-center text-xs text-text-muted font-mono">
        {ticket.ticketNumber}
        {ticket.order && <> · {ticket.order.orderNumber}</>}
      </p>
    </div>
  );
}
