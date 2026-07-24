import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../infrastructure/rendering/qr.service.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../infrastructure/rendering/qr.service.js')>();
  return {
    ...actual,
    generateQrCodeDataUrl: vi.fn(async (token: string) => `data:image/png;base64,${Buffer.from(token).toString('base64')}`),
  };
});

vi.mock('../infrastructure/rendering/ticket.service.js', () => ({
  renderTicketHtml: vi.fn(async () => '<!doctype html><html><body>Ticket</body></html>'),
}));

vi.mock('../infrastructure/rendering/ticket.renderer.js', () => ({
  renderTicketPng: vi.fn(async () => Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex')),
  renderTicketPdf: vi.fn(async () => Buffer.from('%PDF-1.7\n%mock\n')),
}));

import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { generateCsrfToken } from '../middleware/csrf.js';
import { hashToken } from '../middleware/authentication.js';
import { prisma } from '../infrastructure/database/prisma.js';
import { generateQrCodeDataUrl } from '../infrastructure/rendering/qr.service.js';
import { renderTicketHtml } from '../infrastructure/rendering/ticket.service.js';
import { renderTicketPng, renderTicketPdf } from '../infrastructure/rendering/ticket.renderer.js';

const tokens = {
  owner: 'owner-token',
  organizer: 'organizer-token',
  admin: 'admin-token',
  outsider: 'outsider-token',
} as const;

const users = {
  owner: { id: 'user-owner', email: 'owner@example.com', name: 'Owner', role: 'ATTENDEE' },
  organizer: { id: 'user-organizer', email: 'organizer@example.com', name: 'Organizer', role: 'ORGANIZER' },
  admin: { id: 'user-admin', email: 'admin@example.com', name: 'Admin', role: 'ADMIN' },
  outsider: { id: 'user-outsider', email: 'outsider@example.com', name: 'Outsider', role: 'ATTENDEE' },
} as const;

function sessionFromToken(token: string) {
  const user = Object.entries(tokens).find(([, value]) => value === token)?.[0] as keyof typeof users | undefined;
  if (!user) return null;
  return {
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    user: users[user],
  };
}

function authHeaders(token: string, method: string) {
  const headers: Record<string, string> = {
    cookie: `session_token=${token}`,
  };

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    headers['x-csrf-token'] = generateCsrfToken(token);
  }

  return headers;
}

