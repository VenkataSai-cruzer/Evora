import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../infrastructure/database/prisma.js';
import { finalizeApprovedOrder } from '../orders/order-finalization.service.js';
import { writeAuditLog } from '../../infrastructure/audit/audit.service.js';
import {
  sendPaymentRejectedEmail,
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

/**
 * Reuse shared reject logic for organizers.
 * Must be called after verifying the organizer is assigned to the order's event.
 */
async function organizerRejectOrder(
  tx: any,
  order: any,
  organizerId: string,
  reason: string,
) {
  if (order.payments[0]) {
    await tx.payment.update({ where: { id: order.payments[0].id }, data: { status: 'FAILED' } });
  }
  if (order.paymentProof) {
    await tx.paymentProof.update({
      where: { orderId: order.id },
      data: { status: 'REJECTED', rejectionReason: reason, reviewedAt: new Date(), reviewedById: organizerId },
    });
  }
  await tx.order.update({
    where: { id: order.id },
    data: { status: 'REJECTED' },
  });
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
   * POST /organizer/verifications/:orderNumber/approve
   * Approve payment for an order — reuses finalizeApprovedOrder service.
   */
  async approveVerification(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    const organizerId = request.user!.id;
    const { orderNumber } = request.params as { orderNumber: string };
    const body = request.body as { expectedProofUpdatedAt?: string } | undefined;

    try {
      // Get the order
      const order = await prisma.order.findUnique({
        where: { orderNumber },
        include: { paymentProof: true },
      });

      if (!order) return reply.status(404).send({ error: 'Order not found' });

      // Verify organizer is assigned to the event
      await getOrganizerAssignment(organizerId, order.eventId).catch(() => {
        throw Object.assign(new Error('Not assigned to this event'), {
          statusCode: 403,
        });
      });

      // Optimistic concurrency: check payment proof hasn't been reviewed by another admin
      if (order.paymentProof && order.paymentProof.status !== 'PENDING') {
        return reply.status(409).send({
          error: 'Conflict: This payment has already been reviewed.',
          currentStatus: order.paymentProof.status,
          reviewedAt: order.paymentProof.reviewedAt,
        });
      }

      // Optional: verify the client's expected updatedAt matches
      if (
        body?.expectedProofUpdatedAt &&
        order.paymentProof &&
        order.paymentProof.updatedAt.toISOString() !== body.expectedProofUpdatedAt
      ) {
        return reply.status(409).send({
          error: 'Conflict: This payment has been modified since you loaded it. Please refresh.',
        });
      }

      // Update PaymentProof status
      if (order.paymentProof && order.paymentProof.status === 'PENDING') {
        await prisma.paymentProof.update({
          where: { orderId: order.id },
          data: {
            status: 'APPROVED',
            reviewedAt: new Date(),
            reviewedById: organizerId,
          },
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
   * POST /organizer/verifications/:orderNumber/reject
   * Reject payment — organizer must provide a reason.
   */
  async rejectVerification(
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
          user: true,
          event: true,
          payments: {
            where: { status: 'PENDING' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          paymentProof: true,
        },
      });

      if (!order) return reply.status(404).send({ error: 'Order not found' });

      // Verify organizer is assigned to the event
      await getOrganizerAssignment(organizerId, order.eventId).catch(() => {
        throw Object.assign(new Error('Not assigned to this event'), {
          statusCode: 403,
        });
      });

      const validStates = ['PENDING_PAYMENT', 'PENDING_VERIFICATION'];
      if (!validStates.includes(order.status)) {
        return reply.status(400).send({
          error: `Order is "${order.status}" — can only reject orders in PENDING_PAYMENT or PENDING_VERIFICATION`,
        });
      }

      await prisma.$transaction(async (tx) => {
        await organizerRejectOrder(tx, order, organizerId, body.reason);
      });

      await writeAuditLog('PAYMENT_REJECTED', 'Order', order.id, {
        actorId: organizerId,
        actorRole: 'ORGANIZER',
        eventId: order.eventId,
        ipAddress: request.ip,
        metadata: {
          reason: body.reason,
          orderNumber: order.orderNumber,
        },
      });

      sendPaymentRejectedEmail({
        to: order.user.email,
        attendeeName: order.user.name,
        orderNumber: order.orderNumber,
        eventTitle: order.event.title,
        reason: body.reason,
        userId: order.userId,
      }).catch(console.error);

      sendTelegramAdminAlert(
        `❌ <b>Payment Rejected</b> (by Organizer)\nOrder: <code>${order.orderNumber}</code>\nReason: ${body.reason}`,
      ).catch(console.error);

      return reply.send({
        success: true,
        message: `Payment rejected: ${body.reason} — user can resubmit proof.`,
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 400;
      const message = error.message || 'Unknown error';
      return reply.status(statusCode).send({ error: 'Rejection failed', message });
    }
  }

  /**
   * POST /organizer/verifications/:orderNumber/request-resubmission
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
