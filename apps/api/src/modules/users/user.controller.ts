import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../infrastructure/database/prisma.js';

export class UserController {
  async getProfile(request: FastifyRequest, _reply: FastifyReply) {
    const userId = request.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
    });

    return { user };
  }

  /**
   * GET /users/me/overview
   * Attendee overview dashboard — returns summary stats, action items, and upcoming bookings.
   * Uses the user's own orders (not public events) to determine state.
   */
  async getOverview(request: FastifyRequest, _reply: FastifyReply) {
    const userId = request.user!.id;
    const now = new Date();

    const [orders, tickets] = await Promise.all([
      prisma.order.findMany({
        where: { userId },
        include: {
          event: { select: { id: true, title: true, slug: true, startAt: true, endAt: true, venueName: true, posterObjectKey: true } },
          attendees: { select: { id: true, attendeeName: true, attendeeEmail: true } },
          paymentProof: {
            select: { id: true, status: true, utrNumber: true, submittedAt: true, reviewedAt: true, rejectionReason: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.ticket.findMany({
        where: { userId, status: { not: 'CANCELLED' } },
        include: {
          event: { select: { title: true, slug: true, startAt: true, venueName: true } },
          ticketType: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Compute summary
    const summary = {
      upcomingBookings: orders.filter((o) => o.status === 'CONFIRMED' && o.event?.startAt && new Date(o.event.startAt) > now).length,
      actionRequired: orders.filter((o) => o.status === 'PENDING_PAYMENT' || o.status === 'REJECTED').length,
      availableTickets: tickets.filter((t) => t.status === 'CONFIRMED').length,
      pastEvents: orders.filter((o) => o.event?.startAt && new Date(o.event.startAt) <= now).length,
    };

    // Action items — bookings needing attendee action
    const actions = orders
      .filter((o) => o.status === 'PENDING_PAYMENT' || o.status === 'REJECTED' || o.status === 'PENDING_VERIFICATION')
      .map((o) => ({
        orderNumber: o.orderNumber,
        eventName: o.event?.title || 'Event',
        status: o.status,
        action: o.status === 'PENDING_PAYMENT' ? 'CONTINUE_PAYMENT' as const
              : o.status === 'REJECTED' ? 'RESUBMIT_PROOF' as const
              : 'UNDER_REVIEW' as const,
        expiresAt: o.expiresAt?.toISOString() || null,
      }));

    // Upcoming confirmed bookings
    const upcomingBookings = orders.filter((o) => o.status === 'CONFIRMED' && o.event?.startAt && new Date(o.event.startAt) > now);

    return {
      summary,
      actions,
      upcomingBookings,
      totalOrders: orders.length,
    };
  }

  async getDashboard(request: FastifyRequest, _reply: FastifyReply) {
    const userId = request.user!.id;
    const now = new Date();

    const [orders, tickets, allEvents] = await Promise.all([
      prisma.order.findMany({
        where: { userId },
        include: {
          event: { select: { id: true, title: true, slug: true, startAt: true, endAt: true, venueName: true } },
          attendees: true,
          tickets: { select: { id: true, ticketNumber: true, status: true } },
          paymentProof: {
            select: { id: true, status: true, utrNumber: true, submittedAt: true, reviewedAt: true, rejectionReason: true },
          },
          paymentProofHistory: {
            orderBy: { submittedAt: 'asc' },
            take: 5,
            select: { id: true, status: true, submittedAt: true, reviewedAt: true, rejectionReason: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.ticket.findMany({
        where: { userId, status: { not: 'CANCELLED' } },
        include: {
          event: { select: { title: true, slug: true, startAt: true, venueName: true, posterObjectKey: true } },
          ticketType: { select: { name: true } },
          checkIn: { select: { checkedInAt: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.event.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { startAt: 'asc' },
        take: 20,
        select: { id: true, title: true, slug: true, startAt: true, endAt: true, venueName: true, shortDescription: true },
      }),
    ]);

    const upcomingEvents = allEvents.filter((e) => new Date(e.startAt) > now);
    const pastEvents = allEvents.filter((e) => new Date(e.startAt) <= now);

    const ordersWithTimeline = orders.map((order) => {
      const timeline: Array<{ event: string; status: string; timestamp: string }> = [
        { event: 'Order Created', status: 'completed', timestamp: order.createdAt.toISOString() },
      ];
      if (order.paymentProof?.submittedAt) {
        timeline.push({
          event: order.paymentProof.status === 'REJECTED' ? 'Payment Rejected' : 'Payment Submitted',
          status: order.paymentProof.status === 'REJECTED' ? 'rejected' : 'completed',
          timestamp: order.paymentProof.submittedAt.toISOString(),
        });
      }
      if (order.paymentProof?.reviewedAt) {
        timeline.push({
          event: order.paymentProof.status === 'APPROVED' ? 'Payment Approved' : 'Payment Reviewed',
          status: 'completed',
          timestamp: order.paymentProof.reviewedAt.toISOString(),
        });
      }
      for (const h of order.paymentProofHistory) {
        timeline.push({
          event: h.status === 'REJECTED' ? 'Previous Attempt Rejected' : 'Previous Attempt',
          status: 'archived',
          timestamp: h.submittedAt.toISOString(),
        });
      }
      if (order.status === 'CONFIRMED') {
        timeline.push({ event: 'Tickets Issued', status: 'completed', timestamp: order.updatedAt.toISOString() });
      }
      if (order.status === 'REJECTED') {
        timeline.push({ event: 'Resubmission Available', status: 'pending', timestamp: order.updatedAt.toISOString() });
      }
      timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      return { ...order, timeline };
    });

    const stats = {
      pendingPayments: orders.filter((o) => o.status === 'PENDING_PAYMENT' || o.status === 'PENDING_VERIFICATION').length,
      approvedPayments: orders.filter((o) => o.status === 'CONFIRMED').length,
      rejectedPayments: orders.filter((o) => o.status === 'REJECTED').length,
      activeTickets: tickets.filter((t) => t.status === 'CONFIRMED').length,
      totalOrders: orders.length,
    };

    return { orders: ordersWithTimeline, tickets, upcomingEvents, pastEvents, stats };
  }

  async getOrders(request: FastifyRequest, _reply: FastifyReply) {
    const userId = request.user!.id;

    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        event: { select: { id: true, title: true, slug: true, startAt: true, endAt: true, venueName: true, posterObjectKey: true } },
        attendees: true,
        tickets: { select: { id: true, ticketNumber: true, status: true } },
        paymentProof: { select: { id: true, status: true, utrNumber: true, amount: true, submittedAt: true, rejectionReason: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { orders };
  }

  async getTickets(request: FastifyRequest, _reply: FastifyReply) {
    const userId = request.user!.id;

    const tickets = await prisma.ticket.findMany({
      where: { userId },
      include: {
        event: { select: { title: true, slug: true, startAt: true, venueName: true, posterObjectKey: true } },
        ticketType: { select: { name: true, price: true } },
        checkIn: { select: { checkedInAt: true } },
        order: { select: { orderNumber: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { tickets };
  }

  async getOrderByNumber(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user!.id;
    const { orderNumber } = request.params as { orderNumber: string };

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        event: { select: { id: true, title: true, slug: true, startAt: true, endAt: true, venueName: true } },
        attendees: true,
        tickets: { select: { id: true, ticketNumber: true, status: true } },
        paymentProof: { select: { id: true, status: true, utrNumber: true, amount: true, submittedAt: true, reviewedAt: true, rejectionReason: true } },
        paymentProofHistory: { orderBy: { submittedAt: 'asc' }, include: { reviewedBy: { select: { name: true } } } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!order) return reply.status(404).send({ error: 'Order not found' });
    if (order.userId !== userId) return reply.status(403).send({ error: 'Access denied' });

    return { order };
  }

  async getPayments(request: FastifyRequest, _reply: FastifyReply) {
    const userId = request.user!.id;

    const [payments, proofPayments] = await Promise.all([
      prisma.payment.findMany({
        where: { order: { userId } },
        include: { order: { select: { orderNumber: true, status: true, total: true, eventId: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.paymentProof.findMany({
        where: { submittedById: userId },
        include: { order: { select: { orderNumber: true, status: true, total: true, eventId: true } } },
        orderBy: { submittedAt: 'desc' },
        take: 20,
      }),
    ]);

    return { payments, proofPayments };
  }
}