describe('Ticket flow API E2E', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(prisma.session.findUnique).mockImplementation(async (args: any) => {
      const hash = args?.where?.tokenHash;
      const allTokens = Object.values(tokens);
      const token = allTokens.find((candidate) => hashToken(candidate) === hash);
      return token ? (sessionFromToken(token) as any) : null;
    });
    vi.mocked(prisma.checkInAttempt.create).mockResolvedValue({} as any);
  });

  describe('P0 auth requirements', () => {
    const endpoints = [
      '/api/v1/tickets',
      '/api/v1/tickets/TKT-001',
      '/api/v1/tickets/TKT-001/qr',
      '/api/v1/tickets/TKT-001/html',
      '/api/v1/tickets/TKT-001/render',
      '/api/v1/tickets/TKT-001/download',
    ];

    for (const url of endpoints) {
      it(`returns 401 for unauthenticated GET ${url}`, async () => {
        const response = await app.inject({ method: 'GET', url });
        expect(response.statusCode).toBe(401);
      });
    }

    it('authorizes ticket detail route by owner/organizer/admin and denies outsider', async () => {
      vi.mocked(prisma.ticket.findUnique).mockResolvedValue({
        id: 'ticket-1',
        ticketNumber: 'TKT-001',
        userId: users.owner.id,
        eventId: 'event-1',
        status: 'CONFIRMED',
        event: {
          id: 'event-1',
          title: 'Evora Fest',
          slug: 'evora-fest',
          posterObjectKey: null,
          startAt: new Date('2026-12-25T18:00:00Z'),
          endAt: null,
          venueName: 'Main Hall',
          venueAddress: 'Address',
          mapUrl: null,
          status: 'PUBLISHED',
          organizerId: users.organizer.id,
          organizer: { id: users.organizer.id, name: 'Organizer' },
        },
        ticketType: { id: 'tt-1', name: 'General', price: 1000, currency: 'INR' },
        order: { id: 'order-1', orderNumber: 'ORD-1', status: 'CONFIRMED', total: 1000 },
        attendee: { id: 'att-1', attendeeName: 'Owner', attendeeEmail: 'owner@example.com' },
        checkIn: null,
        user: { id: users.owner.id, name: 'Owner', email: 'owner@example.com' },
      } as any);

      const owner = await app.inject({ method: 'GET', url: '/api/v1/tickets/TKT-001', headers: authHeaders(tokens.owner, 'GET') });
      const outsider = await app.inject({ method: 'GET', url: '/api/v1/tickets/TKT-001', headers: authHeaders(tokens.outsider, 'GET') });
      const organizer = await app.inject({ method: 'GET', url: '/api/v1/tickets/TKT-001', headers: authHeaders(tokens.organizer, 'GET') });
      const admin = await app.inject({ method: 'GET', url: '/api/v1/tickets/TKT-001', headers: authHeaders(tokens.admin, 'GET') });

      expect(owner.statusCode).toBe(200);
      expect(organizer.statusCode).toBe(200);
      expect(admin.statusCode).toBe(200);
      expect(outsider.statusCode).toBe(403);
    });

    it('returns 404 for unknown ticket detail', async () => {
      vi.mocked(prisma.ticket.findUnique).mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tickets/TKT-UNKNOWN',
        headers: authHeaders(tokens.owner, 'GET'),
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('P1 lifecycle/status invariants', () => {
    it('lists issued tickets for the authenticated owner', async () => {
      vi.mocked(prisma.ticket.findMany).mockResolvedValue([
        {
          id: 'ticket-1',
          ticketNumber: 'TKT-001',
          status: 'CONFIRMED',
          event: { id: 'event-1', title: 'Evora Fest', slug: 'evora-fest', startAt: new Date('2026-12-25T18:00:00Z'), venueName: 'Main Hall', venueAddress: 'Address', posterObjectKey: null },
          ticketType: { name: 'General', price: 1000 },
          checkIn: null,
          order: { id: 'order-1', orderNumber: 'ORD-1', status: 'CONFIRMED' },
          attendee: { attendeeName: 'Owner', attendeeEmail: 'owner@example.com' },
        },
      ] as any);

      const response = await app.inject({ method: 'GET', url: '/api/v1/tickets', headers: authHeaders(tokens.owner, 'GET') });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.tickets).toHaveLength(1);
      expect(body.tickets[0].ticketNumber).toBe('TKT-001');
      expect(body.tickets[0].status).toBe('CONFIRMED');
    });

    it('allows CONFIRMED -> CHECKED_IN transition and blocks duplicate check-in', async () => {
      vi.mocked(prisma.ticket.findUnique)
        .mockResolvedValueOnce({
          id: 'ticket-1',
          ticketNumber: 'TKT-001',
          eventId: 'event-1',
          qrTokenHash: 'hashed-qr',
          attendeeName: 'Owner',
          attendeeEmail: 'owner@example.com',
          ticketCategory: 'PAID',
          status: 'CONFIRMED',
          checkIn: null,
          event: { id: 'event-1', title: 'Evora Fest', status: 'PUBLISHED' },
          ticketType: { name: 'General' },
        } as any)
        .mockResolvedValueOnce({
          id: 'ticket-1',
          ticketNumber: 'TKT-001',
          eventId: 'event-1',
          qrTokenHash: 'hashed-qr',
          attendeeName: 'Owner',
          attendeeEmail: 'owner@example.com',
          ticketCategory: 'PAID',
          status: 'CONFIRMED',
          checkIn: null,
          event: { id: 'event-1', title: 'Evora Fest', status: 'PUBLISHED' },
          ticketType: { name: 'General' },
        } as any)
        .mockResolvedValueOnce({
          id: 'ticket-1',
          ticketNumber: 'TKT-001',
          eventId: 'event-1',
          qrTokenHash: 'hashed-qr',
          attendeeName: 'Owner',
          attendeeEmail: 'owner@example.com',
          ticketCategory: 'PAID',
          status: 'CONFIRMED',
          checkIn: { checkedInAt: new Date('2026-12-25T18:05:00Z'), scannerId: users.admin.id, gateName: 'Gate A' },
          event: { id: 'event-1', title: 'Evora Fest', status: 'PUBLISHED' },
          ticketType: { name: 'General' },
        } as any);

      vi.mocked(prisma.checkIn.create).mockResolvedValue({ checkedInAt: new Date('2026-12-25T18:00:00Z'), gateName: 'Gate A' } as any);
      vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => fn(prisma as any));

      const first = await app.inject({
        method: 'POST',
        url: '/api/v1/check-in/verify',
        headers: authHeaders(tokens.admin, 'POST'),
        payload: { token: 'raw-qr-token', eventId: 'event-1', gateName: 'Gate A' },
      });

      const second = await app.inject({
        method: 'POST',
        url: '/api/v1/check-in/verify',
        headers: authHeaders(tokens.admin, 'POST'),
        payload: { token: 'raw-qr-token', eventId: 'event-1', gateName: 'Gate A' },
      });

      expect(first.statusCode).toBe(200);
      expect(first.json().result).toBe('SUCCESS');
      expect(second.statusCode).toBe(200);
      expect(second.json().result).toBe('ALREADY_CHECKED_IN');
    });

    it('prevents oversell under parallel order creation attempts', async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue({
        id: 'event-1',
        status: 'PUBLISHED',
        salesPaused: false,
        bookingClosed: false,
        ticketTypes: [
          { id: 'tt-1', active: true, price: 500, currency: 'INR', maxPerOrder: 2, capacity: 3, soldCount: 0 },
        ],
      } as any);

      let soldCount = 0;
      const capacity = 3;
      let queue = Promise.resolve<void>(undefined);

      vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
        const run = async () => {
          const tx = {
            ticketType: {
              findUnique: async () => ({ id: 'tt-1', name: 'General', soldCount, capacity }),
              update: async ({ data }: any) => {
                soldCount += data?.soldCount?.increment ?? 0;
                return { id: 'tt-1', soldCount };
              },
            },
            order: {
              create: async ({ data }: any) => ({
                id: `order-${Math.random()}`,
                orderNumber: data.orderNumber,
                status: data.status,
                attendees: data.attendees.create.map((attendee: any, index: number) => ({ ...attendee, id: `att-${index}`, ticketType: { id: 'tt-1', price: 500 } })),
              }),
            },
          };
          return fn(tx);
        };

        const current = queue.then(run, run);
        queue = current.then(() => undefined, () => undefined);
        return current;
      });

      const payload = {
        eventId: 'event-1',
        ticketTypeId: 'tt-1',
        quantity: 2,
        attendees: [{ name: 'A' }, { name: 'B' }],
      };

      const [a, b] = await Promise.all([
        app.inject({ method: 'POST', url: '/api/v1/orders', headers: authHeaders(tokens.owner, 'POST'), payload }),
        app.inject({ method: 'POST', url: '/api/v1/orders', headers: authHeaders(tokens.owner, 'POST'), payload }),
      ]);

      const successCount = [a, b].filter((response) => response.statusCode === 201).length;
      expect(successCount).toBe(1);
      expect(soldCount).toBeLessThanOrEqual(capacity);
      expect([a.statusCode, b.statusCode]).toContain(500);
    });
  });

  describe('P2 render/download endpoints', () => {
    const renderableTicket = {
      id: 'ticket-1',
      ticketNumber: 'TKT-001',
      userId: users.owner.id,
      qrToken: 'qr-token',
      attendeeName: 'Owner',
      attendeeEmail: 'owner@example.com',
      attendeePhone: '+910000000000',
      ticketCategory: 'PAID',
      status: 'CONFIRMED',
      event: {
        title: 'Evora Fest',
        slug: 'evora-fest',
        startAt: new Date('2026-12-25T18:00:00Z'),
        venueName: 'Main Hall',
        venueAddress: 'Address',
        terms: null,
      },
      ticketType: { id: 'tt-1', name: 'General', price: 1000, currency: 'INR' },
      order: { id: 'order-1', orderNumber: 'ORD-1', status: 'CONFIRMED', total: 1000 },
      attendee: { id: 'att-1', attendeeName: 'Owner', attendeeEmail: 'owner@example.com' },
      checkIn: null,
      user: { id: users.owner.id, name: 'Owner', email: 'owner@example.com' },
    };

    it('returns QR payload', async () => {
      vi.mocked(prisma.ticket.findUnique).mockResolvedValue({
        userId: users.owner.id,
        qrToken: 'qr-token',
        status: 'CONFIRMED',
      } as any);
      vi.mocked(generateQrCodeDataUrl).mockResolvedValue('data:image/png;base64,UVItREFUQQ==');

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tickets/TKT-001/qr',
        headers: authHeaders(tokens.owner, 'GET'),
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().qrCodeUrl).toMatch(/^data:image\/png;base64,/);
    });

    it('returns HTML render with text/html content type', async () => {
      vi.mocked(prisma.ticket.findUnique).mockResolvedValue(renderableTicket as any);
      vi.mocked(renderTicketHtml).mockResolvedValue('<!doctype html><html><body>Ticket HTML</body></html>');

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tickets/TKT-001/html',
        headers: authHeaders(tokens.owner, 'GET'),
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.body).toContain('<html>');
    });

    it('returns PNG render with valid PNG signature and image content-type', async () => {
      vi.mocked(prisma.ticket.findUnique).mockResolvedValue(renderableTicket as any);
      vi.mocked(renderTicketPng).mockResolvedValue(Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex'));

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tickets/TKT-001/render',
        headers: authHeaders(tokens.owner, 'GET'),
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('image/png');
      const magic = response.rawPayload.subarray(0, 8).toString('hex');
      expect(magic).toBe('89504e470d0a1a0a');
    });

    it('returns PDF download with headers and PDF signature', async () => {
      vi.mocked(prisma.ticket.findUnique).mockResolvedValue(renderableTicket as any);
      vi.mocked(renderTicketPdf).mockResolvedValue(Buffer.from('%PDF-1.7\nmock'));

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tickets/TKT-001/download',
        headers: authHeaders(tokens.owner, 'GET'),
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/pdf');
      expect(response.headers['content-disposition']).toContain('attachment; filename="TKT-001.pdf"');
      expect(response.rawPayload.subarray(0, 4).toString('utf8')).toBe('%PDF');
    });
  });
});
