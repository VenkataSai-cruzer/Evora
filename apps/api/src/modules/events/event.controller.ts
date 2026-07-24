import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../infrastructure/database/prisma.js';

/**
 * Compute the authoritative public booking status for an event.
 * Priority order: CANCELLED > SOLD_OUT (manual) > SOLD_OUT (natural) > PAUSED > CLOSED > ENDED > NOT_STARTED > LIVE
 */
function computeBookingStatus(
  event: { status: string; salesPaused: boolean; bookingClosed: boolean; salesStartAt: Date | null; salesEndAt: Date | null; startAt: Date },
  ticketTypes: Array<{ capacity: number; soldCount: number }>,
): string {
  const now = new Date();

  // Cancelled events are never bookable
  if (event.status === 'CANCELLED') return 'CANCELLED';

  // Manual sold out (bookingClosed without natural exhaustion)
  if (event.bookingClosed) return 'SOLD_OUT';

  // Paused
  if (event.salesPaused) return 'PAUSED';

  // Natural exhaustion: all capacity-based ticket types are sold out
  const hasCapacityTypes = ticketTypes.some((tt) => tt.capacity > 0);
  const allSoldOut = hasCapacityTypes && ticketTypes.every((tt) => tt.capacity <= 0 || tt.soldCount >= tt.capacity);
  if (allSoldOut) return 'SOLD_OUT';

  // Not yet started / ended
  if (event.salesStartAt && event.salesStartAt > now) return 'NOT_STARTED';
  if (event.salesEndAt && event.salesEndAt < now) return 'ENDED';
  if (event.status !== 'PUBLISHED') return 'CLOSED';

  return 'LIVE';
}

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
        salesPaused: true,
        bookingClosed: true,
        salesStartAt: true,
        salesEndAt: true,
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

    const eventsWithStatus = events.map((event) => ({
      ...event,
      bookingStatus: computeBookingStatus(event, event.ticketTypes),
    }));

    return { events: eventsWithStatus, total };
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

    const bookingStatus = computeBookingStatus(event, event.ticketTypes);

    return { event: { ...event, bookingStatus } };
  }
}
