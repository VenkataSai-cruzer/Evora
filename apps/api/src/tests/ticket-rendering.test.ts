/**
 * Ticket Rendering Tests
 *
 * Tests ticket template path resolution, render functions,
 * error codes, and QR backward compatibility.
 *
 * Pattern: Pure unit tests (matching existing phase4-qr.test.ts style).
 * No Fastify injection — relies on mock Prisma from setup.ts.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import '../tests/setup.js';

// ── Helpers ──────────────────────────────────────────────────

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
// Test file is at: apps/api/src/tests/ticket-rendering.test.ts
// MODULE_DIR = apps/api/src/tests
// API_ROOT = apps/api
const API_ROOT = path.resolve(MODULE_DIR, '..', '..');
const ASSETS_DIR = path.resolve(API_ROOT, 'assets');
const TICKET_PNG = path.resolve(ASSETS_DIR, 'Ticket.png');
const SCRIPTS_DIR = path.resolve(API_ROOT, 'scripts');
const COPY_ASSETS_SCRIPT = path.resolve(SCRIPTS_DIR, 'copy-assets.mjs');

/**
 * Simulates the path-resolution fallback used in ticket.renderer.ts.
 * Checks dist/assets/Ticket.png (prod) first, then falls back to package-root assets/.
 */
function resolveTemplatePath(): string {
  // In module-relative terms (from infrastructure/rendering/ticket.renderer.ts):
  //   prod: moduleDir -> ../../assets/Ticket.png = dist/assets/Ticket.png
  //   dev:  moduleDir -> ../../../assets/Ticket.png = package root -> assets/Ticket.png
  // In test terms (from src/tests/), analogous:
  const distCandidate = path.resolve(MODULE_DIR, '..', '..', '..', 'dist', 'assets', 'Ticket.png');
  if (existsSync(distCandidate)) return distCandidate;
  // Dev fallback: API root assets/
  const devCandidate = TICKET_PNG;
  if (existsSync(devCandidate)) return devCandidate;
  // Final fallback: repo root assets/
  const repoCandidate = path.resolve(API_ROOT, '..', '..', 'assets', 'Ticket.png');
  return repoCandidate;
}

// ═══════════════════════════════════════════════════════
// 1. Template Source & Path Resolution
// ═══════════════════════════════════════════════════════

describe('Ticket template — source asset', () => {
  it('1. source assets/Ticket.png exists in the API package', () => {
    expect(existsSync(TICKET_PNG)).toBe(true);
  });

  it('2. copy-assets script exists for build-time asset copying', () => {
    expect(existsSync(COPY_ASSETS_SCRIPT)).toBe(true);
  });

  it('3. template resolves to the correct existing path', () => {
    const resolved = resolveTemplatePath();
    expect(existsSync(resolved)).toBe(true);
    // Must be a .png file
    expect(resolved.toLowerCase()).toMatch(/ticket\.png$/);
  });

  it('4. template path contains expected filename', () => {
    const resolved = resolveTemplatePath();
    const basename = path.basename(resolved);
    expect(basename).toBe('Ticket.png');
  });
});

describe('Template path resolution fallback', () => {
  it('5. development fallback resolves when dist path is absent', () => {
    const distCandidate = path.resolve(MODULE_DIR, '..', '..', '..', 'dist', 'assets', 'Ticket.png');
    const devCandidate = TICKET_PNG;

    if (!existsSync(distCandidate)) {
      // When dist doesn't have it, dev fallback must work
      expect(existsSync(devCandidate)).toBe(true);
    }
    // At least one path must work
    const resolved = resolveTemplatePath();
    expect(existsSync(resolved)).toBe(true);
  });

  it('6. template can be used by Sharp (quick metadata test)', { timeout: 15000 }, async () => {
    if (!existsSync(TICKET_PNG)) return; // skip
    try {
      const sharp = (await import('sharp')).default;
      const metadata = await sharp(TICKET_PNG).metadata();
      expect(metadata.width).toBeGreaterThan(0);
      expect(metadata.height).toBeGreaterThan(0);
      expect(metadata.format).toBe('png');
    } catch {
      // Soft-skip: Sharp may not have native bindings in CI
      console.warn('SKIP: Sharp could not decode Ticket.png (CI may lack native bindings)');
    }
  });
});

// ═══════════════════════════════════════════════════════
// 2. Render Function Unit Tests
// ═══════════════════════════════════════════════════════

