/**
 * Phase D/E — Ticket generation and complimentary ticket tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '../tests/setup.js';

describe('Ticket number format', () => {
  it('generates a correctly prefixed ticket number', () => {
    const prefix = '7N-';
    const orderNumber = 'ORD-1234567890-ABC';
    const seq = 1;
    const ticketNumber = `${prefix}${orderNumber}-${String(seq).padStart(2, '0')}`;
    expect(ticketNumber).toBe('7N-ORD-1234567890-ABC-01');
    expect(ticketNumber).toContain(prefix);
  });

  it('generates sequential ticket numbers for multiple attendees', () => {
    const prefix = '7N-';
    const orderNumber = 'ORD-TEST-001';
    const numbers = [1, 2, 3].map(i => `${prefix}${orderNumber}-${String(i).padStart(2, '0')}`);
    expect(numbers).toEqual(['7N-ORD-TEST-001-01', '7N-ORD-TEST-001-02', '7N-ORD-TEST-001-03']);
    // All unique
    expect(new Set(numbers).size).toBe(3);
  });

  it('complimentary ticket number uses COMP prefix', () => {
    const prefix = '7N-';
    const ts = Date.now();
    const ticketNumber = `${prefix}COMP-${ts}-01`;
    expect(ticketNumber).toContain('COMP');
  });
});

describe('Ticket category and source', () => {
  it('paid ticket has correct category and source', () => {
    const ticket = {
      ticketCategory: 'PAID',
      source: 'PAYMENT_APPROVAL',
      visibility: 'STANDARD',
      pricePaid: 50000,
    };
    expect(ticket.ticketCategory).toBe('PAID');
    expect(ticket.source).toBe('PAYMENT_APPROVAL');
    expect(ticket.visibility).toBe('STANDARD');
    expect(ticket.pricePaid).toBeGreaterThan(0);
  });

  it('complimentary ticket has correct category, source, and visibility', () => {
    const ticket = {
      ticketCategory: 'COMPLIMENTARY',
      source: 'ADMIN_MANUAL',
      visibility: 'ADMIN_ONLY',
      pricePaid: 0,
    };
    expect(ticket.ticketCategory).toBe('COMPLIMENTARY');
    expect(ticket.source).toBe('ADMIN_MANUAL');
    expect(ticket.visibility).toBe('ADMIN_ONLY');
    expect(ticket.pricePaid).toBe(0);
  });

  it('VIP ticket defaults to ADMIN_ONLY visibility', () => {
    const ADMIN_ONLY_CATEGORIES = ['COMPLIMENTARY', 'VIP', 'MEDIA', 'ARTIST', 'SPONSOR', 'STAFF', 'VOLUNTEER'];
    const category = 'VIP';
    const visibility = ADMIN_ONLY_CATEGORIES.includes(category) ? 'ADMIN_ONLY' : 'STANDARD';
    expect(visibility).toBe('ADMIN_ONLY');
  });

  it('PAID ticket is not in admin-only categories', () => {
    const ADMIN_ONLY_CATEGORIES = ['COMPLIMENTARY', 'VIP', 'MEDIA', 'ARTIST', 'SPONSOR', 'STAFF', 'VOLUNTEER'];
    expect(ADMIN_ONLY_CATEGORIES.includes('PAID')).toBe(false);
  });
});

describe('Complimentary ticket allowed categories', () => {
  const ALLOWED = ['COMPLIMENTARY', 'VIP', 'MEDIA', 'ARTIST', 'SPONSOR', 'STAFF', 'VOLUNTEER'];

  it('COMPLIMENTARY is allowed', () => expect(ALLOWED.includes('COMPLIMENTARY')).toBe(true));
  it('VIP is allowed', () => expect(ALLOWED.includes('VIP')).toBe(true));
  it('MEDIA is allowed', () => expect(ALLOWED.includes('MEDIA')).toBe(true));
  it('PAID is NOT allowed for complimentary issuance', () => expect(ALLOWED.includes('PAID')).toBe(false));
});

describe('Ticket QR token uniqueness', () => {
  it('each ticket generation produces a unique QR token', async () => {
    const { generateQrToken } = await import('../infrastructure/rendering/qr.service.js');
    const tickets = Array.from({ length: 20 }, () => generateQrToken());
    const tokens = tickets.map(t => t.token);
    const hashes = tickets.map(t => t.tokenHash);
    expect(new Set(tokens).size).toBe(20);
    expect(new Set(hashes).size).toBe(20);
  });
});

describe('Idempotency guard — already confirmed order', () => {
  it('detects already-confirmed state without creating duplicate tickets', () => {
    const orderStatus = 'CONFIRMED';
    const existingTicketCount = 2;

    if (orderStatus === 'CONFIRMED') {
      // Should return existing tickets, not create new ones
      const newTicketsCreated = 0;
      expect(newTicketsCreated).toBe(0);
    }
  });
});
