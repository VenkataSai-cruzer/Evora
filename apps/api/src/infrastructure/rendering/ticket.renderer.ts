import sharp from 'sharp';
import QRCode from 'qrcode';
import { PDFDocument } from 'pdf-lib';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Bundled Font ──────────────────────────────────────────
// Inter-Regular.ttf (SIL Open Font License) is bundled in the API build
// at dist/assets/fonts/Inter-Regular.ttf. It is loaded at startup and
// embedded in the SVG via @font-face so no system font dependency exists.

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve the font path relative to this module's location
// Runtime:   apps/api/dist/infrastructure/rendering/ticket.renderer.js
// Font:      apps/api/dist/assets/fonts/Inter-Regular.ttf (copied from apps/api/assets/fonts/)
// We go 3 levels up from dist/infrastructure/rendering/ to reach apps/api/
const API_DIR = resolve(__dirname, '..', '..', '..');

// Production: dist/assets/fonts/Inter-Regular.ttf (next to the built files)
const DIST_FONT = resolve(API_DIR, 'dist', 'assets', 'fonts', 'Inter-Regular.ttf');
// Development: assets/fonts/Inter-Regular.ttf (source, when running via tsx)
const SRC_FONT = resolve(API_DIR, 'assets', 'fonts', 'Inter-Regular.ttf');

const FONT_PATH_CANDIDATES = [DIST_FONT, SRC_FONT];

let FONT_BASE64: string | null = null;

function loadFont(): void {
  for (const fp of FONT_PATH_CANDIDATES) {
    if (existsSync(fp)) {
      const fontBuffer = readFileSync(fp);
      FONT_BASE64 = fontBuffer.toString('base64');
      console.log(`[TicketRenderer] Loaded font: ${fp} (${fontBuffer.length} bytes)`);
      return;
    }
  }
  console.warn('[TicketRenderer] WARNING: Inter-Regular.ttf not found. Text will rely on system fonts which may render as boxes on Railway.');
}

loadFont();

/**
 * Generate an SVG @font-face style block with the bundled Inter font as base64.
 */
function fontFaceStyle(): string {
  if (FONT_BASE64) {
    return `@font-face {
  font-family: 'Inter';
  src: url(data:font/truetype;charset=utf-8;base64,${FONT_BASE64}) format('truetype');
  font-weight: normal;
  font-style: normal;
}
@font-face {
  font-family: 'Inter';
  src: url(data:font/truetype;charset=utf-8;base64,${FONT_BASE64}) format('truetype');
  font-weight: bold;
  font-style: normal;
}`;
  }
  return '';
}

export interface TicketRenderData {
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  attendeeName: string;
  ticketType: string;
  ticketCategory: string;
  pricePaid: number;
  organizerName: string;
  ticketNumber: string;
  orderNumber: string;
  issueDate: string;
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
  badgeOffset: 80, badgeHeight: 34, badgeGap: 12,  // gap between badges
  priceOffsetY: 30,  // extra space for price display below badge
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
  const priceAreaY = badgeY + LAYOUT.priceOffsetY;
  const divider2Y = priceAreaY + LAYOUT.divider2Offset;
  const infoSectionY = divider2Y + LAYOUT.infoSectionOffset;
  return infoSectionY - 15;
}

/**
 * Generate a complete ticket SVG — no external PNG template needed.
 *
 * Uses SVG viewBox to support high-resolution rendering at any scale.
 * The logical coordinate system is always 800x1200 (LAYOUT.W × LAYOUT.H).
 * When scale > 1, the SVG width/height are multiplied so the renderer
 * produces a larger bitmap while all coordinates stay in 800x1200 space.
 *
 * Layout (top → bottom):
 *   Brand bar → Event title → Date/Time/Venue → Divider →
 *   Attendee name → Ticket type badges → Price → Divider →
 *   Ticket/Order/Issue info (left) + QR placeholder (right) →
 *   Valid for entry → Footer
 *
 * @param data - Ticket content data
 * @param scale - Rendering scale factor (1=screen 72dpi, 3≈300dpi print)
 */
