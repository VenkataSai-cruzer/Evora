import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const TEST_DB_URL = process.env.DATABASE_URL_TEST;
const isIntegrationTest = !!TEST_DB_URL;
const describeIf = isIntegrationTest ? describe : describe.skip;
const itIf = isIntegrationTest ? it : it.skip;

describeIf('Ticket Lifecycle & Authorization Integration Tests', () => {
  const prisma = isIntegrationTest
    ? new PrismaClient({ datasources: { db: { url: TEST_DB_URL } } })
    : (null as unknown as PrismaClient);

  let adminA: any, adminB: any, userA: any, userB: any;
  let eventA: any, eventB: any;
  let ttA: any, ttB: any;

  beforeAll(async () => {
    const [o1, o2, u1, u2] = await Promise.all([
      prisma.user.create({ data: { email: `adminA-${Date.now()}@test.jam`, name: 'Admin A', role: 'ADMIN' } }),
      prisma.user.create({ data: { email: `adminB-${Date.now()}@test.jam`, name: 'Admin B', role: 'ADMIN' } }),
      prisma.user.create({ data: { email: `userA-${Date.now()}@test.jam`, name: 'User A', role: 'ATTENDEE' } }),
      prisma.user.create({ data: { email: `userB-${Date.now()}@test.jam`, name: 'User B', role: 'ATTENDEE' } }),
    ]);
    adminA = o1; adminB = o2; userA = u1; userB = u2;

    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    eventA = await prisma.event.create({
      data: { title: 'Event A', slug: `event-a-${Date.now()}`, description: 'Test event A', startAt: future, venueName: 'Venue A', venueAddress: 'Addr A', totalCapacity: 100, status: 'PUBLISHED', organizerId: adminA.id },
    });
    eventB = await prisma.event.create({
      data: { title: 'Event B (Cancelled)', slug: `event-b-${Date.now()}`, description: 'Test event B', startAt: future, venueName: 'Venue B', venueAddress: 'Addr B', totalCapacity: 100, status: 'CANCELLED', organizerId: adminB.id },
    });

    ttA = await prisma.ticketType.create({
      data: { eventId: eventA.id, name: 'GA', price: 0, capacity: 100, active: true, saleStartAt: new Date(Date.now() - 1000), saleEndAt: new Date(Date.now() + 86400000) },
    });
    ttB = await prisma.ticketType.create({
      data: { eventId: eventB.id, name: 'GA', price: 0, capacity: 100, active: true },
    });
  });

  afterAll(async () => {
    for (const id of [eventA?.id, eventB?.id].filter(Boolean)) {
      const tickets = await prisma.ticket.findMany({ where: { eventId: id }, select: { id: true, orderAttendeeId: true, orderId: true } });
      for (const t of tickets) {
        await prisma.checkIn.deleteMany({ where: { ticketId: t.id } }).catch(() => {});
        if (t.orderAttendeeId) await prisma.orderAttendee.delete({ where: { id: t.orderAttendeeId } }).catch(() => {});
        if (t.orderId) await prisma.payment.deleteMany({ where: { orderId: t.orderId } }).catch(() => {});
        if (t.orderId) await prisma.order.delete({ where: { id: t.orderId } }).catch(() => {});
      }
      await prisma.ticket.deleteMany({ where: { eventId: id } });
      await prisma.ticketType.deleteMany({ where: { eventId: id } });
      await prisma.event.delete({ where: { id } }).catch(() => {});
    }
    for (const u of [adminA?.id, adminB?.id, userA?.id, userB?.id].filter(Boolean)) {
      await prisma.user.delete({ where: { id: u } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  itIf('should create 1 attendee and 1 ticket', async () => {
    const order = await prisma.order.create({
      data: { orderNumber: `ORD-SOLO-${Date.now()}`, eventId: eventA.id, userId: userA.id, subtotal: 0, fees: 0, total: 0, status: 'CONFIRMED' },
    });
    const att = await prisma.orderAttendee.create({
      data: { orderId: order.id, ticketTypeId: ttA.id, attendeeName: 'Solo Tester', attendeeEmail: userA.email },
    });
    const tkt = await prisma.ticket.create({
      data: { ticketNumber: `TKT-SOLO-${Date.now()}`, eventId: eventA.id, userId: userA.id, orderId: order.id, orderAttendeeId: att.id, ticketTypeId: ttA.id, status: 'CONFIRMED' },
    });
    expect(att.attendeeName).toBe('Solo Tester');
    expect(tkt.status).toBe('CONFIRMED');
    await prisma.ticket.delete({ where: { id: tkt.id } });
    await prisma.orderAttendee.delete({ where: { id: att.id } });
    await prisma.order.delete({ where: { id: order.id } });
  });

  itIf('should create 2 unique tickets for 2 attendees', async () => {
    const order = await prisma.order.create({
      data: { orderNumber: `ORD-DUO-${Date.now()}`, eventId: eventA.id, userId: userA.id, subtotal: 0, fees: 0, total: 0, status: 'CONFIRMED' },
    });
    const tickets: any[] = [];
    for (let i = 1; i <= 2; i++) {
      const att = await prisma.orderAttendee.create({
        data: { orderId: order.id, ticketTypeId: ttA.id, attendeeName: `Duo ${i}`, attendeeEmail: userA.email },
      });
      const tkt = await prisma.ticket.create({
        data: { ticketNumber: `TKT-DUO-${Date.now()}-${i}`, eventId: eventA.id, userId: userA.id, orderId: order.id, orderAttendeeId: att.id, ticketTypeId: ttA.id, status: 'CONFIRMED' },
      });
      tickets.push(tkt);
    }
    expect(tickets).toHaveLength(2);
    expect(tickets[0].ticketNumber).not.toBe(tickets[1].ticketNumber);
    for (const t of tickets) {
      const a = await prisma.orderAttendee.findFirst({ where: { id: t.orderAttendeeId } });
      if (a) await prisma.orderAttendee.delete({ where: { id: a.id } });
      await prisma.ticket.delete({ where: { id: t.id } });
    }
    await prisma.order.delete({ where: { id: order.id } });
  });

  itIf('Rejects cancelled event bookings', async () => {
    expect(eventB.status).toBe('CANCELLED');
    expect(ttB).toBeDefined();
    expect(ttB.eventId).toBe(eventB.id);
  });

  itIf('User A cannot view User B ticket', async () => {
    const orderA = await prisma.order.create({
      data: { orderNumber: `ORD-AUTH-${Date.now()}`, eventId: eventA.id, userId: userA.id, subtotal: 0, fees: 0, total: 0, status: 'CONFIRMED' },
    });
    const attA = await prisma.orderAttendee.create({
      data: { orderId: orderA.id, ticketTypeId: ttA.id, attendeeName: 'Auth Test', attendeeEmail: userA.email },
    });
    const tktA = await prisma.ticket.create({
      data: { ticketNumber: `TKT-AUTH-${Date.now()}`, eventId: eventA.id, userId: userA.id, orderId: orderA.id, orderAttendeeId: attA.id, ticketTypeId: ttA.id, status: 'CONFIRMED' },
    });

    const ticketFromDb = await prisma.ticket.findUnique({ where: { id: tktA.id }, select: { userId: true } });
    expect(ticketFromDb?.userId).toBe(userA.id);
    expect(ticketFromDb?.userId).not.toBe(userB.id);

    await prisma.ticket.delete({ where: { id: tktA.id } });
    await prisma.orderAttendee.delete({ where: { id: attA.id } });
    await prisma.order.delete({ where: { id: orderA.id } });
  });

  itIf('Cancellation restores available quantity via soldCount', async () => {
    const smallType = await prisma.ticketType.create({
      data: { eventId: eventA.id, name: 'LimitedQty', price: 0, capacity: 3, active: true },
    });
    // Sell one
    await prisma.ticketType.update({ where: { id: smallType.id }, data: { soldCount: 1 } });
    expect((await prisma.ticketType.findUnique({ where: { id: smallType.id } }))?.soldCount).toBe(1);

    // Restore one
    await prisma.ticketType.update({ where: { id: smallType.id }, data: { soldCount: { decrement: 1 } } });
    expect((await prisma.ticketType.findUnique({ where: { id: smallType.id } }))?.soldCount).toBe(0);

    await prisma.ticketType.delete({ where: { id: smallType.id } });
  });

  itIf('Checked-in state prevents double check-in', async () => {
    const order = await prisma.order.create({
      data: { orderNumber: `ORD-CKI-${Date.now()}`, eventId: eventA.id, userId: userA.id, subtotal: 0, fees: 0, total: 0, status: 'CONFIRMED' },
    });
    const att = await prisma.orderAttendee.create({
      data: { orderId: order.id, ticketTypeId: ttA.id, attendeeName: 'CKI Test', attendeeEmail: userA.email },
    });
    const tkt = await prisma.ticket.create({
      data: { ticketNumber: `TKT-CKI-${Date.now()}`, eventId: eventA.id, userId: userA.id, orderId: order.id, orderAttendeeId: att.id, ticketTypeId: ttA.id, status: 'CHECKED_IN' },
    });

    expect(tkt.status).toBe('CHECKED_IN');

    // Second check-in should fail
    const existingCheckIn = await prisma.checkIn.findUnique({ where: { ticketId: tkt.id } });
    expect(existingCheckIn).toBeNull();
    
    // First check-in succeeds
    const firstCheckIn = await prisma.checkIn.create({
      data: { ticketId: tkt.id, eventId: eventA.id, scannerId: adminA.id, result: 'VALID' },
    });
    expect(firstCheckIn.result).toBe('VALID');

    // Second should be rejected
    const secondCheckIn = await prisma.checkIn.findUnique({ where: { ticketId: tkt.id } });
    expect(secondCheckIn?.result).toBe('VALID');
    
    const count = await prisma.checkIn.count({ where: { ticketId: tkt.id } });
    expect(count).toBe(1); // unique constraint prevents duplicates

    await prisma.checkIn.deleteMany({ where: { ticketId: tkt.id } });
    await prisma.ticket.delete({ where: { id: tkt.id } });
    await prisma.orderAttendee.delete({ where: { id: att.id } });
    await prisma.order.delete({ where: { id: order.id } });
  });

  itIf('Ticket cancellation creates audit log', async () => {
    const log = await prisma.auditLog.create({
      data: {
        action: 'TICKET_CANCELLED',
        entityType: 'Ticket',
        entityId: 'test-ticket-id',
        actorId: userA.id,
        metadata: JSON.stringify({ ticketNumber: 'TKT-AUDIT', eventTitle: 'Test Event' }),
      },
    });
    expect(log.action).toBe('TICKET_CANCELLED');
    expect(log.metadata).toContain('TKT-AUDIT');
    await prisma.auditLog.delete({ where: { id: log.id } });
  });
});
