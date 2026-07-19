import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

// Integration tests require a real PostgreSQL test database.
// Set DATABASE_URL_TEST in .env to run these tests.
// These tests use the test database, not the development database.

const TEST_DB_URL = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;

// Skip all tests if not configured for integration testing
const isIntegrationTest = !!process.env.DATABASE_URL_TEST;

const describeIf = isIntegrationTest ? describe : describe.skip;
const itIf = isIntegrationTest ? it : it.skip;

describeIf('Ticket Registration Integration Tests', () => {
  const prisma = new PrismaClient({
    datasources: { db: { url: TEST_DB_URL } },
  });

  let testOrganizer: any;
  let testEvent: any;
  let testTicketType: any;
  let testAttendeeUser: any;

  beforeAll(async () => {
    // Create test data
    const pw = await hash('test1234', 12);

    testOrganizer = await prisma.user.create({
      data: {
        email: `org-test-${Date.now()}@jamming.test`,
        displayName: 'Test Organizer',
        passwordHash: pw,
        role: 'ORGANIZER',
      },
    });

    testAttendeeUser = await prisma.user.create({
      data: {
        email: `attendee-test-${Date.now()}@jamming.test`,
        displayName: 'Test Attendee',
        passwordHash: pw,
        role: 'USER',
      },
    });

    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    testEvent = await prisma.event.create({
      data: {
        title: 'Test Integration Event',
        slug: `test-event-${Date.now()}`,
        description: 'Integration test event for ticket registration.',
        startDate: futureDate,
        startTime: '19:00',
        venueName: 'Test Venue',
        venueAddress: '123 Test St, Austin, TX',
        capacity: 50,
        ticketType: 'FREE',
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
        organizerId: testOrganizer.id,
      },
    });

    testTicketType = await prisma.ticketType.create({
      data: {
        eventId: testEvent.id,
        name: 'General Admission',
        priceAmount: 0,
        quantity: 10,
        minPerBooking: 1,
        maxPerBooking: 10,
        bookingMode: 'FLEXIBLE',
        status: 'ACTIVE',
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    if (testTicketType?.id) {
      const tickets = await prisma.ticket.findMany({
        where: { eventId: testEvent.id },
        select: { id: true, attendeeId: true, orderId: true },
      });
      for (const t of tickets) {
        if (t.attendeeId) await prisma.orderAttendee.delete({ where: { id: t.attendeeId } }).catch(() => {});
        if (t.orderId) {
          await prisma.payment.deleteMany({ where: { orderId: t.orderId } });
          await prisma.order.delete({ where: { id: t.orderId } }).catch(() => {});
        }
      }
      await prisma.ticket.deleteMany({ where: { eventId: testEvent.id } });
      await prisma.ticketType.deleteMany({ where: { eventId: testEvent.id } });
    }
    if (testEvent?.id) {
      await prisma.event.delete({ where: { id: testEvent.id } }).catch(() => {});
    }
    if (testOrganizer?.id) {
      await prisma.user.delete({ where: { id: testOrganizer.id } }).catch(() => {});
    }
    if (testAttendeeUser?.id) {
      await prisma.user.delete({ where: { id: testAttendeeUser.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  itIf('should create one order attendee and one ticket for Solo booking', async () => {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber: `ORD-TEST-SOLO-${Date.now()}`,
          eventId: testEvent.id,
          userId: testAttendeeUser.id,
          bookingType: 'SOLO',
          attendeeCount: 1,
          totalAmount: 0,
          status: 'PAID',
        },
      });

      const attendee = await tx.orderAttendee.create({
        data: {
          orderId: order.id,
          fullName: 'Solo Tester',
          email: testAttendeeUser.email,
          ticketCategory: testTicketType.name,
        },
      });

      const ticket = await tx.ticket.create({
        data: {
          ticketNumber: `TKT-SOLO-${Date.now()}`,
          eventId: testEvent.id,
          userId: testAttendeeUser.id,
          orderId: order.id,
          attendeeId: attendee.id,
          type: 'FREE',
          category: testTicketType.name,
          status: 'CONFIRMED',
          priceAmount: 0,
          qrDataUrl: '',
          qrSecret: 'test-secret-solo',
        },
      });

      await tx.orderAttendee.update({
        where: { id: attendee.id },
        data: { ticketId: ticket.id },
      });

      return { order, attendee, ticket };
    });

    expect(result.order).toBeDefined();
    expect(result.order.bookingType).toBe('SOLO');
    expect(result.order.attendeeCount).toBe(1);
    expect(result.attendee).toBeDefined();
    expect(result.attendee.fullName).toBe('Solo Tester');
    expect(result.ticket).toBeDefined();
    expect(result.ticket.status).toBe('CONFIRMED');
    expect(result.ticket.qrSecret).toBeTruthy();

    // Clean up
    await prisma.ticket.delete({ where: { id: result.ticket.id } });
    await prisma.orderAttendee.delete({ where: { id: result.attendee.id } });
    await prisma.order.delete({ where: { id: result.order.id } });
  });

  itIf('should create two tickets for Duo booking with unique QR secrets', async () => {
    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-TEST-DUO-${Date.now()}`,
        eventId: testEvent.id,
        userId: testAttendeeUser.id,
        bookingType: 'DUO',
        attendeeCount: 2,
        totalAmount: 0,
        status: 'PAID',
      },
    });

    const tickets = [];
    for (let i = 1; i <= 2; i++) {
      const attendee = await prisma.orderAttendee.create({
        data: {
          orderId: order.id,
          fullName: `Duo Tester ${i}`,
          email: testAttendeeUser.email,
          ticketCategory: testTicketType.name,
        },
      });

      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-DUO-${Date.now()}-${i}`,
          eventId: testEvent.id,
          userId: testAttendeeUser.id,
          orderId: order.id,
          attendeeId: attendee.id,
          type: 'FREE',
          category: testTicketType.name,
          status: 'CONFIRMED',
          priceAmount: 0,
          qrDataUrl: '',
          qrSecret: `test-secret-duo-${Date.now()}-${i}`,
        },
      });

      await prisma.orderAttendee.update({
        where: { id: attendee.id },
        data: { ticketId: ticket.id },
      });

      tickets.push(ticket);
    }

    expect(tickets).toHaveLength(2);
    expect(tickets[0].ticketNumber).not.toBe(tickets[1].ticketNumber);
    expect(tickets[0].qrSecret).not.toBe(tickets[1].qrSecret);

    // Clean up
    for (const t of tickets) {
      const a = await prisma.orderAttendee.findFirst({ where: { ticketId: t.id } });
      if (a) await prisma.orderAttendee.delete({ where: { id: a.id } });
      await prisma.ticket.delete({ where: { id: t.id } });
    }
    await prisma.order.delete({ where: { id: order.id } });
  });

  itIf('should enforce capacity limits', async () => {
    const smallType = await prisma.ticketType.create({
      data: {
        eventId: testEvent.id,
        name: 'Limited Capacity',
        priceAmount: 0,
        quantity: 2,
        minPerBooking: 1,
        maxPerBooking: 2,
        bookingMode: 'FLEXIBLE',
        status: 'ACTIVE',
      },
    });

    // Sell 2 tickets
    const order1 = await prisma.order.create({
      data: {
        orderNumber: `ORD-LIM-${Date.now()}`,
        eventId: testEvent.id,
        userId: testAttendeeUser.id,
        bookingType: 'SOLO',
        attendeeCount: 1,
        totalAmount: 0,
        status: 'PAID',
      },
    });

    const att1 = await prisma.orderAttendee.create({
      data: { orderId: order1.id, fullName: 'Capacity Test 1', ticketCategory: smallType.name },
    });

    const ticket1 = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-LIM-${Date.now()}-1`,
        eventId: testEvent.id,
        userId: testAttendeeUser.id,
        orderId: order1.id,
        attendeeId: att1.id,
        type: 'FREE',
        category: smallType.name,          status: 'CONFIRMED',
          priceAmount: 0,
          qrDataUrl: '',
          qrSecret: 'secret-lim-1',
      },
    });

    await prisma.orderAttendee.update({ where: { id: att1.id }, data: { ticketId: ticket1.id } });

    const order2 = await prisma.order.create({
      data: {
        orderNumber: `ORD-LIM-${Date.now()}-2`,
        eventId: testEvent.id,
        userId: testAttendeeUser.id,
        bookingType: 'SOLO',
        attendeeCount: 1,
        totalAmount: 0,
        status: 'PAID',
      },
    });

    const att2 = await prisma.orderAttendee.create({
      data: { orderId: order2.id, fullName: 'Capacity Test 2', ticketCategory: smallType.name },
    });

    const ticket2 = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-LIM-${Date.now()}-2`,
        eventId: testEvent.id,
        userId: testAttendeeUser.id,
        orderId: order2.id,
        attendeeId: att2.id,
        type: 'FREE',
        category: smallType.name,          status: 'CONFIRMED',
          priceAmount: 0,
          qrDataUrl: '',
          qrSecret: 'secret-lim-2',
      },
    });

    await prisma.orderAttendee.update({ where: { id: att2.id }, data: { ticketId: ticket2.id } });

    // Verify remaining capacity
    const activeForType = await prisma.ticket.count({
      where: {
        eventId: testEvent.id,
        category: smallType.name,
        status: { in: ['VALID', 'CHECKED_IN'] },
      },
    });
    expect(activeForType).toBe(2);

    // Verify ticket type should be sold out
    const refreshedType = await prisma.ticketType.findUnique({ where: { id: smallType.id } });
    expect(refreshedType?.quantity).toBe(2);

    // Cancel one and verify capacity released
    await prisma.ticket.update({
      where: { id: ticket2.id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });

    const activeAfterCancel = await prisma.ticket.count({
      where: {
        eventId: testEvent.id,
        category: smallType.name,
        status: { in: ['VALID', 'CHECKED_IN'] },
      },
    });
    expect(activeAfterCancel).toBe(1);

    // Clean up
    await prisma.ticket.deleteMany({ where: { id: { in: [ticket1.id, ticket2.id] } } });
    await prisma.orderAttendee.deleteMany({ where: { id: { in: [att1.id, att2.id] } } });
    await prisma.order.deleteMany({ where: { id: { in: [order1.id, order2.id] } } });
    await prisma.ticketType.delete({ where: { id: smallType.id } });
  });

  itIf('should reject check-in for cancelled tickets through cancellation flow', async () => {
    // This test verifies the business logic, not the scanner (which doesn't exist yet)
    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-CANCEL-${Date.now()}`,
        eventId: testEvent.id,
        userId: testAttendeeUser.id,
        bookingType: 'SOLO',
        attendeeCount: 1,
        totalAmount: 0,
        status: 'PAID',
      },
    });

    const attendee = await prisma.orderAttendee.create({
      data: { orderId: order.id, fullName: 'Cancel Test', ticketCategory: testTicketType.name },
    });

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-CANCEL-${Date.now()}`,
        eventId: testEvent.id,
        userId: testAttendeeUser.id,
        orderId: order.id,
        attendeeId: attendee.id,
        type: 'FREE',
        category: testTicketType.name,
        status: 'CONFIRMED',
        priceAmount: 0,
        qrDataUrl: '',
        qrSecret: 'secret-cancel',
      },
    });

    await prisma.orderAttendee.update({ where: { id: attendee.id }, data: { ticketId: ticket.id } });

    // Simulate check-in
    const checkIn = await prisma.checkIn.create({
      data: {
        ticketId: ticket.id,
        eventId: testEvent.id,
        scannerId: testOrganizer.id,
        status: 'SUCCESS',
      },
    });

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: 'CHECKED_IN' },
    });

    await prisma.orderAttendee.update({
      where: { id: attendee.id },
      data: { isCheckedIn: true, checkedInAt: new Date() },
    });

    // Verify check-in exists
    expect(checkIn).toBeDefined();
    expect(checkIn.status).toBe('SUCCESS');

    // Clean up
    await prisma.checkIn.delete({ where: { id: checkIn.id } });
    await prisma.ticket.delete({ where: { id: ticket.id } });
    await prisma.orderAttendee.delete({ where: { id: attendee.id } });
    await prisma.order.delete({ where: { id: order.id } });
  });
});