function generateTicketSvg(data: TicketRenderData, scale: number = 1): string {
  const W = Math.round(LAYOUT.W * scale);
  const H = Math.round(LAYOUT.H * scale);
  // viewBox stays at the logical 800×1200 coordinate space
  const VB_W = LAYOUT.W;
  const VB_H = LAYOUT.H;

  const { titleStartY, titleLineH, metaOffsetY, metaLineH, venueLineH, dividerOffset,
    attendeeOffset, attendeeNameOffset, badgeOffset, badgeHeight, badgeGap,
    priceOffsetY, divider2Offset,
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

  // Root SVG — use viewBox to scale the logical 800×1200 space to any resolution
  lines.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${VB_W} ${VB_H}">`);

  // ── Defs ────────────────────────────────────────────────
  // The @font-face for Inter Regular is embedded as base64 data URI so
  // no system font dependency exists — text renders correctly on Railway.
  const fontStyle = fontFaceStyle();
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
      ${fontStyle}
      .title { font-family: 'Inter', sans-serif; font-size: 38px; font-weight: 800; fill: ${TEXT_PRIMARY}; }
      .subtitle { font-family: 'Inter', sans-serif; font-size: 18px; font-weight: 500; fill: ${TEXT_SECONDARY}; }
      .label { font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600; fill: ${TEXT_MUTED}; letter-spacing: 2px; text-transform: uppercase; }
      .name { font-family: 'Inter', sans-serif; font-size: 30px; font-weight: 700; fill: ${TEXT_PRIMARY}; }
      .badge { font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 700; fill: ${TEXT_PRIMARY}; letter-spacing: 1px; }
      .info-label { font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 600; fill: ${TEXT_MUTED}; letter-spacing: 1.5px; text-transform: uppercase; }
      .info-value { font-family: 'Inter', monospace; font-size: 15px; font-weight: 600; fill: ${TEXT_PRIMARY}; }
      .footer { font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500; fill: ${TEXT_MUTED}; letter-spacing: 2px; }
      .valid { font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 700; fill: #22C55E; }
      .brand-text { font-family: 'Inter', sans-serif; font-size: 20px; font-weight: 800; fill: ${TEXT_PRIMARY}; letter-spacing: 4px; }
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
  lines.push(`<text x="65" y="76" class="brand-text" text-anchor="start">7 NOTES</text>`);
  // Organizer name — smaller, below the brand
  lines.push(`<text x="65" y="100" font-family="'Inter',sans-serif" font-size="11px" font-weight="500" fill="rgba(255,255,255,0.75)" text-anchor="start" letter-spacing="1px" xml:space="preserve">Presented by ${escapeXml(data.organizerName)}</text>`);
  // Evora tag
  lines.push(`<text x="735" y="76" font-family="sans-serif" font-size="12px" font-weight="600" fill="rgba(255,255,255,0.7)" text-anchor="end" letter-spacing="2px">EVORA</text>`);

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

  // ── Badge Row: Ticket Type + Complimentary + Price ──
  const badgeY = attendeeSectionY + badgeOffset;
  let nextBadgeX = 65;

  // Ticket type badge
  const typeBadgeText = data.ticketType;
  const typeBadgeWidth = Math.max(100, typeBadgeText.length * 9 + 40);
  lines.push(`<rect x="${nextBadgeX}" y="${badgeY - 24}" width="${typeBadgeWidth}" height="${badgeHeight}" rx="17" fill="rgba(124,58,237,0.2)" stroke="#7C3AED" stroke-width="1.5"/>`);
  lines.push(`<text x="${nextBadgeX + 20}" y="${badgeY - 2}" class="badge" text-anchor="start" xml:space="preserve">${escapeXml(typeBadgeText)}</text>`);
  nextBadgeX += typeBadgeWidth + badgeGap;

  // COMPLIMENTARY badge (only for complimentary tickets)
  const isComplimentary = data.ticketCategory === 'COMPLIMENTARY';
  if (isComplimentary) {
    const compBadgeText = 'COMPLIMENTARY';
    const compBadgeWidth = compBadgeText.length * 9 + 44;
    lines.push(`<rect x="${nextBadgeX}" y="${badgeY - 24}" width="${compBadgeWidth}" height="${badgeHeight}" rx="17" fill="rgba(245,158,11,0.15)" stroke="rgba(245,158,11,0.6)" stroke-width="1.5"/>`);
    lines.push(`<text x="${nextBadgeX + 20}" y="${badgeY - 2}" class="badge" text-anchor="start" fill="#F59E0B" xml:space="preserve">${compBadgeText}</text>`);
  }

  // Price display
  const priceAreaY = badgeY + priceOffsetY;
  const priceText = isComplimentary
    ? '₹0 / Complimentary'
    : `₹${(data.pricePaid / 100).toFixed(2)}`;
  lines.push(`<text x="65" y="${priceAreaY}" font-family="'Inter',sans-serif" font-size="16px" font-weight="700" fill="${isComplimentary ? '#F59E0B' : '#A1A1AA'}" text-anchor="start" letter-spacing="1px" xml:space="preserve">${escapeXml(priceText)}</text>`);

  // ── Dashed Divider 2 ───────────────────────────────────
  const divider2Y = priceAreaY + divider2Offset;
  lines.push(`<line x1="65" y1="${divider2Y}" x2="735" y2="${divider2Y}" stroke="rgba(255,255,255,0.08)" stroke-width="1" stroke-dasharray="6,4"/>`);

  // ── Ticket / Order Info (Left) + QR Placeholder (Right) ─
  const infoSectionY = divider2Y + infoSectionOffset;

  // Left column — ticket info
  const infoLineH = 28;
  const infoLabelH = 22;
  let infoY = infoSectionY;

  // Row 1: Ticket Number
  lines.push(`<text x="65" y="${infoY}" class="info-label" text-anchor="start">TICKET NUMBER</text>`);
  lines.push(`<text x="65" y="${infoY + infoLabelH}" class="info-value" text-anchor="start" xml:space="preserve">${escapeXml(data.ticketNumber)}</text>`);
  infoY += infoLineH + infoLabelH;

  // Row 2: Order Number
  lines.push(`<text x="65" y="${infoY}" class="info-label" text-anchor="start">ORDER NUMBER</text>`);
  lines.push(`<text x="65" y="${infoY + infoLabelH}" class="info-value" text-anchor="start" xml:space="preserve">${escapeXml(data.orderNumber || '-')}</text>`);
  infoY += infoLineH + infoLabelH;

  // Row 3: Issue Date
  lines.push(`<text x="65" y="${infoY}" class="info-label" text-anchor="start">ISSUED ON</text>`);
  lines.push(`<text x="65" y="${infoY + infoLabelH}" class="info-value" text-anchor="start" xml:space="preserve">${escapeXml(data.issueDate)}</text>`);

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
 *
 * @param data - Ticket content data
 * @param scale - Rendering scale factor (1=screen 72dpi, 3≈300dpi print).
 *                All coordinates and QR are scaled accordingly.
 */
export async function renderTicketPng(data: TicketRenderData, scale: number = 1): Promise<Buffer> {
  // ── Generate QR Code ────────────────────────────────────
  const qrSize = LAYOUT.qrCodeSize * scale;
  const qrMargin = LAYOUT.qrMargin;

  const qrBuffer = await QRCode.toBuffer(data.qrPayload, {
    type: 'png',
    width: Math.round(qrSize),
    margin: qrMargin,
    errorCorrectionLevel: 'H',
  });

  // ── Generate Full Ticket SVG ────────────────────────────
  const svgString = generateTicketSvg(data, scale);

  // ── Render SVG to PNG ──────────────────────────────────
  const svgPngBuffer = await sharp(Buffer.from(svgString))
    .png()
    .toBuffer();

  // ── Composite QR onto the SVG ticket ───────────────────
  // Use shared computeQrY() so QR position stays in sync with SVG layout.
  const qrPlaceholderY = computeQrY(data);

  // Center QR in its placeholder — all positions multiplied by scale
  const qrOffset = Math.round(((LAYOUT.qrPlaceholderSize - LAYOUT.qrCodeSize) / 2) * scale);
  const qrX = Math.round(LAYOUT.qrPlaceholderX * scale + qrOffset);
  const qrY = Math.round(qrPlaceholderY * scale + qrOffset);

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
 * Render a ticket as a print-quality PDF buffer (300 DPI equivalent).
 *
 * The ticket is rendered at 3× resolution (2400×3600 px from the 800×1200 SVG)
 * and embedded into an 8×12 inch PDF page (576×864 points).
 * This gives an effective 300 DPI print resolution (2400 px / 8 in = 300 DPI).
 *
 * The rendered PNG is embedded at full pixel size but the PDF page is set
 * to the physical print dimensions, so PDF viewers/printers map it correctly.
 */
export async function renderTicketPdf(data: TicketRenderData): Promise<Buffer> {
  // Render at 3× for 300 DPI print quality
  const PRINT_SCALE = 3;
  const pngBuffer = await renderTicketPng(data, PRINT_SCALE);

  const pdfDoc = await PDFDocument.create();
  const pngImage = await pdfDoc.embedPng(pngBuffer);

  // Physical page size: 8 × 12 inches at 72 points/inch = 576 × 864 points
  // This makes the 2400×3600 pixel image render at 300 DPI
  const pageWidthPoints = 576;
  const pageHeightPoints = 864;

  const page = pdfDoc.addPage([pageWidthPoints, pageHeightPoints]);
  page.drawImage(pngImage, {
    x: 0,
    y: 0,
    width: pageWidthPoints,
    height: pageHeightPoints,
  });

  return Buffer.from(await pdfDoc.save());
}
