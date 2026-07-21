import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const TEST_DB_URL = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;
const isIntegrationTest = !!process.env.DATABASE_URL_TEST;
const describeIf = isIntegrationTest ? describe : describe.skip;
const itIf = isIntegrationTest ? it : it.skip;

describeIf('Ticket Registration Integration Tests', () => {
  const prisma = new PrismaClient({
    datasources: { db: { url: TEST_DB_URL } },
  });

  let testAdmin: any;
  let testEvent: any;
  let testTicketType: any;
  let testAttendeeUser: any;

  beforeAll(async () => {
    const pw = await hash('test1234', 12);

    testAdmin = await prisma.user.create({
      data: {
        email: `admin-test-${Date.now()}@jamming.test`,
        name: 'Test Admin',
        passwordHash: pw,
        role: 'ADMIN',
      },
    });

    testAttendeeUser = await prisma.user.create({
      data: {
        email: `attendee-test-${Date.now()}@jamming.test`,
        name: 'Test Attendee',
        passwordHash: pw,
        role: 'ATTENDEE',
      },
    });

    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    testEvent = await prisma.event.create({
      data: {
        title: 'Test Integration Event',
        slug: `test-event-${Date.now()}`,
        description: 'Integration test event.',
        startAt: futureDate,
        venueName: 'Test Venue',
        venueAddress: '123 Test St',
        totalCapacity: 50,
        status: 'PUBLISHED',
        organizerId: testAdmin.id,
      },
    });

    testTicketType = await prisma.ticketType.create({
      data: {
        eventId: testEvent.id,
        name: 'General Admission',
        price: 0,
        capacity: 10,
        maxPerOrder: 10,
        active: true,
      },
    });
  });

  afterAll(async () => {
    if (testTicketType?.id) {
      const tickets = await prisma.ticket.findMany({
        where: { eventId: testEvent.id },
        select: { id: true, orderAttendeeId: true, orderId: true },
      });
      for (const t of tickets) {
        if (t.orderAttendeeId) await prisma.orderAttendee.delete({ where: { id: t.orderAttendeeId } }).catch(() => {});
        if (t.orderId) {
          await prisma.payment.deleteMany({ where: { orderId: t.orderId } });
          await prisma.order.delete({ where: { id: t.orderId } }).catch(() => {});
        }
      }
      await prisma.ticket.deleteMany({ where: { eventId: testEvent.id } });
      await prisma.ticketType.deleteMany({ where: { eventId: testEvent.id } });
    }
    if (testEvent?.id) await prisma.event.delete({ where: { id: testEvent.id } }).catch(() => {});
    if (testAdmin?.id) await prisma.user.delete({ where: { id: testAdmin.id } }).catch(() => {});
    if (testAttendeeUser?.id) await prisma.user.delete({ where: { id: testAttendeeUser.id } }).catch(() => {});
    await prisma.$disconnect();
  });

  itIf('should create one attendee and one ticket', async () => {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber: `ORD-TEST-${Date.now()}`,
          eventId: testEvent.id,
          userId: testAttendeeUser.id,
          subtotal: 0,
          fees: 0,
          total: 0,
          status: 'CONFIRMED',
        },
      });

      const attendee = await tx.orderAttendee.create({
        data: {
          orderId: order.id,
          ticketTypeId: testTicketType.id,
          attendeeName: 'Solo Tester',
          attendeeEmail: testAttendeeUser.email,
        },
      });

      const ticket = await tx.ticket.create({
        data: {
          ticketNumber: `TKT-SOLO-${Date.now()}`,
          eventId: testEvent.id,
          userId: testAttendeeUser.id,
          orderId: order.id,
          orderAttendeeId: attendee.id,
          ticketTypeId: testTicketType.id,
          status: 'CONFIRMED',
        },
      });

      return { order, attendee, ticket };
    });

    expect(result.order).toBeDefined();
    expect(result.attendee).toBeDefined();
    expect(result.attendee.attendeeName).toBe('Solo Tester');
    expect(result.ticket).toBeDefined();
    expect(result.ticket.status).toBe('CONFIRMED');

    await prisma.ticket.delete({ where: { id: result.ticket.id } });
    await prisma.orderAttendee.delete({ where: { id: result.attendee.id } });
    await prisma.order.delete({ where: { id: result.order.id } });
  });

  itIf('should create two tickets with unique ticket numbers', async () => {
    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-DUO-${Date.now()}`,
        eventId: testEvent.id,
        userId: testAttendeeUser.id,
        subtotal: 0, fees: 0, total: 0,
        status: 'CONFIRMED',
      },
    });

    const tickets = [];
    for (let i = 1; i <= 2; i++) {
      const attendee = await prisma.orderAttendee.create({
        data: {
          orderId: order.id,
          ticketTypeId: testTicketType.id,
          attendeeName: `Duo Tester ${i}`,
          attendeeEmail: testAttendeeUser.email,
        },
      });

      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-DUO-${Date.now()}-${i}`,
          eventId: testEvent.id,
          userId: testAttendeeUser.id,
          orderId: order.id,
          orderAttendeeId: attendee.id,
          ticketTypeId: testTicketType.id,
          status: 'CONFIRMED',
        },
      });

      tickets.push(ticket);
    }

    expect(tickets).toHaveLength(2);
    expect(tickets[0].ticketNumber).not.toBe(tickets[1].ticketNumber);

    for (const t of tickets) {
      const a = await prisma.orderAttendee.findFirst({ where: { id: t.orderAttendeeId! } });
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
        price: 0,
        capacity: 2,
        maxPerOrder: 2,
        active: true,
      },
    });

    const order1 = await prisma.order.create({
      data: { orderNumber: `ORD-LIM-${Date.now()}`, eventId: testEvent.id, userId: testAttendeeUser.id, subtotal: 0, fees: 0, total: 0, status: 'CONFIRMED' },
    });

    const att1 = await prisma.orderAttendee.create({
      data: { orderId: order1.id, ticketTypeId: smallType.id, attendeeName: 'Cap Test 1' },
    });

    const ticket1 = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-LIM-${Date.now()}-1`, eventId: testEvent.id, userId: testAttendeeUser.id,
        orderId: order1.id, orderAttendeeId: att1.id, ticketTypeId: smallType.id, status: 'CONFIRMED',
      },
    });

    // Update sold count
    await prisma.ticketType.update({ where: { id: smallType.id }, data: { soldCount: 1 } });

    const soldCount = await prisma.ticketType.findUnique({ where: { id: smallType.id } });
    expect(soldCount?.soldCount).toBe(1);

    await prisma.ticket.delete({ where: { id: ticket1.id } });
    await prisma.orderAttendee.delete({ where: { id: att1.id } });
    await prisma.order.delete({ where: { id: order1.id } });
    await prisma.ticketType.delete({ where: { id: smallType.id } });
  });

  itIf('should reject check-in for cancelled tickets', async () => {
    const order = await prisma.order.create({
      data: { orderNumber: `ORD-CANCEL-${Date.now()}`, eventId: testEvent.id, userId: testAttendeeUser.id, subtotal: 0, fees: 0, total: 0, status: 'CONFIRMED' },
    });

    const attendee = await prisma.orderAttendee.create({
      data: { orderId: order.id, ticketTypeId: testTicketType.id, attendeeName: 'Cancel Test' },
    });

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-CANCEL-${Date.now()}`, eventId: testEvent.id, userId: testAttendeeUser.id,
        orderId: order.id, orderAttendeeId: attendee.id, ticketTypeId: testTicketType.id, status: 'CONFIRMED',
      },
    });

    // Simulate check-in
    const checkIn = await prisma.checkIn.create({
      data: { ticketId: ticket.id, eventId: testEvent.id, scannerId: testAdmin.id, result: 'VALID' },
    });

    await prisma.ticket.update({ where: { id: ticket.id }, data: { status: 'CHECKED_IN' } });

    expect(checkIn).toBeDefined();
    expect(checkIn.result).toBe('VALID');

    await prisma.checkIn.delete({ where: { id: checkIn.id } });
    await prisma.ticket.delete({ where: { id: ticket.id } });
    await prisma.orderAttendee.delete({ where: { id: attendee.id } });
    await prisma.order.delete({ where: { id: order.id } });
  });
});
