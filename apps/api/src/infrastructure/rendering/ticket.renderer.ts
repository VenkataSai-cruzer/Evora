import sharp from 'sharp';
import QRCode from 'qrcode';
import { PDFDocument } from 'pdf-lib';

export interface TicketRenderData {
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  attendeeName: string;
  ticketType: string;
  ticketNumber: string;
  orderNumber: string;
  qrPayload: string;
}

/**
 * Escape a string for safe insertion into SVG/XML.
 */
function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

/**
 * Truncate text to a maximum length, adding ellipsis if truncated.
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}

/**
 * Wrap text into lines for SVG rendering.
 */
function wrapText(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length > maxCharsPerLine && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
    if (lines.length >= maxLines) break;
  }

  if (lines.length < maxLines && currentLine) {
    lines.push(currentLine);
  }

  if (lines.length > 0 && lines[lines.length - 1].length > maxCharsPerLine) {
    lines[lines.length - 1] = truncateText(lines[lines.length - 1], maxCharsPerLine);
  }

  return lines;
}

// ── Shared layout constants ──────────────────────────────
// Single source of truth for ticket layout positioning.
// Both generateTicketSvg() and renderTicketPng() use this!
const LAYOUT = {
  W: 800, H: 1200,
  titleStartY: 190, titleLineH: 46, titleMaxChars: 28, titleMaxLines: 2,
  metaOffsetY: 30, metaLineH: 32,
  venueMaxChars: 55, venueMaxLines: 2, venueLineH: 26,
  dividerOffset: 35,
  attendeeOffset: 35, attendeeNameOffset: 34,
  badgeOffset: 80, badgeHeight: 34,
  divider2Offset: 50,
  infoSectionOffset: 35,
  qrPlaceholderX: 530, qrPlaceholderSize: 170,
  qrCodeSize: 160, qrMargin: 2, qrCornerRadius: 12,
} as const;

/**
 * Compute the Y-position of the QR placeholder based on the dynamic SVG layout.
 * Shared between SVG generation and QR compositing — keeps them in sync.
 */
function computeQrY(data: TicketRenderData): number {
  const titleLines = wrapText(data.eventTitle, LAYOUT.titleMaxChars, LAYOUT.titleMaxLines);
  const metaStartY = LAYOUT.titleStartY + titleLines.length * LAYOUT.titleLineH + LAYOUT.metaOffsetY;
  const venueLines = wrapText(data.venue, LAYOUT.venueMaxChars, LAYOUT.venueMaxLines);
  const venueStartY = metaStartY + LAYOUT.metaLineH;
  const divider1Y = venueStartY + venueLines.length * LAYOUT.venueLineH + LAYOUT.dividerOffset;
  const attendeeSectionY = divider1Y + LAYOUT.attendeeOffset;
  const badgeY = attendeeSectionY + LAYOUT.badgeOffset;
  const divider2Y = badgeY + LAYOUT.divider2Offset;
  const infoSectionY = divider2Y + LAYOUT.infoSectionOffset;
  return infoSectionY - 15;
}

/**
 * Generate a complete ticket SVG — no external PNG template needed.
 *
 * Dimensions: 800 x 1200 px. Dark theme with 7 NOTES purple (#7C3AED) branding.
 * Layout (top → bottom):
 *   Brand bar → Event title → Date/Time/Venue → Divider →
 *   Attendee name → Ticket type badge → Divider →
 *   Ticket/Order info (left) + QR placeholder (right) →
 *   Valid for entry → Footer
 */
