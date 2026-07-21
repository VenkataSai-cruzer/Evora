import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../infrastructure/database/prisma.js';

export class EventController {
  async list(request: FastifyRequest, _reply: FastifyReply) {
    const query = request.query as { status?: string; upcoming?: string };
    const now = new Date();

    const where: Record<string, unknown> = {};

    if (query.status) {
      where.status = query.status;
    } else {
      where.status = { in: ['PUBLISHED'] };
    }

    if (query.upcoming !== 'false') {
      where.startAt = { gte: now };
    }

    const events = await prisma.event.findMany({
      where,
      orderBy: { startAt: 'asc' },
      select: {
        id: true,
        title: true,
        slug: true,
        shortDescription: true,
        posterObjectKey: true,
        status: true,
        startAt: true,
        endAt: true,
        venueName: true,
        venueAddress: true,
        totalCapacity: true,
        ticketTypes: {
          where: { active: true },
          select: {
            id: true,
            name: true,
            price: true,
            currency: true,
            capacity: true,
            soldCount: true,
          },
        },
        _count: {
          select: {
            tickets: {
              where: { status: { in: ['CONFIRMED', 'CHECKED_IN'] } },
            },
          },
        },
      },
    });

    const total = await prisma.event.count({ where });

    return { events, total };
  }

  async getBySlug(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    const { slug } = request.params as { slug: string };

    const event = await prisma.event.findUnique({
      where: { slug },
      include: {
        ticketTypes: {
          where: { active: true },
          orderBy: { price: 'asc' },
        },
        branding: true,
        partners: { orderBy: { displayOrder: 'asc' } },
        templates: { where: { active: true }, take: 1 },
        organizer: {
          select: { id: true, name: true },
        },
        faqs: {
          where: { isPublished: true },
          orderBy: { sortOrder: 'asc' },
        },
        performers: {
          where: { isPublished: true },
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: {
            tickets: {
              where: { status: { in: ['CONFIRMED', 'CHECKED_IN'] } },
            },
          },
        },
      },
    });

    if (!event) {
      return reply.status(404).send({ error: 'Event not found' });
    }

    return { event };
  }
}
