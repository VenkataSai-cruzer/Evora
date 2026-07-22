import path from 'node:path';
import { existsSync } from 'node:fs';
import sharp from 'sharp';
import QRCode from 'qrcode';
import { PDFDocument } from 'pdf-lib';
import { ticketTemplateConfig } from './ticket-template.config.js';

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
 * Wrap text into at most maxLines, each line at most maxCharsPerLine.
 * Returns lines to render. Last line is truncated with ellipsis if needed.
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

  // Truncate last line if it exceeds maxCharsPerLine
  if (lines.length > 0 && lines[lines.length - 1].length > maxCharsPerLine) {
    lines[lines.length - 1] = truncateText(lines[lines.length - 1], maxCharsPerLine);
  }

  return lines;
}

/**
 * Build an SVG overlay string with text fields positioned
 * according to the ticket template config.
 */
function createTicketOverlaySvg(
  width: number,
  height: number,
  data: TicketRenderData,
): string {
  const cfg = ticketTemplateConfig.fields;
  const lines: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
  ];

  // ── Event Title ─────────────────────────────────────────
  const titleCfg = cfg.eventTitle;
  const titleX = Math.round(width * titleCfg.xRatio);
  const titleY = Math.round(height * titleCfg.yRatio);
  const titleMaxChars = 40;
  const titleLines = wrapText(data.eventTitle, titleMaxChars, titleCfg.maxLines);
  const titleLineHeight = titleCfg.fontSizePt * 1.3;
  titleLines.forEach((line, i) => {
    lines.push(
      `<text x="${titleX}" y="${titleY + i * titleLineHeight}" font-family="Inter, Arial, sans-serif" font-size="${titleCfg.fontSizePt}px" font-weight="700" fill="#FFFFFF">${escapeXml(line)}</text>`,
    );
  });

  // ── Attendee Name ───────────────────────────────────────
  const nameCfg = cfg.attendeeName;
  const nameX = Math.round(width * nameCfg.xRatio);
  const nameY = Math.round(height * nameCfg.yRatio);
  lines.push(
    `<text x="${nameX}" y="${nameY}" font-family="Inter, Arial, sans-serif" font-size="${nameCfg.fontSizePt}px" font-weight="600" fill="#1a1a1a">${escapeXml(truncateText(data.attendeeName, 40))}</text>`,
  );

  // ── Ticket Type ─────────────────────────────────────────
  const typeCfg = cfg.ticketType;
  const typeX = Math.round(width * typeCfg.xRatio);
  const typeY = Math.round(height * typeCfg.yRatio);
  lines.push(
    `<text x="${typeX}" y="${typeY}" font-family="Inter, Arial, sans-serif" font-size="${typeCfg.fontSizePt}px" font-weight="500" fill="#666666">${escapeXml(data.ticketType)}</text>`,
  );

  // ── Event Date ─────────────────────────────────────────
  const dateCfg = cfg.eventDate;
  const dateX = Math.round(width * dateCfg.xRatio);
  const dateY = Math.round(height * dateCfg.yRatio);
  const dateText = `${data.eventDate} • ${data.eventTime}`;
  lines.push(
    `<text x="${dateX}" y="${dateY}" font-family="Inter, Arial, sans-serif" font-size="${dateCfg.fontSizePt}px" font-weight="500" fill="#1a1a1a">${escapeXml(truncateText(dateText, 50))}</text>`,
  );

  // ── Venue ───────────────────────────────────────────────
  const venueCfg = cfg.venue;
  const venueX = Math.round(width * venueCfg.xRatio);
  const venueY = Math.round(height * venueCfg.yRatio);
  const venueMaxChars = 45;
  const venueLines = wrapText(data.venue, venueMaxChars, venueCfg.maxLines);
  const venueLineHeight = 22;
  venueLines.forEach((line, i) => {
    lines.push(
      `<text x="${venueX}" y="${venueY + i * venueLineHeight}" font-family="Inter, Arial, sans-serif" font-size="${venueCfg.fontSizePt}px" font-weight="500" fill="#1a1a1a">${escapeXml(line)}</text>`,
    );
  });

  // ── Ticket Number ───────────────────────────────────────
  const numCfg = cfg.ticketNumber;
  const numX = Math.round(width * numCfg.xRatio);
  const numY = Math.round(height * numCfg.yRatio);
  const ticketLabel = `${data.ticketNumber}${data.orderNumber ? ` • ${data.orderNumber}` : ''}`;
  lines.push(
    `<text x="${numX}" y="${numY}" font-family="'Courier New', monospace" font-size="${numCfg.fontSizePt}px" font-weight="600" fill="#1a1a1a">${escapeXml(ticketLabel)}</text>`,
  );

  lines.push('</svg>');
  return lines.join('\n');
}

/**
 * Render a ticket as a PNG buffer using the Ticket.png template.
 *
 * 1. Loads Ticket.png
 * 2. Generates QR code from the opaque token
 * 3. Composites text overlay SVG and QR onto the template
 * 4. Returns final PNG buffer
 */
export async function renderTicketPng(data: TicketRenderData): Promise<Buffer> {
  const templatePath = path.resolve(process.cwd(), 'assets', 'Ticket.png');
  if (!existsSync(templatePath)) {
    throw new Error(`Ticket template not found at ${templatePath}`);
  }

  const template = sharp(templatePath);
  const metadata = await template.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error('Could not read ticket template dimensions');
  }

  const width = metadata.width;
  const height = metadata.height;

  // ── Generate QR Code ────────────────────────────────────
  const qrCfg = ticketTemplateConfig.fields.qrCode;
  const qrSize = Math.round(width * qrCfg.sizeRatio);

  const qrBuffer = await QRCode.toBuffer(data.qrPayload, {
    type: 'png',
    width: qrSize,
    margin: 1,
    errorCorrectionLevel: 'H',
  });

  // ── Build SVG Text Overlay ──────────────────────────────
  const overlaySvg = createTicketOverlaySvg(width, height, data);

  // ── Composite onto Template ─────────────────────────────
  const qrX = Math.round(width * qrCfg.xRatio);
  const qrY = Math.round(height * qrCfg.yRatio);

  return template
    .composite([
      {
        input: Buffer.from(overlaySvg),
        left: 0,
        top: 0,
      },
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
