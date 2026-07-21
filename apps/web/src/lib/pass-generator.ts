/**
 * Event pass rendering helpers.
 */

import { formatDisplayPrice } from './qr';

export interface PassData {
  eventTitle: string;
  eventSlug: string;
  startDate: string;
  venueName: string;
  venueAddress: string;
  attendeeName: string;
  ticketCategory: string | null;
  orderNumber: string | null;
  ticketNumber: string;
  organizerName: string;
  status: string;
  ticketType: string;
  priceAmount: number | null;
}

/**
 * Generate the filename for a pass download.
 */
export function generatePassFilename(
  eventTitle: string,
  ticketNumber: string,
  format: 'pdf' | 'png',
): string {
  const slug = eventTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `${slug}-${ticketNumber}.${format}`;
}

/**
 * Generate the HTML content for an event pass.
 */
export function generatePassHtml(data: PassData): string {
  const eventDate = data.startDate;
  const priceDisplay = data.ticketType === 'FREE'
    ? 'FREE ENTRY'
    : formatDisplayPrice(data.priceAmount);
  const showQr = data.status === 'CONFIRMED' || data.status === 'CHECKED_IN';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Event Pass - ${escapeHtml(data.eventTitle)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: 400px 700px; margin: 0; }
  body {
    font-family: 'Inter', -apple-system, sans-serif;
    background: #0a0a0a;
    color: #fff;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 12px;
  }
  .pass {
    max-width: 380px;
    width: 100%;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    border-radius: 20px;
    overflow: hidden;
    border: 1px solid rgba(124, 58, 237, 0.3);
    box-shadow: 0 0 40px rgba(124, 58, 237, 0.12);
  }
  .header {
    text-align: center;
    padding: 20px 16px 14px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .header .event-name {
    font-size: 20px;
    font-weight: 800;
    color: #fff;
    letter-spacing: -0.3px;
  }
  .header .price {
    font-size: 13px;
    font-weight: 700;
    color: #22C55E;
    margin-top: 6px;
  }
  .body { padding: 16px; }
  .attendee-box {
    background: rgba(255,255,255,0.04);
    border-radius: 10px;
    padding: 14px;
    margin-bottom: 14px;
  }
  .attendee-name {
    font-size: 18px;
    font-weight: 700;
    color: #fff;
  }
  .ticket-category {
    font-size: 12px;
    color: #7C3AED;
    font-weight: 600;
    margin-top: 3px;
  }
  .detail-row {
    display: flex;
    justify-content: space-between;
    padding: 7px 0;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .detail-row:last-child { border-bottom: none; }
  .detail-label {
    font-size: 11px;
    color: #9CA3AF;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .detail-value {
    font-size: 12px;
    color: #fff;
    font-weight: 600;
    text-align: right;
  }
  .qr-area {
    text-align: center;
    padding: 16px;
    background: rgba(255,255,255,0.02);
    border-top: 1px solid rgba(255,255,255,0.08);
  }
  .qr-placeholder {
    width: 160px; height: 160px;
    margin: 0 auto;
    background: #fff;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 60px;
    color: #000;
  }
  .ticket-number {
    font-size: 10px;
    color: #6B7280;
    font-family: monospace;
    margin-top: 6px;
    letter-spacing: 1px;
  }
  .status-note {
    font-size: 10px;
    color: #9CA3AF;
    margin-top: 10px;
    font-style: italic;
  }
  .pending-warning {
    background: rgba(245, 158, 11, 0.15);
    color: #F59E0B;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 11px;
    font-weight: 600;
    text-align: center;
    margin-bottom: 10px;
  }
  .footer {
    text-align: center;
    padding: 10px;
    font-size: 9px;
    color: #6B7280;
    border-top: 1px solid rgba(255,255,255,0.05);
  }
  .no-qr {
    padding: 20px;
    text-align: center;
    color: #6B7280;
    font-size: 12px;
    border-top: 1px solid rgba(255,255,255,0.08);
  }
</style>
</head>
<body>
<div class="pass">
  <div class="header">
    <div class="event-name">${escapeHtml(data.eventTitle)}</div>
    <div class="price">${priceDisplay}</div>
  </div>
  <div class="body">
    <div class="attendee-box">
      <div class="attendee-name">${escapeHtml(data.attendeeName)}</div>
      <div class="ticket-category">${escapeHtml(data.ticketCategory || 'General')}</div>
    </div>

    <div class="detail-row">
      <span class="detail-label">Date</span>
      <span class="detail-value">${eventDate}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Venue</span>
      <span class="detail-value">${escapeHtml(data.venueName)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Address</span>
      <span class="detail-value">${escapeHtml(data.venueAddress)}</span>
    </div>
    ${data.orderNumber ? `<div class="detail-row"><span class="detail-label">Order</span><span class="detail-value" style="font-family:monospace;">${escapeHtml(data.orderNumber)}</span></div>` : ''}
    <div class="detail-row">
      <span class="detail-label">Ticket</span>
      <span class="detail-value" style="font-family:monospace;font-size:11px;">${escapeHtml(data.ticketNumber)}</span>
    </div>
  </div>

  ${showQr ? `
  <div class="qr-area">
    <div class="qr-placeholder">⬛</div>
    <div class="ticket-number">${escapeHtml(data.ticketNumber)}</div>
    <p class="status-note">QR verification at venue</p>
  </div>` : `
  <div class="no-qr">
    ${data.status === 'CANCELLED' ? 'Ticket Cancelled' : data.status === 'EXPIRED' ? 'Ticket Expired' : 'QR not available'}
  </div>`}

  <div style="padding: 8px 16px; text-align: center; font-size: 10px; color: #F59E0B; border-top: 1px solid rgba(255,255,255,0.05);">
    Tickets are non-refundable and non-transferable once confirmed.
  </div>
  <div class="footer">
    ${escapeHtml(data.organizerName)} · Jamming Events<br/>
    Final status verified at the venue.
  </div>
</div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
