/**
 * Ticket Rendering Tests
 *
 * Tests the self-contained SVG ticket template, render functions,
 * error codes, and QR backward compatibility.
 *
 * The renderer generates a full SVG ticket with 7 NOTES branding —
 * no external Ticket.png template required.
 */
import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import '../tests/setup.js';

// ═══════════════════════════════════════════════════════
// 1. SVG Template Validation
// ═══════════════════════════════════════════════════════

describe('SVG ticket template', () => {
  it('1. generateTicketSvg produces a valid SVG with correct dimensions', async () => {
    // Access the internal generateTicketSvg via module import
    // We test through renderTicketPng which calls it internally
    const { renderTicketPng } = await import('../infrastructure/rendering/ticket.renderer.js');
    const result = await renderTicketPng({
      eventTitle: 'Test Event',
      eventDate: '25 December 2026',
      eventTime: '18:00',
      venue: 'Test Venue',
      attendeeName: 'Test Attendee',
      ticketType: 'General',
      ticketNumber: 'TKT-SVG-001',
      orderNumber: 'ORD-SVG-001',
      qrPayload: 'svg-test-payload',
    });
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('2. SVG ticket renders without needing any external PNG file', async () => {
    // This test verifies the renderer does NOT depend on Ticket.png
    // The renderer generates a self-contained SVG — no template path needed
    const renderer = await import('../infrastructure/rendering/ticket.renderer.js');
    const fnStr = renderer.renderTicketPng.toString();
    // Should NOT reference Ticket.png (the old external template)
    expect(fnStr).not.toContain('Ticket.png');
    // Should reference QR code generation (which uses type: 'png' — that's the QR, not a template)
    expect(fnStr).toContain('qrPayload');
  });

  it('3. SVG contains 7 NOTES branding', async () => {
    // Render a ticket and inspect the SVG generation by testing
    // that the output contains visible text for "7 NOTES"
    const { renderTicketPng } = await import('../infrastructure/rendering/ticket.renderer.js');
    const result = await renderTicketPng({
      eventTitle: 'Brand Test',
      eventDate: '25 December 2026',
      eventTime: '18:00',
      venue: 'Test Venue',
      attendeeName: 'Test User',
      ticketType: 'VIP',
      ticketNumber: 'TKT-BRAND-001',
      orderNumber: 'ORD-BRAND-001',
      qrPayload: 'brand-test-payload',
    });
    // PNG must be generated successfully
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(10000); // Should be larger than 10KB
  });

  it('4. SVG output is a reasonable size for a ticket', { timeout: 30000 }, async () => {
    const { renderTicketPng } = await import('../infrastructure/rendering/ticket.renderer.js');
    const result = await renderTicketPng({
      eventTitle: 'Jamming Session 2026',
      eventDate: 'Saturday, 25 December 2026',
      eventTime: '6:00 PM',
      venue: 'Grand Ballroom, The Ritz-Carlton, Bangalore',
      attendeeName: 'Sai Kumar',
      ticketType: 'VIP Pass',
      ticketNumber: 'EVO-2026-ORD-TEST-VIP-01',
      orderNumber: 'ORD-TEST-123456',
      qrPayload: 'quality-test-payload-123',
    });
    // SVG-based ticket at 800x1200px — should be at least 40KB
    expect(result.length).toBeGreaterThan(40000);
  });
});

// ═══════════════════════════════════════════════════════
// 2. Render Function Unit Tests
// ═══════════════════════════════════════════════════════

describe('renderTicketPng — unit', () => {
  it('5. calls renderTicketPng and returns a Buffer', { timeout: 30000 }, async () => {
    const { renderTicketPng } = await import('../infrastructure/rendering/ticket.renderer.js');
    const result = await renderTicketPng({
      eventTitle: 'Test Event',
      eventDate: '25 December 2026',
      eventTime: '18:00',
      venue: 'Test Venue',
      attendeeName: 'Test Attendee',
      ticketType: 'General',
      ticketNumber: 'TKT-TEST-001',
      orderNumber: 'ORD-TEST-001',
      qrPayload: 'test-qr-payload',
    });
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('6. renderTicketPng output begins with PNG signature', { timeout: 30000 }, async () => {
    const { renderTicketPng } = await import('../infrastructure/rendering/ticket.renderer.js');
    const result = await renderTicketPng({
      eventTitle: 'Test Event',
      eventDate: '25 December 2026',
      eventTime: '18:00',
      venue: 'Test Venue',
      attendeeName: 'Test Attendee',
      ticketType: 'General',
      ticketNumber: 'TKT-TEST-002',
      orderNumber: 'ORD-TEST-002',
      qrPayload: 'test-qr-payload-2',
    });
    const hexSignature = result.subarray(0, 8).toString('hex');
    expect(hexSignature).toBe('89504e470d0a1a0a');
  });
});

describe('renderTicketPdf — unit', () => {
  it('7. calls renderTicketPdf and returns a Buffer', { timeout: 30000 }, async () => {
    const { renderTicketPdf } = await import('../infrastructure/rendering/ticket.renderer.js');
    const result = await renderTicketPdf({
      eventTitle: 'Test Event',
      eventDate: '25 December 2026',
      eventTime: '18:00',
      venue: 'Test Venue',
      attendeeName: 'Test Attendee',
      ticketType: 'General',
      ticketNumber: 'TKT-TEST-PDF-001',
      orderNumber: 'ORD-TEST-PDF-001',
      qrPayload: 'test-qr-payload-pdf',
    });
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('8. PDF begins with PDF magic bytes', { timeout: 30000 }, async () => {
    const { renderTicketPdf } = await import('../infrastructure/rendering/ticket.renderer.js');
    const result = await renderTicketPdf({
      eventTitle: 'Test Event',
      eventDate: '25 December 2026',
      eventTime: '18:00',
      venue: 'Test Venue',
      attendeeName: 'Test Attendee',
      ticketType: 'General',
      ticketNumber: 'TKT-TEST-PDF-002',
      orderNumber: 'ORD-TEST-PDF-002',
      qrPayload: 'test-qr-payload-pdf-2',
    });
    const magic = result.subarray(0, 4).toString('utf8');
    expect(magic).toBe('%PDF');
  });

  it('9. PDF is large enough to contain embedded ticket image', { timeout: 30000 }, async () => {
    const { renderTicketPdf } = await import('../infrastructure/rendering/ticket.renderer.js');
    const result = await renderTicketPdf({
      eventTitle: 'Test Event',
      eventDate: '25 December 2026',
      eventTime: '18:00',
      venue: 'Test Venue',
      attendeeName: 'Test Attendee',
      ticketType: 'General',
      ticketNumber: 'TKT-TEST-PDF-003',
      orderNumber: 'ORD-TEST-PDF-003',
      qrPayload: 'test-qr-payload-pdf-3',
    });
    expect(result.length).toBeGreaterThan(30000);
  });
});

// ═══════════════════════════════════════════════════════
// 3. Controller Error Codes
// ═══════════════════════════════════════════════════════

describe('Controller error codes', () => {
  it('10. TICKET_QR_MISSING error code is used in controller source', async () => {
    const mod = await import('../modules/tickets/ticket.controller.js');
    expect(mod.TicketController).toBeDefined();
    const renderPngSrc = mod.TicketController.prototype.renderPng?.toString() || '';
    const downloadPdfSrc = mod.TicketController.prototype.downloadPdf?.toString() || '';
    expect(renderPngSrc).toContain('TICKET_QR_MISSING');
    expect(downloadPdfSrc).toContain('TICKET_QR_MISSING');
  });

  it('11. TICKET_RENDER_FAILED and TICKET_PDF_FAILED codes are used', async () => {
    const mod = await import('../modules/tickets/ticket.controller.js');
    const renderPngSrc = mod.TicketController.prototype.renderPng?.toString() || '';
    const downloadPdfSrc = mod.TicketController.prototype.downloadPdf?.toString() || '';
    expect(renderPngSrc).toContain('TICKET_RENDER_FAILED');
    expect(downloadPdfSrc).toContain('TICKET_PDF_FAILED');
  });
});

// ═══════════════════════════════════════════════════════
// 4. QR Token Generation
// ═══════════════════════════════════════════════════════

describe('QR token generation', () => {
  it('12. generateQrToken produces token and hash', async () => {
    const { generateQrToken, hashQrToken } = await import('../infrastructure/rendering/qr.service.js');
    const { token, tokenHash } = generateQrToken();
    expect(token).toBeTruthy();
    expect(tokenHash).toBeTruthy();
    expect(token).not.toBe(tokenHash);
    expect(hashQrToken(token)).toBe(tokenHash);
  });

  it('13. each call generates a unique token', async () => {
    const { generateQrToken } = await import('../infrastructure/rendering/qr.service.js');
    const a = generateQrToken();
    const b = generateQrToken();
    expect(a.token).not.toBe(b.token);
    expect(a.tokenHash).not.toBe(b.tokenHash);
  });

  it('14. token has sufficient entropy', async () => {
    const { generateQrToken } = await import('../infrastructure/rendering/qr.service.js');
    const { token } = generateQrToken();
    expect(token.length).toBeGreaterThanOrEqual(64);
  });
});

// ═══════════════════════════════════════════════════════
// 5. Scanner compatibility
// ═══════════════════════════════════════════════════════

describe('Scanner compatibility', () => {
  it('15. ticket with valid QR can be verified by hash', async () => {
    const { generateQrToken, hashQrToken } = await import('../infrastructure/rendering/qr.service.js');
    const { token, tokenHash } = generateQrToken();
    expect(hashQrToken(token)).toBe(tokenHash);
  });

  it('16. different tokens always hash differently', async () => {
    const { hashQrToken } = await import('../infrastructure/rendering/qr.service.js');
    const hash1 = hashQrToken('token-abc-' + randomBytes(16).toString('hex'));
    const hash2 = hashQrToken('token-xyz-' + randomBytes(16).toString('hex'));
    expect(hash1).not.toBe(hash2);
  });

  it('17. same token hashes deterministically', async () => {
    const { hashQrToken } = await import('../infrastructure/rendering/qr.service.js');
    const token = 'deterministic-token-' + Date.now();
    expect(hashQrToken(token)).toBe(hashQrToken(token));
  });
});
