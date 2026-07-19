import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../infrastructure/database/prisma.js';

export class TicketController {
  async list(request: FastifyRequest, _reply: FastifyReply) {
    const userId = request.user!.id;
    const query = request.query as { eventId?: string; status?: string };

    const where: Record<string, unknown> = { userId };

    if (query.eventId) where.eventId = query.eventId;
    if (query.status) where.status = query.status;

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        event: {
          select: { title: true, slug: true, startAt: true, venueName: true },
        },
        ticketType: { select: { name: true, price: true } },
        checkIn: { select: { checkedInAt: true, result: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { tickets };
  }

  async getByNumber(request: FastifyRequest, reply: FastifyReply) {
    const { ticketNumber } = request.params as { ticketNumber: string };

    const ticket = await prisma.ticket.findUnique({
      where: { ticketNumber },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            startAt: true,
            endAt: true,
            venueName: true,
            venueAddress: true,
            mapUrl: true,
          },
        },
        ticketType: { select: { name: true, price: true, currency: true } },
        order: { select: { orderNumber: true } },
        attendee: { select: { attendeeName: true, attendeeEmail: true } },
        checkIn: { select: { checkedInAt: true, result: true } },
      },
    });

    if (!ticket) {
      return reply.status(404).send({ error: 'Ticket not found' });
    }

    // Only the ticket owner can view
    if (ticket.userId !== request.user!.id) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    return { ticket };
  }

  async download(request: FastifyRequest, reply: FastifyReply) {
    const { ticketNumber } = request.params as { ticketNumber: string };

    const ticket = await prisma.ticket.findUnique({
      where: { ticketNumber },
    });

    if (!ticket) {
      return reply.status(404).send({ error: 'Ticket not found' });
    }

    if (ticket.userId !== request.user!.id) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    if (!ticket.pdfObjectKey && !ticket.pngObjectKey) {
      return reply.status(404).send({ error: 'Ticket file not yet generated' });
    }

    // For now, return the object keys — R2 signed URL generation will be added in Phase 12
    return {
      ticketNumber: ticket.ticketNumber,
      pngKey: ticket.pngObjectKey,
      pdfKey: ticket.pdfObjectKey,
    };
  }
}
