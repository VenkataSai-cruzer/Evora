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

    // Split events into upcoming and past
    const upcomingEvents = allEvents.filter((e) => new Date(e.startAt) > now);
    const pastEvents = allEvents.filter((e) => new Date(e.startAt) <= now);

    // Build timeline for each order
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
          status: order.paymentProof.status === 'APPROVED' ? 'completed' : 'completed',
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
        timeline.push({
          event: 'Tickets Issued',
          status: 'completed',
          timestamp: order.updatedAt.toISOString(),
        });
      }
      if (order.status === 'REJECTED') {
        timeline.push({
          event: 'Resubmission Available',
          status: 'pending',
          timestamp: order.updatedAt.toISOString(),
        });
      }
      // Sort by timestamp, remove duplicates
      timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      return { ...order, timeline };
    });

    // Compute stats
    const stats = {
      pendingPayments: orders.filter((o) => o.status === 'PENDING_PAYMENT' || o.status === 'PENDING_VERIFICATION').length,
      approvedPayments: orders.filter((o) => o.status === 'CONFIRMED').length,
      rejectedPayments: orders.filter((o) => o.status === 'REJECTED').length,
      activeTickets: tickets.filter((t) => t.status === 'CONFIRMED').length,
      totalOrders: orders.length,
    };

    return {
      orders: ordersWithTimeline,
      tickets,
      upcomingEvents,
      pastEvents,
      stats,
    };
  }

  async getOrders(request: FastifyRequest, _reply: FastifyReply) {
    const userId = request.user!.id;

    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        event: { select: { id: true, title: true, slug: true, startAt: true, endAt: true, venueName: true } },
        attendees: true,
        tickets: { select: { id: true, ticketNumber: true, status: true } },
        paymentProof: { select: { id: true, status: true, utrNumber: true, submittedAt: true, rejectionReason: true } },
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
        event: {
          select: { title: true, slug: true, startAt: true, venueName: true, posterObjectKey: true },
        },
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

    // Only return if the order belongs to the requesting user
    if (order.userId !== userId) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    return { order };
  }

  async getPayments(request: FastifyRequest, _reply: FastifyReply) {
    const userId = request.user!.id;

    const payments = await prisma.payment.findMany({
      where: { order: { userId } },
      include: {
        order: {
          select: { orderNumber: true, status: true, total: true, eventId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const proofPayments = await prisma.paymentProof.findMany({
      where: { submittedById: userId },
      include: {
        order: {
          select: { orderNumber: true, status: true, total: true, eventId: true },
        },
      },
      orderBy: { submittedAt: 'desc' },
      take: 20,
    });

    return { payments, proofPayments };
  }
}
