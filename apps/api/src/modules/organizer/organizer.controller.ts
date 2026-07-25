import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../infrastructure/database/prisma.js';
import { finalizeApprovedOrder } from '../orders/order-finalization.service.js';
import { writeAuditLog } from '../../infrastructure/audit/audit.service.js';
import {
  sendTelegramAdminAlert,
} from '../../infrastructure/email/email.service.js';

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

    try {
      await getOrganizerAssignment(organizerId, eventId);
    } catch {
      return reply.status(403).send({ error: 'Not assigned to this event' });
    }

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

    try {
      await getOrganizerAssignment(organizerId, eventId);
    } catch {
      return reply.status(403).send({ error: 'Not assigned to this event' });
    }

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

    try {
      await getOrganizerAssignment(organizerId, eventId);
    } catch {
      return reply.status(403).send({ error: 'Not assigned to this event' });
    }

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

    try {
      await getOrganizerAssignment(organizerId, eventId);
    } catch {
      return reply.status(403).send({ error: 'Not assigned to this event' });
    }

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

  // ── Event Booking Controls (event-scoped via assignment) ──

  /**
   * GET /organizer/events/:eventId/ticket-types
   * List ticket types for an assigned event.
   */
  async listTicketTypes(request: FastifyRequest, reply: FastifyReply) {
    const organizerId = request.user!.id;
    const { eventId } = request.params as { eventId: string };
    try { await getOrganizerAssignment(organizerId, eventId); }
    catch { return reply.status(403).send({ error: 'Not assigned to this event' }); }

    const ticketTypes = await prisma.ticketType.findMany({
      where: { eventId },
      orderBy: { price: 'asc' },
    });
    return { ticketTypes };
  }

  /**
   * PATCH /organizer/events/:eventId/ticket-types/:ticketTypeId
   * Update price, capacity, maxPerOrder, active, description for an assigned event.
   * soldCount is read-only — never accept it from the request body.
   */
  async updateTicketType(request: FastifyRequest, reply: FastifyReply) {
    const organizerId = request.user!.id;
    const { eventId, ticketTypeId } = request.params as { eventId: string; ticketTypeId: string };
    try { await getOrganizerAssignment(organizerId, eventId); }
    catch { return reply.status(403).send({ error: 'Not assigned to this event' }); }

    // Verify ticket type belongs to this event
    const existing = await prisma.ticketType.findUnique({ where: { id: ticketTypeId } });
    if (!existing || existing.eventId !== eventId) {
      return reply.status(404).send({ error: 'Ticket type not found for this event' });
    }

    const body = request.body as {
      name?: string;
      description?: string;
      price?: number;
      capacity?: number;
      maxPerOrder?: number;
      active?: boolean;
    };

    // Whitelist — never let organizer change soldCount, eventId, id
    const allowed: Record<string, unknown> = {};
    if (body.name !== undefined) allowed.name = body.name;
    if (body.description !== undefined) allowed.description = body.description;
    if (body.price !== undefined) {
      if (typeof body.price !== 'number' || body.price < 0) {
        return reply.status(400).send({ error: 'price must be a non-negative number (in paise)' });
      }
      allowed.price = body.price;
    }
    if (body.capacity !== undefined) {
      if (typeof body.capacity !== 'number' || body.capacity < existing.soldCount) {
        return reply.status(400).send({
          error: `capacity cannot be less than tickets already sold (${existing.soldCount})`,
        });
      }
      allowed.capacity = body.capacity;
    }
    if (body.maxPerOrder !== undefined) allowed.maxPerOrder = body.maxPerOrder;
    if (body.active !== undefined) allowed.active = body.active;

    if (Object.keys(allowed).length === 0) {
      return reply.status(400).send({ error: 'No valid fields to update' });
    }

    const ticketType = await prisma.ticketType.update({
      where: { id: ticketTypeId },
      data: allowed,
    });

    await writeAuditLog('TICKET_TYPE_UPDATED' as any, 'TicketType', ticketTypeId, {
      actorId: organizerId,
      actorRole: 'ORGANIZER',
      eventId,
      metadata: { changes: allowed },
    });

    return { ticketType };
  }

  /**
   * POST /organizer/events/:eventId/pause-sales
   * Temporarily pause ticket sales for the event.
   */
  async pauseSales(request: FastifyRequest, reply: FastifyReply) {
    const organizerId = request.user!.id;
    const { eventId } = request.params as { eventId: string };
    try { await getOrganizerAssignment(organizerId, eventId); }
    catch { return reply.status(403).send({ error: 'Not assigned to this event' }); }

    await prisma.event.update({ where: { id: eventId }, data: { salesPaused: true } });

    await writeAuditLog('EVENT_PAUSED', 'Event', eventId, {
      actorId: organizerId, actorRole: 'ORGANIZER', eventId,
    });

    return reply.send({ success: true, message: 'Sales paused. No new bookings will be accepted.' });
  }

  /**
   * POST /organizer/events/:eventId/resume-sales
   * Resume ticket sales after a pause.
   */
  async resumeSales(request: FastifyRequest, reply: FastifyReply) {
    const organizerId = request.user!.id;
    const { eventId } = request.params as { eventId: string };
    try { await getOrganizerAssignment(organizerId, eventId); }
    catch { return reply.status(403).send({ error: 'Not assigned to this event' }); }

    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { status: true } });
    if (!event) return reply.status(404).send({ error: 'Event not found' });
    if (event.status !== 'PUBLISHED') {
      return reply.status(409).send({ error: 'Event must be PUBLISHED to resume sales.' });
    }

    await prisma.event.update({ where: { id: eventId }, data: { salesPaused: false } });

    await writeAuditLog('EVENT_RESUMED', 'Event', eventId, {
      actorId: organizerId, actorRole: 'ORGANIZER', eventId,
    });

    return reply.send({ success: true, message: 'Sales resumed. Bookings are now open.' });
  }

  /**
   * POST /organizer/events/:eventId/mark-sold-out
   * Manually mark an assigned event as sold out.
   * Sets bookingClosed = true to block new bookings.
   */
  async markSoldOut(request: FastifyRequest, reply: FastifyReply) {
    const organizerId = request.user!.id;
    const { eventId } = request.params as { eventId: string };

    try {
      await getOrganizerAssignment(organizerId, eventId);
    } catch {
      return reply.status(403).send({ error: 'Not assigned to this event' });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true, title: true, bookingClosed: true } });
    if (!event) return reply.status(404).send({ error: 'Event not found' });

    if (event.bookingClosed) {
      return reply.send({ success: true, message: 'Event is already marked as sold out/closed.' });
    }

    await prisma.event.update({ where: { id: eventId }, data: { bookingClosed: true } });

    await writeAuditLog('EVENT_MARKED_SOLD_OUT', 'Event', eventId, {
      actorId: request.user!.id, actorRole: 'ORGANIZER', eventId,
    });

    return reply.send({ success: true, message: 'Event marked as sold out. New bookings blocked.' });
  }

  /**
   * POST /organizer/events/:eventId/reopen-booking
   * Reopen booking for a manually closed/sold-out event.
   */
  async reopenBooking(request: FastifyRequest, reply: FastifyReply) {
    const organizerId = request.user!.id;
    const { eventId } = request.params as { eventId: string };

    try {
      await getOrganizerAssignment(organizerId, eventId);
    } catch {
      return reply.status(403).send({ error: 'Not assigned to this event' });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { ticketTypes: { select: { id: true, capacity: true, soldCount: true } } },
    });
    if (!event) return reply.status(404).send({ error: 'Event not found' });

    // Check remaining capacity across all ticket types
    const totalRemaining = event.ticketTypes.reduce((sum, tt) => {
      if (tt.capacity <= 0) return sum;
      return sum + Math.max(0, tt.capacity - tt.soldCount);
    }, 0);

    const hasCapacityTypes = event.ticketTypes.some((tt) => tt.capacity > 0);
    if (hasCapacityTypes && totalRemaining <= 0) {
      return reply.status(409).send({
        error: 'Booking cannot be reopened because no tickets remain.',
        remainingCapacity: 0,
      });
    }

    if (event.status !== 'PUBLISHED') {
      return reply.status(409).send({ error: 'Event must be PUBLISHED to reopen booking.' });
    }

    if (event.salesEndAt && event.salesEndAt < new Date()) {
      return reply.status(409).send({
        error: 'Booking cannot be reopened because the booking period has ended.',
      });
    }

    if (!event.bookingClosed && !event.salesPaused) {
      return reply.send({ success: true, message: 'Booking is already open.' });
    }

    await prisma.event.update({ where: { id: eventId }, data: { bookingClosed: false, salesPaused: false } });

    await writeAuditLog('EVENT_REOPENED', 'Event', eventId, {
      actorId: request.user!.id, actorRole: 'ORGANIZER', eventId,
    });

    return reply.send({ success: true, message: 'Booking reopened. Public status set to LIVE.' });
  }

  // ── Ticket Detail (organizer-scoped) ─────────────────────

  /**
   * GET /organizer/tickets/:ticketNumber
   * Full ticket detail — same rich data as admin, but scoped to the organizer's assigned events.
   */
  async getTicket(request: FastifyRequest, reply: FastifyReply) {
    const organizerId = request.user!.id;
    const { ticketNumber } = request.params as { ticketNumber: string };

    const ticket = await prisma.ticket.findUnique({
      where: { ticketNumber },
      include: {
        event: {
          select: {
            id: true, title: true, slug: true, posterObjectKey: true,
            startAt: true, endAt: true, venueName: true, venueAddress: true,
            mapUrl: true, status: true, organizerId: true,
            organizer: { select: { id: true, name: true } },
          },
        },
        ticketType: { select: { id: true, name: true, price: true, currency: true } },
        order: { select: { id: true, orderNumber: true, status: true, total: true } },
        attendee: { select: { id: true, attendeeName: true, attendeeEmail: true } },
        checkIn: { select: { checkedInAt: true, result: true, scannerId: true, gateName: true } },
        user: { select: { id: true, name: true, email: true } },
        issuedBy: { select: { name: true } },
      },
    });

    if (!ticket) {
      return reply.status(404).send({ error: 'Ticket not found' });
    }

    // Verify organizer is assigned to this ticket's event
    try {
      await getOrganizerAssignment(organizerId, ticket.eventId);
    } catch {
      return reply.status(403).send({ error: 'Not assigned to this event' });
    }

    // Hide ADMIN_ONLY visibility tickets from organizers
    if (ticket.visibility === ADMIN_ONLY_VISIBILITY) {
      return reply.status(403).send({ error: 'Not authorized to view this ticket' });
    }

    return { ticket };
  }

  /**
   * GET /organizer/orders/:id
   * Order detail by internal ID (not order number) — scoped to organizer's events.
   */
  async getOrderById(request: FastifyRequest, reply: FastifyReply) {
    const organizerId = request.user!.id;
    const { id } = request.params as { id: string };

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        event: { select: { id: true, title: true, slug: true, startAt: true, venueName: true } },
        attendees: {
          include: { ticketType: { select: { name: true, price: true } } },
        },
        tickets: {
          select: { id: true, ticketNumber: true, ticketCategory: true, status: true },
        },
        paymentProof: true,
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!order) return reply.status(404).send({ error: 'Order not found' });

    // Verify organizer is assigned to the event
    try {
      await getOrganizerAssignment(organizerId, order.eventId);
    } catch {
      return reply.status(403).send({ error: 'Not assigned to this event' });
    }

    return { order };
  }

  // ── Check-in Stats (live widget, organizer-scoped) ───────

  /**
   * GET /organizer/events/:eventId/checkin-stats
   * Returns real-time check-in stats for the event dashboard widget.
   * Scoped to assigned organizer events only.
   */
  async getCheckinStats(request: FastifyRequest, reply: FastifyReply) {
    const organizerId = request.user!.id;
    const { eventId } = request.params as { eventId: string };

    try {
      await getOrganizerAssignment(organizerId, eventId);
    } catch {
      return reply.status(403).send({ error: 'Not assigned to this event' });
    }

    // Aggregate check-in stats — includes all tickets (visible + admin-only)
    // because the total counts are safe aggregated stats
    const [totalTickets, checkedIn] = await Promise.all([
      prisma.ticket.count({
        where: { eventId, status: { in: ['CONFIRMED', 'CHECKED_IN'] } },
      }),
      prisma.ticket.count({
        where: { eventId, status: 'CHECKED_IN' },
      }),
    ]);

    // Aggregate capacity
    const ticketTypes = await prisma.ticketType.findMany({
      where: { eventId },
      select: { capacity: true, soldCount: true },
    });

    const totalCapacity = ticketTypes.reduce((sum, tt) => sum + (tt.capacity > 0 ? tt.capacity : 0), 0);
    const totalSold = ticketTypes.reduce((sum, tt) => sum + tt.soldCount, 0);

    return {
      totalTickets,
      checkedIn,
      remaining: totalTickets - checkedIn,
      totalCapacity: totalCapacity || null,
      totalSold,
      hasCapacityTypes: ticketTypes.some((tt) => tt.capacity > 0),
    };
  }

  // ── Organizer Dashboard Stats (event-scoped, no global data) ──

  /**
   * GET /organizer/stats
   * Returns aggregate counts for ONLY the organizer's assigned events.
   * Never returns platform-wide data.
   */
  async getStats(request: FastifyRequest, _reply: FastifyReply) {
    const organizerId = request.user!.id;

    // Get assigned event IDs
    const assignments = await prisma.organizerAssignment.findMany({
      where: { organizerId },
      select: { eventId: true },
    });
    const eventIds = assignments.map((a) => a.eventId);

    if (eventIds.length === 0) {
      return {
        totalEvents: 0,
        liveEvents: 0,
        pausedEvents: 0,
        totalOrders: 0,
        confirmedOrders: 0,
        totalTickets: 0,
        checkedInTickets: 0,
        pendingVerifications: 0,
      };
    }

    const [
      totalEvents,
      liveEvents,
      pausedEvents,
      totalOrders,
      confirmedOrders,
      totalTickets,
      checkedInTickets,
      pendingVerifications,
    ] = await Promise.all([
      prisma.event.count({ where: { id: { in: eventIds } } }),
      prisma.event.count({ where: { id: { in: eventIds }, status: 'PUBLISHED' } }),
      prisma.event.count({ where: { id: { in: eventIds }, salesPaused: true } }),
      prisma.order.count({ where: { eventId: { in: eventIds } } }),
      prisma.order.count({ where: { eventId: { in: eventIds }, status: 'CONFIRMED' } }),
      prisma.ticket.count({ where: { eventId: { in: eventIds }, status: { in: ['CONFIRMED', 'CHECKED_IN'] } } }),
      prisma.ticket.count({ where: { eventId: { in: eventIds }, status: 'CHECKED_IN' } }),
      prisma.order.count({ where: { eventId: { in: eventIds }, status: { in: ['PENDING_PAYMENT', 'PENDING_VERIFICATION'] } } }),
    ]);

    return {
      totalEvents,
      liveEvents,
      pausedEvents,
      totalOrders,
      confirmedOrders,
      totalTickets,
      checkedInTickets,
      pendingVerifications,
    };
  }

  // ── Payment Verification (Organizer-scoped) ────────────

  /**
   * GET /organizer/verifications
   * List pending orders for all events assigned to this organizer.
   */
  async listVerifications(request: FastifyRequest, _reply: FastifyReply) {
    const organizerId = request.user!.id;
    const query = request.query as { status?: string; eventId?: string; page?: string; limit?: string };
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const skip = (page - 1) * limit;

    // Get the organizer's assigned event IDs
    const assignments = await prisma.organizerAssignment.findMany({
      where: { organizerId },
      select: { eventId: true },
    });

    const assignedEventIds = assignments.map((a) => a.eventId);

    if (assignedEventIds.length === 0) {
      return { orders: [], total: 0, page, limit };
    }

    const where: Record<string, unknown> = {
      eventId: { in: assignedEventIds },
    };

    if (query.status) {
      where.status = query.status;
    } else {
      // Default: show orders needing attention
      where.status = { in: ['PENDING_PAYMENT', 'PENDING_VERIFICATION'] };
    }

    if (query.eventId) {
      // Verify this event is actually assigned to the organizer
      if (!assignedEventIds.includes(query.eventId)) {
        return _reply.status(403).send({ error: 'Not assigned to this event' });
      }
      where.eventId = query.eventId;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          event: { select: { id: true, title: true, slug: true } },
          attendees: {
            include: { ticketType: { select: { name: true, price: true } } },
          },
          paymentProof: {
            select: {
              id: true,
              utrNumber: true,
              amount: true,
              status: true,
              submittedAt: true,
              rejectionReason: true,
              mimeType: true,
            },
          },
          payments: {
            where: { method: 'utr' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return { orders, total, page, limit };
  }

  /**
   * GET /organizer/verifications/:orderNumber
   * Full order detail — scoped to organizer's assigned events.
   */
  async getVerificationOrder(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    const organizerId = request.user!.id;
    const { orderNumber } = request.params as { orderNumber: string };

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        event: {
          select: { id: true, title: true, slug: true, startAt: true, venueName: true },
        },
        attendees: {
          include: { ticketType: { select: { name: true, price: true } } },
        },
        tickets: {
          select: { id: true, ticketNumber: true, ticketCategory: true, status: true },
        },
        paymentProof: true,
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!order) return reply.status(404).send({ error: 'Order not found' });

    // Verify organizer is assigned to the event
    try {
      await getOrganizerAssignment(organizerId, order.eventId);
    } catch {
      return reply.status(403).send({ error: 'Not assigned to this event' });
    }

    return { order };
  }

  /**
   * POST /organizer/orders/:orderNumber/approve
   * Approve payment — organizer-scoped to assigned events.
   */
  async approveOrder(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    const organizerId = request.user!.id;
    const { orderNumber } = request.params as { orderNumber: string };
    const body = request.body as { expectedProofUpdatedAt?: string } | undefined;

    try {
      const order = await prisma.order.findUnique({
        where: { orderNumber },
        include: { paymentProof: true },
      });

      if (!order) return reply.status(404).send({ error: 'Order not found' });

      // Verify organizer is assigned to the event
      await getOrganizerAssignment(organizerId, order.eventId).catch(() => {
        throw Object.assign(new Error('Not assigned to this event'), { statusCode: 403 });
      });

      if (order.paymentProof && order.paymentProof.status !== 'PENDING') {
        return reply.status(409).send({
          error: 'Conflict: This payment has already been reviewed.',
          currentStatus: order.paymentProof.status,
        });
      }

      if (
        body?.expectedProofUpdatedAt &&
        order.paymentProof &&
        order.paymentProof.updatedAt.toISOString() !== body.expectedProofUpdatedAt
      ) {
        return reply.status(409).send({
          error: 'Conflict: This payment has been modified since you loaded it. Please refresh.',
        });
      }

      const result = await finalizeApprovedOrder(
        order.id,
        organizerId,
        'MANUAL_ADMIN',
        undefined,
        undefined,
        request.ip,
        request.headers['user-agent'],
      );

      return reply.send({
        success: true,
        message: `Payment approved. ${result.ticketsCreated} ticket(s) generated.`,
        data: {
          orderNumber: result.orderNumber,
          ticketsCreated: result.ticketsCreated,
          ticketNumbers: result.ticketNumbers,
        },
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 400;
      const message = error.message || 'Unknown error';
      return reply.status(statusCode).send({ error: 'Approval failed', message });
    }
  }

  /**
   * POST /organizer/orders/:orderNumber/reject
   * Reject payment — organizer-scoped to assigned events.
   */
  async rejectOrder(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    const organizerId = request.user!.id;
    const { orderNumber } = request.params as { orderNumber: string };
    const body = request.body as { reason: string };

    if (!body?.reason?.trim()) {
      return reply.status(400).send({ error: 'Rejection reason is required' });
    }

    try {
      const order = await prisma.order.findUnique({
        where: { orderNumber },
        include: {
          event: true,
          payments: { where: { status: 'PENDING' }, orderBy: { createdAt: 'desc' }, take: 1 },
          paymentProof: true,
        },
      });

      if (!order) return reply.status(404).send({ error: 'Order not found' });

      // Verify organizer is assigned to the event
      await getOrganizerAssignment(organizerId, order.eventId).catch(() => {
        throw Object.assign(new Error('Not assigned to this event'), { statusCode: 403 });
      });

      const validStates = ['PENDING_PAYMENT', 'PENDING_VERIFICATION'];
      if (!validStates.includes(order.status)) {
        return reply.status(400).send({
          error: `Order is "${order.status}" — can only reject orders in PENDING_PAYMENT or PENDING_VERIFICATION`,
        });
      }

      await prisma.$transaction(async (tx) => {
        if (order.payments[0]) {
          await tx.payment.update({ where: { id: order.payments[0].id }, data: { status: 'FAILED' } });
        }
        if (order.paymentProof) {
          await tx.paymentProof.update({
            where: { orderId: order.id },
            data: { status: 'REJECTED', rejectionReason: body.reason, reviewedAt: new Date(), reviewedById: organizerId },
          });
        }

        // Release reserved capacity that was consumed at booking creation
        const attendees = await tx.orderAttendee.findMany({
          where: { orderId: order.id },
          select: { ticketTypeId: true },
        });
        const typeCounts = new Map<string, number>();
        for (const a of attendees) {
          typeCounts.set(a.ticketTypeId, (typeCounts.get(a.ticketTypeId) || 0) + 1);
        }
        for (const [ticketTypeId, quantity] of typeCounts) {
          const tt = await tx.ticketType.findUnique({ where: { id: ticketTypeId } });
          if (tt) {
            await tx.ticketType.update({
              where: { id: ticketTypeId },
              data: { soldCount: Math.max(0, tt.soldCount - quantity) },
            });
          }
        }

        await tx.order.update({ where: { id: order.id }, data: { status: 'REJECTED' } });
      });

      await writeAuditLog('PAYMENT_REJECTED', 'Order', order.id, {
        actorId: organizerId, actorRole: 'ORGANIZER', eventId: order.eventId,
        ipAddress: request.ip, metadata: { reason: body.reason, orderNumber: order.orderNumber },
      });

      sendTelegramAdminAlert(
        `❌ <b>Payment Rejected</b> (by Organizer)\nOrder: <code>${order.orderNumber}</code>\nReason: ${body.reason}`,
      ).catch(console.error);

      return reply.send({ success: true, message: `Payment rejected: ${body.reason} — user can resubmit proof.` });
    } catch (error: any) {
      const statusCode = error.statusCode || 400;
      const message = error.message || 'Unknown error';
      return reply.status(statusCode).send({ error: 'Rejection failed', message });
    }
  }

  /**
   * POST /organizer/orders/:orderNumber/request-resubmission
   */
  async requestVerificationResubmission(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    const organizerId = request.user!.id;
    const { orderNumber } = request.params as { orderNumber: string };
    const body = request.body as { message?: string };

    try {
      const order = await prisma.order.findUnique({
        where: { orderNumber },
        include: { paymentProof: true },
      });

      if (!order) return reply.status(404).send({ error: 'Order not found' });

      // Verify organizer is assigned to the event
      try {
        await getOrganizerAssignment(organizerId, order.eventId);
      } catch {
        return reply.status(403).send({ error: 'Not assigned to this event' });
      }

      if (order.paymentProof) {
        await prisma.paymentProof.update({
          where: { orderId: order.id },
          data: {
            status: 'RESUBMISSION_REQUESTED',
            rejectionReason:
              body.message ?? 'Please resubmit your payment proof',
            reviewedAt: new Date(),
            reviewedById: organizerId,
          },
        });
      }

      await writeAuditLog('PAYMENT_RESUBMISSION_REQUESTED', 'Order', order.id, {
        actorId: organizerId,
        actorRole: 'ORGANIZER',
        eventId: order.eventId,
        metadata: { message: body.message },
      });

      return { success: true, message: 'Resubmission requested' };
    } catch (error: any) {
      const statusCode = error.statusCode || 400;
      const message = error.message || 'Unknown error';
      return reply.status(statusCode).send({ error: 'Request failed', message });
    }
  }
}
