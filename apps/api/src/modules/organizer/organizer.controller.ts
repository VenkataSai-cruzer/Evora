import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../infrastructure/database/prisma.js';

// Categories that organizers can NEVER see regardless of assignment
const HIDDEN_CATEGORIES = ['COMPLIMENTARY', 'VIP', 'MEDIA', 'ARTIST', 'SPONSOR', 'STAFF', 'VOLUNTEER'];
// Visibility flag that is always hidden from organizers
const ADMIN_ONLY_VISIBILITY = 'ADMIN_ONLY';

/**
 * Check that the requesting organizer is assigned to the event.
 * Returns the assignment or throws if not.
 */
async function getOrganizerAssignment(organizerId: string, eventId: string) {
  const assignment = await prisma.organizerAssignment.findUnique({
    where: { organizerId_eventId: { organizerId, eventId } },
  });
  if (!assignment) throw Object.assign(new Error('Not assigned to this event'), { statusCode: 403 });
  return assignment;
}

export class OrganizerController {
  /**
   * GET /organizer/events
   * List only events this organizer is assigned to.
   */
  async listMyEvents(request: FastifyRequest, _reply: FastifyReply) {
    const organizerId = request.user!.id;
    const query = request.query as { page?: string; limit?: string };
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const skip = (page - 1) * limit;

    const assignments = await prisma.organizerAssignment.findMany({
      where: { organizerId },
      include: {
        event: {
          include: {
            ticketTypes: { select: { id: true, name: true, capacity: true, soldCount: true } },
            _count: { select: { orders: true, checkIns: true } },
          },
        },
      },
      skip,
      take: limit,
    });

    const total = await prisma.organizerAssignment.count({ where: { organizerId } });
    const events = assignments.map((a) => ({
      ...a.event,
      organizerPermissions: JSON.parse(a.permissions || '{}'),
    }));

    return { events, total, page, limit };
  }

  /**
   * GET /organizer/events/:eventId
   * Event detail — scoped to assigned organizer.
   */
  async getEvent(request: FastifyRequest, reply: FastifyReply) {
    const organizerId = request.user!.id;
    const { eventId } = request.params as { eventId: string };

    await getOrganizerAssignment(organizerId, eventId).catch(() =>
      reply.status(403).send({ error: 'Not assigned to this event' }),
    );

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        ticketTypes: { orderBy: { price: 'asc' } },
        branding: true,
        partners: { orderBy: { displayOrder: 'asc' } },
      },
    });

    if (!event) return reply.status(404).send({ error: 'Event not found' });
    return { event };
  }

  /**
   * GET /organizer/events/:eventId/attendees
   * Attendees list — EXCLUDES ADMIN_ONLY visibility tickets.
   * Never leaks complimentary/VIP/hidden category names or identities.
   */
  async listAttendees(request: FastifyRequest, reply: FastifyReply) {
    const organizerId = request.user!.id;
    const { eventId } = request.params as { eventId: string };

    await getOrganizerAssignment(organizerId, eventId).catch(() =>
      reply.status(403).send({ error: 'Not assigned to this event' }),
    );

    const query = request.query as { search?: string; page?: string; limit?: string };
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '50', 10);
    const skip = (page - 1) * limit;

    const baseWhere = {
      eventId,
      visibility: { not: ADMIN_ONLY_VISIBILITY },
      ticketCategory: { notIn: HIDDEN_CATEGORIES },
    };

    const where: Record<string, unknown> = { ...baseWhere };
    if (query.search) {
      where.AND = [
        { ...baseWhere },
        { OR: [{ attendeeName: { contains: query.search, mode: 'insensitive' } }, { ticketNumber: { contains: query.search, mode: 'insensitive' } }] },
      ];
    }

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          ticketType: { select: { name: true } },
          order: { select: { orderNumber: true } },
          checkIn: { select: { checkedInAt: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.ticket.count({ where }),
    ]);

    return { tickets, total, page, limit };
  }

  /**
   * GET /organizer/events/:eventId/attendees/export
   * CSV export — NEVER includes hidden/admin-only tickets.
   */
  async exportAttendees(request: FastifyRequest, reply: FastifyReply) {
    const organizerId = request.user!.id;
    const { eventId } = request.params as { eventId: string };

    await getOrganizerAssignment(organizerId, eventId).catch(() =>
      reply.status(403).send({ error: 'Not assigned to this event' }),
    );

    const tickets = await prisma.ticket.findMany({
      where: {
        eventId,
        visibility: { not: ADMIN_ONLY_VISIBILITY },
        ticketCategory: { notIn: HIDDEN_CATEGORIES },
      },
      include: { ticketType: { select: { name: true } }, checkIn: { select: { checkedInAt: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const csvHeader = 'Ticket Number,Attendee Name,Email,Ticket Type,Status,Checked In At\n';
    const csvRows = tickets.map((t) => [
      t.ticketNumber, t.attendeeName, t.attendeeEmail,
      t.ticketType.name, t.status, t.checkedInAt?.toISOString() || '',
    ].join(',')).join('\n');

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', `attachment; filename=attendees-${eventId}.csv`);
    return reply.send(csvHeader + csvRows);
  }

  /**
   * GET /organizer/events/:eventId/analytics
   * Safe aggregated stats — no hidden ticket breakdown.
   */
  async getAnalytics(request: FastifyRequest, reply: FastifyReply) {
    const organizerId = request.user!.id;
    const { eventId } = request.params as { eventId: string };

    await getOrganizerAssignment(organizerId, eventId).catch(() =>
      reply.status(403).send({ error: 'Not assigned to this event' }),
    );

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { totalCapacity: true, title: true },
    });

    if (!event) return reply.status(404).send({ error: 'Event not found' });

    // Visible tickets only
    const visibleCount = await prisma.ticket.count({
      where: { eventId, visibility: { not: ADMIN_ONLY_VISIBILITY }, ticketCategory: { notIn: HIDDEN_CATEGORIES } },
    });

    // Total occupancy (includes hidden — safe to aggregate without breakdown)
    const totalConfirmed = await prisma.ticket.count({ where: { eventId, status: { in: ['CONFIRMED', 'CHECKED_IN'] } } });
    const totalCheckedIn = await prisma.ticket.count({ where: { eventId, status: 'CHECKED_IN' } });

    const pendingOrders = await prisma.order.count({ where: { eventId, status: 'PENDING_PAYMENT' } });
    const confirmedOrders = await prisma.order.count({ where: { eventId, status: 'CONFIRMED' } });

    return {
      eventTitle: event.title,
      totalCapacity: event.totalCapacity,
      // Safe aggregated occupancy (does not reveal hidden ticket count or breakdown)
      totalExpectedAttendance: totalConfirmed,
      totalCheckedIn,
      // Only visible paid ticket count
      visibleTickets: visibleCount,
      pendingOrders,
      confirmedOrders,
    };
  }
}
