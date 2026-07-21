import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../infrastructure/database/prisma.js';
import { seedStagingData } from './seed.js';

export class AdminController {
  // ── Seed ───────────────────────────────────────────────────

  async seed(_request: FastifyRequest, reply: FastifyReply) {
    // Only allow in staging/development, not production
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
      return reply.status(403).send({ error: 'Seed endpoint is disabled in production' });
    }

    try {
      const results = await seedStagingData();
      return reply.send({
        message: 'Staging data seeded successfully',
        records: results,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown seed error';
      return reply.status(500).send({
        error: 'Seed failed',
        details: message,
      });
    }
  }

  // ── Events ────────────────────────────────────────────────

  async listEvents(request: FastifyRequest, _reply1: FastifyReply) {
    const query = request.query as { status?: string; page?: string; limit?: string };
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { startAt: 'desc' },
        skip,
        take: limit,
        include: {
          ticketTypes: { select: { id: true, name: true, capacity: true, soldCount: true } },
          _count: { select: { orders: true, tickets: true, checkIns: true } },
        },
      }),
      prisma.event.count({ where }),
    ]);

    return { events, total, page, limit };
  }

  async createEvent(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as {
      title: string;
      slug: string;
      shortDescription?: string;
      description?: string;
      startAt: string;
      endAt?: string;
      venueName: string;
      venueAddress?: string;
      totalCapacity: number;
      salesStartAt?: string;
      salesEndAt?: string;
      contactEmail?: string;
      contactPhone?: string;
      terms?: string;
      ticketNumberPrefix?: string;
    };

    // Organizer is required - use authenticated user
    const organizerId = request.user!.id;

    const event = await prisma.event.create({
      data: {
        title: body.title,
        slug: body.slug,
        shortDescription: body.shortDescription,
        description: body.description,
        startAt: new Date(body.startAt),
        endAt: body.endAt ? new Date(body.endAt) : null,
        venueName: body.venueName,
        venueAddress: body.venueAddress,
        totalCapacity: body.totalCapacity,
        salesStartAt: body.salesStartAt ? new Date(body.salesStartAt) : null,
        salesEndAt: body.salesEndAt ? new Date(body.salesEndAt) : null,
        contactEmail: body.contactEmail,
        contactPhone: body.contactPhone,
        terms: body.terms,
        ticketNumberPrefix: body.ticketNumberPrefix || '',
        organizerId,
      },
    });

    return reply.status(201).send({ event });
  }

  async getEvent(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        ticketTypes: { orderBy: { price: 'asc' } },
        branding: true,
        partners: { orderBy: { displayOrder: 'asc' } },
        templates: { orderBy: { version: 'desc' }, include: { fields: true } },
      },
    });

    if (!event) return reply.status(404).send({ error: 'Event not found' });
    return { event };
  }

  async updateEvent(request: FastifyRequest, _reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    const event = await prisma.event.update({
      where: { id },
      data: body,
    });

    return { event };
  }

  async duplicateEvent(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };

    const source = await prisma.event.findUnique({
      where: { id },
      include: {
        branding: true,
        partners: true,
        templates: { include: { fields: true } },
      },
    });

    if (!source) return reply.status(404).send({ error: 'Source event not found' });

    const newSlug = `${source.slug}-copy-${Date.now().toString(36)}`;

    const organizerId = request.user!.id;

    const event = await prisma.event.create({
      data: {
        title: `${source.title} (Copy)`,
        slug: newSlug,
        shortDescription: source.shortDescription,
        description: source.description,
        posterObjectKey: source.posterObjectKey,
        status: 'DRAFT',
        startAt: source.startAt,
        venueName: source.venueName,
        venueAddress: source.venueAddress,
        mapUrl: source.mapUrl,
        timezone: source.timezone,
        totalCapacity: source.totalCapacity,
        contactEmail: source.contactEmail,
        contactPhone: source.contactPhone,
        terms: source.terms,
        ticketNumberPrefix: source.ticketNumberPrefix,
        organizerId,
        // Copy branding
        branding: source.branding
          ? {
              create: {
                venueLogoObjectKey: source.branding.venueLogoObjectKey,
                primaryLogoObjectKey: source.branding.primaryLogoObjectKey,
                footerArtworkObjectKey: source.branding.footerArtworkObjectKey,
                contentPartnerHeading: source.branding.contentPartnerHeading,
              },
            }
          : undefined,
        // Copy partners
        partners: source.partners.length > 0
          ? {
              create: source.partners.map((p) => ({
                name: p.name,
                logoObjectKey: p.logoObjectKey,
                displayOrder: p.displayOrder,
                partnerType: p.partnerType,
              })),
            }
          : undefined,
        // Copy templates
        templates: source.templates.length > 0
          ? {
              create: source.templates.map((t) => ({
                version: 1,
                sourceObjectKey: t.sourceObjectKey,
                width: t.width,
                height: t.height,
                outputFormat: t.outputFormat,
                active: false, // Don't activate copied template
                fields: {
                  create: t.fields.map((f) => ({
                    fieldName: f.fieldName,
                    x: f.x,
                    y: f.y,
                    width: f.width,
                    height: f.height,
                    fontFamily: f.fontFamily,
                    fontSize: f.fontSize,
                    minimumFontSize: f.minimumFontSize,
                    fontWeight: f.fontWeight,
                    alignment: f.alignment,
                    textTransform: f.textTransform,
                    color: f.color,
                    visible: f.visible,
                  })),
                },
              })),
            }
          : undefined,
      },
      include: {
        branding: true,
        partners: true,
        templates: { include: { fields: true } },
      },
    });

    return reply.status(201).send({ event });
  }

  // ── Event Lifecycle ───────────────────────────────────────

  async publishEvent(request: FastifyRequest, _reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const event = await prisma.event.update({
      where: { id },
      data: { status: 'PUBLISHED' },
    });
    return { event };
  }

  async pauseSales(request: FastifyRequest, _reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const event = await prisma.event.update({
      where: { id },
      data: { salesPaused: true },
    });
    return { event };
  }

  async resumeSales(request: FastifyRequest, _reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const event = await prisma.event.update({
      where: { id },
      data: { salesPaused: false },
    });
    return { event };
  }

  async closeSales(request: FastifyRequest, _reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const event = await prisma.event.update({
      where: { id },
      data: { bookingClosed: true },
    });
    return { event };
  }

  // ── Attendees ─────────────────────────────────────────────

  async listAttendees(request: FastifyRequest, _reply2: FastifyReply) {
    const { id } = request.params as { id: string };
    const query = request.query as { search?: string; page?: string; limit?: string };
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '50', 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { eventId: id };

    if (query.search) {
      where.OR = [
        { attendee: { attendeeName: { contains: query.search } } },
        { ticketNumber: { contains: query.search } },
      ];
    }

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where: { eventId: id },
        include: {
          attendee: { select: { attendeeName: true, attendeeEmail: true, attendeePhone: true } },
          ticketType: { select: { name: true } },
          order: { select: { orderNumber: true } },
          checkIn: { select: { checkedInAt: true, result: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.ticket.count({ where: { eventId: id } }),
    ]);

    return { tickets, total, page, limit };
  }

  async exportAttendees(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };

    const tickets = await prisma.ticket.findMany({
      where: { eventId: id },
      include: {
        attendee: true,
        ticketType: { select: { name: true } },
        checkIn: { select: { checkedInAt: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const csvHeader = 'Ticket Number,Attendee Name,Email,Phone,Ticket Type,Status,Checked In At\n';
    const csvRows = tickets
      .map((t) =>
        [
          t.ticketNumber,
          t.attendee?.attendeeName || '',
          t.attendee?.attendeeEmail || '',
          t.attendee?.attendeePhone || '',
          t.ticketType.name,
          t.status,
          t.checkedInAt?.toISOString() || '',
        ].join(','),
      )
      .join('\n');

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', `attachment; filename=attendees-${id}.csv`);
    return reply.send(csvHeader + csvRows);
  }

  // ── Ticket Types ──────────────────────────────────────────

  async listTicketTypes(request: FastifyRequest, _reply3: FastifyReply) {
    const { id } = request.params as { id: string };
    const types = await prisma.ticketType.findMany({
      where: { eventId: id },
      orderBy: { price: 'asc' },
    });
    return { ticketTypes: types };
  }

  async createTicketType(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const body = request.body as {
      name: string;
      description?: string;
      price: number;
      capacity: number;
      maxPerOrder?: number;
      saleStartAt?: string;
      saleEndAt?: string;
    };

    const ticketType = await prisma.ticketType.create({
      data: {
        eventId: id,
        name: body.name,
        description: body.description,
        price: body.price,
        capacity: body.capacity,
        maxPerOrder: body.maxPerOrder || 10,
        saleStartAt: body.saleStartAt ? new Date(body.saleStartAt) : null,
        saleEndAt: body.saleEndAt ? new Date(body.saleEndAt) : null,
      },
    });

    return reply.status(201).send({ ticketType });
  }

  async updateTicketType(request: FastifyRequest, _reply: FastifyReply) {
    const { ticketTypeId } = request.params as { ticketTypeId: string };
    const body = request.body as Record<string, unknown>;

    const ticketType = await prisma.ticketType.update({
      where: { id: ticketTypeId },
      data: body,
    });

    return { ticketType };
  }

  // ── Branding ──────────────────────────────────────────────

  async upsertBranding(request: FastifyRequest, _reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const body = request.body as {
      venueLogoObjectKey?: string;
      primaryLogoObjectKey?: string;
      footerArtworkObjectKey?: string;
      contentPartnerHeading?: string;
    };

    const branding = await prisma.eventBranding.upsert({
      where: { eventId: id },
      update: body,
      create: { eventId: id, ...body },
    });

    return { branding };
  }

  // ── Partners ──────────────────────────────────────────────

  async listPartners(request: FastifyRequest, _reply4: FastifyReply) {
    const { id } = request.params as { id: string };
    const partners = await prisma.eventPartner.findMany({
      where: { eventId: id },
      orderBy: { displayOrder: 'asc' },
    });
    return { partners };
  }

  async createPartner(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const body = request.body as {
      name: string;
      logoObjectKey?: string;
      displayOrder?: number;
      partnerType?: string;
    };

    const partner = await prisma.eventPartner.create({
      data: {
        eventId: id,
        name: body.name,
        logoObjectKey: body.logoObjectKey,
        displayOrder: body.displayOrder || 0,
        partnerType: body.partnerType || 'CONTENT_PARTNER',
      },
    });

    return reply.status(201).send({ partner });
  }

  async deletePartner(request: FastifyRequest, reply: FastifyReply) {
    const { partnerId } = request.params as { partnerId: string };
    await prisma.eventPartner.delete({ where: { id: partnerId } });
    return reply.status(204).send();
  }

  // ── Check-ins ─────────────────────────────────────────────

  async listCheckIns(request: FastifyRequest, _reply5: FastifyReply) {
    const { id } = request.params as { id: string };
    const checkIns = await prisma.checkIn.findMany({
      where: { eventId: id },
      include: {
        ticket: { select: { ticketNumber: true } },
        scanner: { select: { name: true, email: true } },
      },
      orderBy: { checkedInAt: 'desc' },
      take: 100,
    });
    return { checkIns };
  }
}