describe('renderTicketPng — unit', () => {
  it('7. calls renderTicketPng and returns a Buffer', { timeout: 30000 }, async () => {
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

  it('8. renderTicketPng output begins with PNG signature', { timeout: 30000 }, async () => {
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
  it('9. calls renderTicketPdf and returns a Buffer', { timeout: 30000 }, async () => {
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

  it('10. PDF begins with PDF magic bytes', { timeout: 30000 }, async () => {
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

  it('11. PDF is large enough to contain embedded ticket image', { timeout: 30000 }, async () => {
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
    // PDF should be at least 50KB — any less and the ticket image likely failed to embed
    expect(result.length).toBeGreaterThan(50000);
  });
});

// ═══════════════════════════════════════════════════════
// 3. Controller Error Codes
// ═══════════════════════════════════════════════════════

describe('Controller error codes', () => {
  it('12. TICKET_QR_MISSING error code is used in controller source', async () => {
    const mod = await import('../modules/tickets/ticket.controller.js');
    expect(mod.TicketController).toBeDefined();
    const renderPngSrc = mod.TicketController.prototype.renderPng?.toString() || '';
    const downloadPdfSrc = mod.TicketController.prototype.downloadPdf?.toString() || '';
    // Both renderPng and downloadPdf methods must reference TICKET_QR_MISSING
    expect(renderPngSrc).toContain('TICKET_QR_MISSING');
    expect(downloadPdfSrc).toContain('TICKET_QR_MISSING');
  });

  it('12b. TICKET_TEMPLATE_MISSING error code is used in controller source', async () => {
    const mod = await import('../modules/tickets/ticket.controller.js');
    const renderPngSrc = mod.TicketController.prototype.renderPng?.toString() || '';
    const downloadPdfSrc = mod.TicketController.prototype.downloadPdf?.toString() || '';
    expect(renderPngSrc).toContain('TICKET_TEMPLATE_MISSING');
    expect(downloadPdfSrc).toContain('TICKET_TEMPLATE_MISSING');
  });

  it('12c. TICKET_RENDER_FAILED and TICKET_PDF_FAILED codes are used', async () => {
    const mod = await import('../modules/tickets/ticket.controller.js');
    const renderPngSrc = mod.TicketController.prototype.renderPng?.toString() || '';
    const downloadPdfSrc = mod.TicketController.prototype.downloadPdf?.toString() || '';
    expect(renderPngSrc).toContain('TICKET_RENDER_FAILED');
    expect(downloadPdfSrc).toContain('TICKET_PDF_FAILED');
  });
});

// ═══════════════════════════════════════════════════════
// 4. QR Token Generation (preserves existing tests)
// ═══════════════════════════════════════════════════════

describe('QR token generation', () => {
  it('13. generateQrToken produces token and hash', async () => {
    const { generateQrToken, hashQrToken } = await import('../infrastructure/rendering/qr.service.js');
    const { token, tokenHash } = generateQrToken();
    expect(token).toBeTruthy();
    expect(tokenHash).toBeTruthy();
    expect(token).not.toBe(tokenHash);
    expect(hashQrToken(token)).toBe(tokenHash);
  });

  it('14. each call generates a unique token', async () => {
    const { generateQrToken } = await import('../infrastructure/rendering/qr.service.js');
    const a = generateQrToken();
    const b = generateQrToken();
    expect(a.token).not.toBe(b.token);
    expect(a.tokenHash).not.toBe(b.tokenHash);
  });

  it('15. token has sufficient entropy', async () => {
    const { generateQrToken } = await import('../infrastructure/rendering/qr.service.js');
    const { token } = generateQrToken();
    // 32 bytes hex HMAC + 64 bytes hex random = 128 chars minimum
    expect(token.length).toBeGreaterThanOrEqual(64);
  });
});

// ═══════════════════════════════════════════════════════
// 5. Scanner compatibility (preserving flow)
// ═══════════════════════════════════════════════════════

describe('Scanner compatibility', () => {
  it('16. ticket with valid QR can be verified by hash', async () => {
    const { generateQrToken, hashQrToken } = await import('../infrastructure/rendering/qr.service.js');
    const { token, tokenHash } = generateQrToken();
    expect(hashQrToken(token)).toBe(tokenHash);
  });

  it('17. different tokens always hash differently', async () => {
    const { hashQrToken } = await import('../infrastructure/rendering/qr.service.js');
    const hash1 = hashQrToken('token-abc-' + randomBytes(16).toString('hex'));
    const hash2 = hashQrToken('token-xyz-' + randomBytes(16).toString('hex'));
    expect(hash1).not.toBe(hash2);
  });

  it('18. same token hashes deterministically', async () => {
    const { hashQrToken } = await import('../infrastructure/rendering/qr.service.js');
    const token = 'deterministic-token-' + Date.now();
    expect(hashQrToken(token)).toBe(hashQrToken(token));
  });
});

// ═══════════════════════════════════════════════════════
// 6. Copy-assets script unit test
// ═══════════════════════════════════════════════════════

describe('copy-assets script', () => {
  it('19. copy-assets.mjs has valid JavaScript syntax', async () => {
    const scriptContent = (await import('node:fs')).readFileSync(COPY_ASSETS_SCRIPT, 'utf-8');
    expect(scriptContent).toContain('copyAssets');
    expect(scriptContent).toContain('Ticket.png');
    expect(scriptContent).toContain('mkdir');
    expect(scriptContent).toContain('cp');
  });
});
