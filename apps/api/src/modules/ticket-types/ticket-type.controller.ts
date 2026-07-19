import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../infrastructure/database/prisma.js';

export class TicketTypeController {
  async getById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const ticketType = await prisma.ticketType.findUnique({
      where: { id },
      include: { event: { select: { title: true, slug: true } } },
    });

    if (!ticketType) {
      return reply.status(404).send({ error: 'Ticket type not found' });
    }

    return { ticketType };
  }
}
