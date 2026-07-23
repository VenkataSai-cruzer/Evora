import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../infrastructure/database/prisma.js';

/**
 * Calculate the order total from the server-side ticket type price.
 * Never trust a client-provided total.
 */
function calculateTotal(price: number, quantity: number): number {
  return price * quantity;
}

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

    // ── Reject zero/negative price tickets ─────────────────
    // Evora does not offer public free bookings.
    // Only BANK_TRANSFER (paid) and COMPLIMENTARY (admin-issued) are supported.
    if (ticketType.price <= 0) {
      return reply.status(400).send({
        code: 'INVALID_PAID_TICKET_PRICE',
        error: 'This ticket is not available for public paid booking.',
      });
    }

    // Calculate trusted total from server-side values
    const total = calculateTotal(ticketType.price, body.quantity);

    // Transactional capacity check + order creation
    const order = await prisma.$transaction(async (tx) => {
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
          status: 'PENDING_PAYMENT',
          paymentMethod: 'BANK_TRANSFER',
          subtotal: total,
          fees: 0,
          total,
          currency: ticketType.currency,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
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

      return newOrder;
    });

    return reply.status(201).send({
      order,
      paymentMethod: 'BANK_TRANSFER',
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
