'use client';

import { useEffect, useState } from 'react';

interface TicketPassClientProps {
  ticketNumber: string;
  attendeeName: string;
  eventTitle: string;
  eventDate: string;
  venueName: string;
  ticketTypeName: string;
}

export function TicketPassClient({
  ticketNumber,
  attendeeName,
  eventTitle,
  eventDate,
  venueName,
  ticketTypeName,
}: TicketPassClientProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isGeneratingQR, setIsGeneratingQR] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function generateQR() {
      try {
        const QRCode = (await import('qrcode')).default;

        // Generate verification URL from ticket number
        const origin = window.location.origin;
        const payload = JSON.stringify({ tn: ticketNumber, ts: Date.now() });
        const encoded = btoa(unescape(encodeURIComponent(payload)));
        const verifyUrl = `${origin}/tickets/${ticketNumber}`;

        const url = await QRCode.toDataURL(verifyUrl, {
          width: 400,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
          errorCorrectionLevel: 'M',
        });

        if (!cancelled) {
          setQrDataUrl(url);
          setIsGeneratingQR(false);
        }
      } catch (err) {
        console.error('Failed to generate QR code:', err);
        if (!cancelled) {
          setIsGeneratingQR(false);
        }
      }
    }

    generateQR();

    return () => {
      cancelled = true;
    };
  }, [ticketNumber]);

  if (isGeneratingQR) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-surface p-6 text-center">
        <div className="mx-auto h-48 w-48 animate-pulse rounded-xl bg-surface-elevated" />
        <p className="mt-3 text-xs text-text-muted">Generating QR code...</p>
      </div>
    );
  }

  if (qrDataUrl) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 text-center">
        <div className="mb-3">
          <p className="text-lg font-bold text-gray-900">{eventTitle}</p>
          <p className="text-sm text-gray-600">{attendeeName}</p>
        </div>
        <img
          src={qrDataUrl}
          alt="Event QR Code"
          className="mx-auto h-48 w-48"
          style={{ imageRendering: 'pixelated' }}
        />
        <div className="mt-3 space-y-1">
          <p className="text-xs text-gray-500">{eventDate}</p>
          <p className="text-xs text-gray-500">{venueName}</p>
          <p className="mt-2 text-xs font-mono tracking-wider text-gray-700">{ticketNumber}</p>
          <p className="mt-1 text-xs text-gray-500">
            {ticketTypeName}
          </p>
        </div>
      </div>
    );
  }

  return null;
}
