import { generateQrCodeDataUrl } from './qr.service.js';
import { prisma } from '../database/prisma.js';

interface TicketRenderParams {
  ticketNumber: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  venueName: string;
  venueAddress: string;
  ticketType: string;
  ticketCategory: string;
  orderNumber?: string;
  qrToken: string;
  terms?: string;
}

/**
 * Render a ticket as an HTML string.
 * Used as the basis for PDF generation.
 *
 * NOTE: This is a functional placeholder template.
 * The final branded template will replace this in the next phase.
 */
export async function renderTicketHtml(params: TicketRenderParams): Promise<string> {
  const qrDataUrl = await generateQrCodeDataUrl(params.qrToken);
  const categoryColor: Record<string, string> = {
    PAID: '#1a1a2e',
    COMPLIMENTARY: '#2d5a27',
    VIP: '#7b2d8b',
    MEDIA: '#1a3a5c',
    ARTIST: '#5c1a1a',
    SPONSOR: '#5c4a1a',
    STAFF: '#1a4a5c',
    VOLUNTEER: '#2d5a4a',
  };
  const bgColor = categoryColor[params.ticketCategory] || '#1a1a2e';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>7 NOTES Ticket – ${params.ticketNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f0f0f0; display: flex; justify-content: center; padding: 20px; }
    .ticket { width: 800px; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
    .ticket-header { background: ${bgColor}; color: white; padding: 32px 40px; display: flex; justify-content: space-between; align-items: center; }
    .ticket-brand { font-size: 28px; font-weight: 800; letter-spacing: 4px; }
    .ticket-category { background: rgba(255,255,255,0.2); padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; }
    .ticket-body { display: flex; }
    .ticket-main { flex: 1; padding: 36px 40px; }
    .event-title { font-size: 26px; font-weight: 700; color: #1a1a1a; margin-bottom: 6px; }
    .event-meta { margin-top: 24px; }
    .meta-row { display: flex; margin-bottom: 12px; }
    .meta-label { font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: #888; width: 90px; flex-shrink: 0; padding-top: 2px; }
    .meta-value { font-size: 15px; font-weight: 500; color: #1a1a1a; }
    .divider-line { border: none; border-top: 1px dashed #ddd; margin: 28px 0; }
    .ticket-number-row { display: flex; justify-content: space-between; align-items: flex-end; }
    .ticket-number-label { font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: #888; }
    .ticket-number { font-size: 18px; font-weight: 700; font-family: monospace; color: #1a1a1a; }
    .terms { font-size: 10px; color: #aaa; margin-top: 12px; line-height: 1.5; }
    .ticket-qr { width: 200px; background: #fafafa; border-left: 1px dashed #ddd; padding: 36px 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; }
    .qr-img { width: 152px; height: 152px; }
    .qr-label { font-size: 10px; color: #888; margin-top: 10px; text-align: center; letter-spacing: 1px; text-transform: uppercase; }
    .attendee-name { font-size: 17px; font-weight: 600; color: ${bgColor}; margin-bottom: 4px; }
    .attendee-email { font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="ticket-header">
      <div class="ticket-brand">7 NOTES</div>
      <div class="ticket-category">${params.ticketCategory}</div>
    </div>
    <div class="ticket-body">
      <div class="ticket-main">
        <div class="event-title">${params.eventTitle}</div>
        <div class="event-meta">
          <div class="meta-row">
            <span class="meta-label">Date</span>
            <span class="meta-value">${params.eventDate}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Time</span>
            <span class="meta-value">${params.eventTime}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Venue</span>
            <span class="meta-value">${params.venueName}${params.venueAddress ? ', ' + params.venueAddress : ''}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Type</span>
            <span class="meta-value">${params.ticketType}</span>
          </div>
        </div>
        <hr class="divider-line" />
        <div class="attendee-name">${params.attendeeName}</div>
        <div class="attendee-email">${params.attendeeEmail}</div>
        <div class="ticket-number-row" style="margin-top: 20px;">
          <div>
            <div class="ticket-number-label">Ticket Number</div>
            <div class="ticket-number">${params.ticketNumber}</div>
          </div>
          ${params.orderNumber ? `<div><div class="ticket-number-label">Order</div><div class="ticket-number" style="font-size:14px;">${params.orderNumber}</div></div>` : ''}
        </div>
        ${params.terms ? `<div class="terms">${params.terms}</div>` : ''}
      </div>
      <div class="ticket-qr">
        <img class="qr-img" src="${qrDataUrl}" alt="QR Code" />
        <div class="qr-label">Scan at entry</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Mark a ticket as rendered.
 * Called after successful file generation/storage.
 */
export async function markTicketRendered(
  ticketId: string,
  pngObjectKey?: string,
  pdfObjectKey?: string,
): Promise<void> {
  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      renderingStatus: 'COMPLETED',
      pngObjectKey: pngObjectKey ?? null,
      pdfObjectKey: pdfObjectKey ?? null,
      updatedAt: new Date(),
    },
  });
}