function generateTicketSvg(data: TicketRenderData): string {
  const W = LAYOUT.W;
  const H = LAYOUT.H;

  const { titleStartY, titleLineH, metaOffsetY, metaLineH, venueLineH, dividerOffset,
    attendeeOffset, attendeeNameOffset, badgeOffset, badgeHeight, divider2Offset,
    infoSectionOffset, qrPlaceholderX, qrPlaceholderSize, qrCornerRadius } = LAYOUT;

  // Brand colors
  const BG = '#0A0A0A';
  const CARD = '#1A1A1A';
  const BRAND = '#7C3AED';
  const BRAND_LIGHT = '#9D6DF0';
  const TEXT_PRIMARY = '#FFFFFF';
  const TEXT_SECONDARY = '#A1A1AA';
  const TEXT_MUTED = '#52525B';

  // ── Build SVG ────────────────────────────────────────────
  const lines: string[] = [];

  // Root SVG
  lines.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);

  // ── Defs ────────────────────────────────────────────────
  lines.push(`<defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${BG};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#111111;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${BRAND};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${BRAND_LIGHT};stop-opacity:1" />
    </linearGradient>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${CARD};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#222222;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" dx="0" dy="4" stdDeviation="12">
      <feDropShadow dx="0" dy="4" stdDeviation="12" flood-color="#000000" flood-opacity="0.5"/>
    </filter>
    <style>
      .title { font-family: sans-serif; font-size: 38px; font-weight: 800; fill: ${TEXT_PRIMARY}; }
      .subtitle { font-family: sans-serif; font-size: 18px; font-weight: 500; fill: ${TEXT_SECONDARY}; }
      .label { font-family: sans-serif; font-size: 12px; font-weight: 600; fill: ${TEXT_MUTED}; letter-spacing: 2px; text-transform: uppercase; }
      .name { font-family: sans-serif; font-size: 30px; font-weight: 700; fill: ${TEXT_PRIMARY}; }
      .badge { font-family: sans-serif; font-size: 14px; font-weight: 700; fill: ${TEXT_PRIMARY}; letter-spacing: 1px; }
      .info-label { font-family: sans-serif; font-size: 11px; font-weight: 600; fill: ${TEXT_MUTED}; letter-spacing: 1.5px; text-transform: uppercase; }
      .info-value { font-family: monospace; font-size: 15px; font-weight: 600; fill: ${TEXT_PRIMARY}; }
      .footer { font-family: sans-serif; font-size: 13px; font-weight: 500; fill: ${TEXT_MUTED}; letter-spacing: 2px; }
      .valid { font-family: sans-serif; font-size: 14px; font-weight: 700; fill: #22C55E; }
      .brand-text { font-family: sans-serif; font-size: 20px; font-weight: 800; fill: ${TEXT_PRIMARY}; letter-spacing: 4px; }
    </style>
  </defs>`);

  // ── Background ──────────────────────────────────────────
  lines.push(`<rect width="${W}" height="${H}" rx="0" fill="url(#bgGrad)"/>`);

  // Main ticket card
  lines.push(`<rect x="30" y="30" width="740" height="1140" rx="20" fill="url(#cardGrad)" filter="url(#shadow)" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>`);

  // ── Top Brand Bar ──────────────────────────────────────
  lines.push(`<rect x="30" y="30" width="740" height="90" rx="20" fill="url(#brandGrad)"/>`);
  // Mask bottom corners of brand bar to keep only top rounded
  lines.push(`<rect x="30" y="70" width="740" height="50" fill="url(#brandGrad)"/>`);

  // 7 NOTES brand name
  lines.push(`<text x="65" y="82" class="brand-text" text-anchor="start">7 NOTES</text>`);
  // Evora tag
  lines.push(`<text x="735" y="82" font-family="sans-serif" font-size="12px" font-weight="600" fill="rgba(255,255,255,0.7)" text-anchor="end" letter-spacing="2px">EVORA</text>`);

  // Diagonal stripe accent
  lines.push(`<line x1="30" y1="120" x2="770" y2="80" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`);

  // ── Event Title ────────────────────────────────────────
  const titleLines = wrapText(data.eventTitle, LAYOUT.titleMaxChars, LAYOUT.titleMaxLines);
  titleLines.forEach((line, i) => {
    lines.push(`<text x="65" y="${titleStartY + i * titleLineH}" class="title" text-anchor="start" xml:space="preserve">${escapeXml(line)}</text>`);
  });

  // ── Event meta info (date, time, venue) ─────────────────
  const metaStartY = titleStartY + titleLines.length * titleLineH + metaOffsetY;

  // Date & Time
  const dateTimeText = `${data.eventDate}  |  ${data.eventTime}`;
  lines.push(`<text x="65" y="${metaStartY}" class="subtitle" text-anchor="start" xml:space="preserve">${escapeXml(dateTimeText)}</text>`);

  // Venue
  const venueLines = wrapText(data.venue, LAYOUT.venueMaxChars, LAYOUT.venueMaxLines);
  const venueStartY = metaStartY + metaLineH;
  venueLines.forEach((line, i) => {
    lines.push(`<text x="65" y="${venueStartY + i * venueLineH}" class="subtitle" text-anchor="start" xml:space="preserve">${escapeXml(line)}</text>`);
  });

  // ── Dashed Divider 1 ───────────────────────────────────
  const divider1Y = venueStartY + venueLines.length * venueLineH + dividerOffset;
  lines.push(`<line x1="65" y1="${divider1Y}" x2="735" y2="${divider1Y}" stroke="rgba(255,255,255,0.08)" stroke-width="1" stroke-dasharray="6,4"/>`);

  // ── Attendee Section ───────────────────────────────────
  const attendeeSectionY = divider1Y + attendeeOffset;

  lines.push(`<text x="65" y="${attendeeSectionY}" class="label" text-anchor="start">ATTENDEE</text>`);
  lines.push(`<text x="65" y="${attendeeSectionY + attendeeNameOffset}" class="name" text-anchor="start" xml:space="preserve">${escapeXml(truncateText(data.attendeeName, 35))}</text>`);

  // ── Ticket Type Badge ──────────────────────────────────
  const badgeY = attendeeSectionY + badgeOffset;
  // Badge background pill
  const badgeText = data.ticketType;
  const badgeWidth = Math.max(100, badgeText.length * 9 + 40);
  const badgeX = 65;
  lines.push(`<rect x="${badgeX}" y="${badgeY - 24}" width="${badgeWidth}" height="${badgeHeight}" rx="17" fill="rgba(124,58,237,0.2)" stroke="#7C3AED" stroke-width="1.5"/>`);
  lines.push(`<text x="${badgeX + 20}" y="${badgeY - 2}" class="badge" text-anchor="start" xml:space="preserve">${escapeXml(badgeText)}</text>`);

  // ── Dashed Divider 2 ───────────────────────────────────
  const divider2Y = badgeY + divider2Offset;
  lines.push(`<line x1="65" y1="${divider2Y}" x2="735" y2="${divider2Y}" stroke="rgba(255,255,255,0.08)" stroke-width="1" stroke-dasharray="6,4"/>`);

  // ── Ticket / Order Info (Left) + QR Placeholder (Right) ─
  const infoSectionY = divider2Y + infoSectionOffset;

  // Left column — ticket info
  lines.push(`<text x="65" y="${infoSectionY}" class="info-label" text-anchor="start">TICKET NUMBER</text>`);
  lines.push(`<text x="65" y="${infoSectionY + 24}" class="info-value" text-anchor="start" xml:space="preserve">${escapeXml(data.ticketNumber)}</text>`);

  lines.push(`<text x="65" y="${infoSectionY + 60}" class="info-label" text-anchor="start">ORDER NUMBER</text>`);
  lines.push(`<text x="65" y="${infoSectionY + 84}" class="info-value" text-anchor="start" xml:space="preserve">${escapeXml(data.orderNumber || '-')}</text>`);

  // Right column — QR code placeholder
  const qrPlaceholderY = computeQrY(data);

  // QR white background placeholder
  lines.push(`<rect x="${qrPlaceholderX}" y="${qrPlaceholderY}" width="${qrPlaceholderSize}" height="${qrPlaceholderSize}" rx="${qrCornerRadius}" fill="#FFFFFF"/>`);
  // Subtle border
  lines.push(`<rect x="${qrPlaceholderX}" y="${qrPlaceholderY}" width="${qrPlaceholderSize}" height="${qrPlaceholderSize}" rx="${qrCornerRadius}" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="1"/>`);

  // QR corner brackets (decorative)
  const bracketSize = 20;
  const bracketOffset = 8;
  const bX = qrPlaceholderX;
  const bY = qrPlaceholderY;
  const bEnd = qrPlaceholderX + qrPlaceholderSize;
  const bYEnd = qrPlaceholderY + qrPlaceholderSize;

  // Top-left corner bracket
  const cornerAttrs = `stroke="${BRAND}" stroke-width="3" fill="none" stroke-linecap="round"`;
  lines.push(`<path d="M${bX + bracketOffset},${bY + bracketOffset + bracketSize} L${bX + bracketOffset},${bY + bracketOffset} L${bX + bracketOffset + bracketSize},${bY + bracketOffset}" ${cornerAttrs}/>`);
  // Top-right
  lines.push(`<path d="M${bEnd - bracketOffset - bracketSize},${bY + bracketOffset} L${bEnd - bracketOffset},${bY + bracketOffset} L${bEnd - bracketOffset},${bY + bracketOffset + bracketSize}" ${cornerAttrs}/>`);
  // Bottom-left
  lines.push(`<path d="M${bX + bracketOffset},${bYEnd - bracketOffset - bracketSize} L${bX + bracketOffset},${bYEnd - bracketOffset} L${bX + bracketOffset + bracketSize},${bYEnd - bracketOffset}" ${cornerAttrs}/>`);
  // Bottom-right
  lines.push(`<path d="M${bEnd - bracketOffset - bracketSize},${bYEnd - bracketOffset} L${bEnd - bracketOffset},${bYEnd - bracketOffset} L${bEnd - bracketOffset},${bYEnd - bracketOffset - bracketSize}" ${cornerAttrs}/>`);

  // "SCAN FOR ENTRY" label below QR
  lines.push(`<text x="${qrPlaceholderX + qrPlaceholderSize / 2}" y="${qrPlaceholderY + qrPlaceholderSize + 25}" font-family="sans-serif" font-size="10px" font-weight="600" fill="${TEXT_MUTED}" text-anchor="middle" letter-spacing="1.5px">SCAN FOR ENTRY</text>`);

  // ── Valid for Entry ────────────────────────────────────
  const validY = Math.max(qrPlaceholderY + qrPlaceholderSize + 55, infoSectionY + 130);
  lines.push(`<text x="65" y="${validY}" class="valid" text-anchor="start">✓ VALID FOR ENTRY</text>`);

  // ── Footer ─────────────────────────────────────────────
  const footerY = 1130;
  lines.push(`<line x1="65" y1="${footerY - 20}" x2="735" y2="${footerY - 20}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>`);
  lines.push(`<text x="400" y="${footerY + 10}" class="footer" text-anchor="middle">7 NOTES  ·  EVORA</text>`);

  lines.push('</svg>');
  return lines.join('\n');
}

