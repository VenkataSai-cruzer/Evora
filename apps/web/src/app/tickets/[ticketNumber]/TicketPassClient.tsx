'use client';

import { useEffect, useState } from 'react';

interface TicketPassClientProps {
  ticketNumber: string;
  qrSecret: string;
  status: string;
}

export function TicketPassClient({ ticketNumber, qrSecret, status: _status }: TicketPassClientProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isGeneratingQR, setIsGeneratingQR] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function generateQR() {
      try {
        const QRCode = (await import('qrcode')).default;

        // Generate verification URL - secure opaque value only
        const origin = window.location.origin;
        const payload = JSON.stringify({ tn: ticketNumber, ts: Date.now() });
        // Use btoa for browser-safe base64 encoding
        const encoded = btoa(unescape(encodeURIComponent(payload)));
        const verifyUrl = `${origin}/verify/${encoded}.${qrSecret.slice(0, 8)}`;

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
  }, [ticketNumber, qrSecret]);

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
        <img
          src={qrDataUrl}
          alt="Event QR Code"
          className="mx-auto h-48 w-48"
          style={{ imageRendering: 'pixelated' }}
        />
        <p className="mt-3 text-xs text-text-muted font-mono tracking-wider">{ticketNumber}</p>
        <p className="mt-1 text-xs text-text-muted">
          Scan this QR at the venue for entry
        </p>
      </div>
    );
  }

  return null;
}
