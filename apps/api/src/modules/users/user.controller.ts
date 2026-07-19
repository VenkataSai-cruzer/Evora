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

  async getOrders(request: FastifyRequest, _reply: FastifyReply) {
    const userId = request.user!.id;

    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        event: { select: { title: true, slug: true, startAt: true } },
        attendees: true,
        tickets: { select: { ticketNumber: true, status: true } },
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
          select: { title: true, slug: true, startAt: true, venueName: true },
        },
        ticketType: { select: { name: true } },
        checkIn: { select: { checkedInAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { tickets };
  }
}
