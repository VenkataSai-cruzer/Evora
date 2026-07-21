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
          select: { id: true, title: true, slug: true, startAt: true, venueName: true, venueAddress: true, posterObjectKey: true },
        },
        ticketType: { select: { name: true, price: true } },
        checkIn: { select: { checkedInAt: true, result: true } },
        order: { select: { id: true, orderNumber: true, status: true } },
        attendee: { select: { attendeeName: true, attendeeEmail: true } },
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
            posterObjectKey: true,
            startAt: true,
            endAt: true,
            venueName: true,
            venueAddress: true,
            mapUrl: true,
            status: true,
            organizerId: true,
            organizer: { select: { id: true, name: true } },
          },
        },
        ticketType: { select: { id: true, name: true, price: true, currency: true } },
        order: { select: { id: true, orderNumber: true, status: true, total: true } },
        attendee: { select: { id: true, attendeeName: true, attendeeEmail: true } },
        checkIn: { select: { checkedInAt: true, result: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!ticket) {
      return reply.status(404).send({ error: 'Ticket not found' });
    }

    // Allow: ticket owner, event organizer, or admin
    const userId = request.user!.id;
    const userRole = request.user!.role;
    const isOwner = ticket.userId === userId;
    const isOrganizer = ticket.event.organizerId === userId;
    const isAdmin = userRole === 'ADMIN';

    if (!isOwner && !isOrganizer && !isAdmin) {
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