/**
 * Render a ticket as a PNG buffer using a self-contained SVG template.
 *
 * 1. Generates a full ticket SVG with 7 NOTES branding
 * 2. Generates QR code from the opaque token
 * 3. Composites QR onto the SVG PNG at the QR placeholder position
 * 4. Returns final PNG buffer
 */
export async function renderTicketPng(data: TicketRenderData): Promise<Buffer> {
  // ── Generate QR Code ────────────────────────────────────
  const qrSize = 160;
  const qrMargin = 2;

  const qrBuffer = await QRCode.toBuffer(data.qrPayload, {
    type: 'png',
    width: qrSize,
    margin: qrMargin,
    errorCorrectionLevel: 'H',
  });

  // ── Generate Full Ticket SVG ────────────────────────────
  const svgString = generateTicketSvg(data);

  // ── Render SVG to PNG ──────────────────────────────────
  const svgPngBuffer = await sharp(Buffer.from(svgString))
    .png()
    .toBuffer();

  // ── Composite QR onto the SVG ticket ───────────────────
  // Use shared computeQrY() so QR position stays in sync with SVG layout.
  const qrPlaceholderY = computeQrY(data);

  // Center QR (160px) in its 170x170 placeholder
  const qrOffset = Math.round((LAYOUT.qrPlaceholderSize - LAYOUT.qrCodeSize) / 2);
  const qrX = LAYOUT.qrPlaceholderX + qrOffset;
  const qrY = qrPlaceholderY + qrOffset;

  // Composite QR onto the rendered ticket
  return sharp(svgPngBuffer)
    .composite([
      {
        input: qrBuffer,
        left: qrX,
        top: qrY,
      },
    ])
    .png()
    .toBuffer();
}

/**
 * Render a ticket as a PDF buffer.
 * Embeds the rendered PNG onto a PDF page at full size.
 */
export async function renderTicketPdf(data: TicketRenderData): Promise<Buffer> {
  const pngBuffer = await renderTicketPng(data);

  const pdfDoc = await PDFDocument.create();
  const pngImage = await pdfDoc.embedPng(pngBuffer);

  const page = pdfDoc.addPage([pngImage.width, pngImage.height]);
  page.drawImage(pngImage, {
    x: 0,
    y: 0,
    width: pngImage.width,
    height: pngImage.height,
  });

  return Buffer.from(await pdfDoc.save());
}
