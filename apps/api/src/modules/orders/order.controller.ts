import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../infrastructure/database/prisma.js';
import { autoConfirmFreeOrder } from './order-finalization.service.js';

export class OrderController {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user!.id;
    const body = request.body as {
      eventId: string;
      ticketTypeId: string;
      quantity: number;
      attendees: Array<{ name: string; email?: string; phone?: string }>;
    };

    // Validate event and ticket type
    const event = await prisma.event.findUnique({
      where: { id: body.eventId },
      include: {
        ticketTypes: { where: { id: body.ticketTypeId, active: true } },
      },
    });

    if (!event) {
      return reply.status(404).send({ error: 'Event not found' });
    }

    if (event.status !== 'PUBLISHED' || event.salesPaused || event.bookingClosed) {
      return reply.status(400).send({ error: 'Event sales are not open' });
    }

    const ticketType = event.ticketTypes[0];
    if (!ticketType) {
      return reply.status(404).send({ error: 'Ticket type not found' });
    }

    if (body.quantity < 1 || body.quantity > ticketType.maxPerOrder) {
      return reply.status(400).send({
        error: `Quantity must be between 1 and ${ticketType.maxPerOrder}`,
      });
    }

    // ── Determine payment method based on price ────────────
    const isFree = ticketType.price === 0;
    const paymentMethod = isFree ? 'FREE' : 'BANK_TRANSFER';

    // Transactional capacity check + order creation
    const result = await prisma.$transaction(async (tx) => {
      const currentType = await tx.ticketType.findUnique({
        where: { id: ticketType.id },
      });

      if (!currentType || currentType.soldCount + body.quantity > currentType.capacity) {
        throw new Error('Insufficient capacity');
      }

      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          eventId: body.eventId,
          userId,
          status: isFree ? 'CONFIRMED' : 'PENDING_PAYMENT',
          paymentMethod,
          paymentProvider: isFree ? 'free' : null,
          subtotal: 0,
          fees: 0,
          total: 0,
          currency: ticketType.currency,
          paidAt: isFree ? new Date() : null,
          expiresAt: isFree ? null : new Date(Date.now() + 30 * 60 * 1000),
          attendees: {
            create: body.attendees.map((a) => ({
              ticketTypeId: ticketType.id,
              attendeeName: a.name,
              attendeeEmail: a.email,
              attendeePhone: a.phone,
            })),
          },
        },
        include: {
          attendees: {
            include: {
              ticketType: { select: { id: true, price: true } },
            },
          },
        },
      });

      // Reserve capacity
      await tx.ticketType.update({
        where: { id: ticketType.id },
        data: { soldCount: { increment: body.quantity } },
      });

      return { order: newOrder, isFree };
    });

    // ── For FREE orders: auto-generate tickets immediately ──
    if (result.isFree) {
      await autoConfirmFreeOrder({
        orderId: result.order.id,
        orderNumber: result.order.orderNumber,
        eventId: body.eventId,
        userId,
        ticketNumberPrefix: event.ticketNumberPrefix || '',
        attendees: result.order.attendees.map((a) => ({
          id: a.id,
          attendeeName: a.attendeeName,
          attendeeEmail: a.attendeeEmail,
          attendeePhone: a.attendeePhone,
          ticketType: a.ticketType,
        })),
        approvedById: userId,
        approvalNote: 'Free event booking auto-confirmed',
      });
    }

    return reply.status(201).send({
      order: result.order,
      paymentMethod,
      autoConfirmed: result.isFree,
    });
  }

  async getByNumber(request: FastifyRequest, reply: FastifyReply) {
    const { orderNumber } = request.params as { orderNumber: string };

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        event: { select: { title: true, slug: true } },
        attendees: true,
        tickets: true,
        payments: true,
      },
    });

    if (!order) {
      return reply.status(404).send({ error: 'Order not found' });
    }

    // Only return orders belonging to the requesting user
    if (order.userId !== request.user!.id) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    return { order };
  }
}
