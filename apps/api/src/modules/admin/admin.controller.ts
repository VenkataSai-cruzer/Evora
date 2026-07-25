import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../infrastructure/database/prisma.js';
import { finalizeApprovedOrder, issueTicketsForOrder } from '../orders/order-finalization.service.js';
import { writeAuditLog } from '../../infrastructure/audit/audit.service.js';
import { GoogleDriveService } from '../../infrastructure/storage/google-drive.service.js';
import {
  sendTelegramAdminAlert,
} from '../../infrastructure/email/email.service.js';

// ADMIN_ONLY ticket categories that organizers must never see
export const ADMIN_ONLY_CATEGORIES = ['COMPLIMENTARY', 'VIP', 'MEDIA', 'ARTIST', 'SPONSOR', 'STAFF', 'VOLUNTEER'];

export class AdminController {

  // ── Events ────────────────────────────────────────────────

  async listEvents(request: FastifyRequest, _reply: FastifyReply) {
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
      title: string; slug: string; shortDescription?: string; description?: string;
      startAt: string; endAt?: string; venueName: string; venueAddress?: string;
      totalCapacity: number; salesStartAt?: string; salesEndAt?: string;
      contactEmail?: string; contactPhone?: string; terms?: string; ticketNumberPrefix?: string;
    };
    const organizerId = request.user!.id;
    const event = await prisma.event.create({
      data: {
        title: body.title, slug: body.slug, shortDescription: body.shortDescription,
        description: body.description, startAt: new Date(body.startAt),
        endAt: body.endAt ? new Date(body.endAt) : null, venueName: body.venueName,
        venueAddress: body.venueAddress, totalCapacity: body.totalCapacity,
        salesStartAt: body.salesStartAt ? new Date(body.salesStartAt) : null,
        salesEndAt: body.salesEndAt ? new Date(body.salesEndAt) : null,
        contactEmail: body.contactEmail, contactPhone: body.contactPhone,
        terms: body.terms, ticketNumberPrefix: body.ticketNumberPrefix || '', organizerId,
      },
    });
    await writeAuditLog('EVENT_PUBLISHED', 'Event', event.id, {
      actorId: organizerId, actorRole: 'ADMIN', eventId: event.id,
      ipAddress: request.ip, userAgent: request.headers['user-agent'],
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
    const event = await prisma.event.update({ where: { id }, data: body });
    return { event };
  }

  async duplicateEvent(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const source = await prisma.event.findUnique({
      where: { id },
      include: { branding: true, partners: true, templates: { include: { fields: true } } },
    });
    if (!source) return reply.status(404).send({ error: 'Source event not found' });
    const newSlug = `${source.slug}-copy-${Date.now().toString(36)}`;
    const organizerId = request.user!.id;
    const event = await prisma.event.create({
      data: {
        title: `${source.title} (Copy)`, slug: newSlug,
        shortDescription: source.shortDescription, description: source.description,
        posterObjectKey: source.posterObjectKey, status: 'DRAFT',
        startAt: source.startAt, venueName: source.venueName,
        venueAddress: source.venueAddress, mapUrl: source.mapUrl,
        timezone: source.timezone, totalCapacity: source.totalCapacity,
        contactEmail: source.contactEmail, contactPhone: source.contactPhone,
        terms: source.terms, ticketNumberPrefix: source.ticketNumberPrefix, organizerId,
        branding: source.branding ? { create: { venueLogoObjectKey: source.branding.venueLogoObjectKey, primaryLogoObjectKey: source.branding.primaryLogoObjectKey, footerArtworkObjectKey: source.branding.footerArtworkObjectKey, contentPartnerHeading: source.branding.contentPartnerHeading } } : undefined,
        partners: source.partners.length > 0 ? { create: source.partners.map((p) => ({ name: p.name, logoObjectKey: p.logoObjectKey, displayOrder: p.displayOrder, partnerType: p.partnerType })) } : undefined,
        templates: source.templates.length > 0 ? { create: source.templates.map((t) => ({ version: 1, sourceObjectKey: t.sourceObjectKey, width: t.width, height: t.height, outputFormat: t.outputFormat, active: false, fields: { create: t.fields.map((f) => ({ fieldName: f.fieldName, x: f.x, y: f.y, width: f.width, height: f.height, fontFamily: f.fontFamily, fontSize: f.fontSize, minimumFontSize: f.minimumFontSize, fontWeight: f.fontWeight, alignment: f.alignment, textTransform: f.textTransform, color: f.color, visible: f.visible })) } })) } : undefined,
      },
      include: { branding: true, partners: true, templates: { include: { fields: true } } },
    });
    return reply.status(201).send({ event });
  }

  // ── Event Lifecycle ───────────────────────────────────────

  async publishEvent(request: FastifyRequest, _reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const event = await prisma.event.update({ where: { id }, data: { status: 'PUBLISHED' } });
    await writeAuditLog('EVENT_PUBLISHED', 'Event', id, { actorId: request.user!.id, actorRole: 'ADMIN', eventId: id });
    return { event };
  }

  async pauseSales(request: FastifyRequest, _reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const event = await prisma.event.update({ where: { id }, data: { salesPaused: true } });
    await writeAuditLog('EVENT_PAUSED', 'Event', id, { actorId: request.user!.id, actorRole: 'ADMIN', eventId: id });
    return { event };
  }

  async resumeSales(request: FastifyRequest, _reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const event = await prisma.event.update({ where: { id }, data: { salesPaused: false } });
    await writeAuditLog('EVENT_RESUMED', 'Event', id, { actorId: request.user!.id, actorRole: 'ADMIN', eventId: id });
    return { event };
  }

  async closeSales(request: FastifyRequest, _reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const event = await prisma.event.update({ where: { id }, data: { bookingClosed: true } });
    await writeAuditLog('EVENT_CLOSED', 'Event', id, { actorId: request.user!.id, actorRole: 'ADMIN', eventId: id });
    return { event };
  }

  /**
   * POST /admin/events/:id/mark-sold-out
   * Manually mark an event as sold out.
   * Sets bookingClosed = true to block new bookings.
   * Does NOT modify capacity, soldCount, existing orders, or tickets.
   */
  async markSoldOut(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };

    const event = await prisma.event.findUnique({ where: { id }, select: { id: true, title: true, bookingClosed: true } });
    if (!event) return reply.status(404).send({ error: 'Event not found' });

    if (event.bookingClosed) {
      return reply.send({ success: true, message: 'Event is already marked as sold out/closed.' });
    }

    await prisma.event.update({ where: { id }, data: { bookingClosed: true } });

    await writeAuditLog('EVENT_MARKED_SOLD_OUT', 'Event', id, {
      actorId: request.user!.id, actorRole: 'ADMIN', eventId: id,
    });

    return reply.send({ success: true, message: 'Event marked as sold out. New bookings blocked.' });
  }

  /**
   * POST /admin/events/:id/reopen-booking
   * Reopen booking for a manually closed/sold-out event.
   * Only succeeds if remaining capacity > 0 and booking period is still valid.
   */
  async reopenBooking(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };

    const event = await prisma.event.findUnique({
      where: { id },
      include: { ticketTypes: { select: { id: true, capacity: true, soldCount: true } } },
    });
    if (!event) return reply.status(404).send({ error: 'Event not found' });

    // Check remaining capacity across all ticket types
    const totalRemaining = event.ticketTypes.reduce((sum, tt) => {
      if (tt.capacity <= 0) return sum; // capacity 0 = unlimited (or not set)
      return sum + Math.max(0, tt.capacity - tt.soldCount);
    }, 0);

    // If event has capacity-based ticket types and all are sold out, block reopen
    const hasCapacityTypes = event.ticketTypes.some((tt) => tt.capacity > 0);
    if (hasCapacityTypes && totalRemaining <= 0) {
      return reply.status(409).send({
        error: 'Booking cannot be reopened because no tickets remain.',
        remainingCapacity: 0,
      });
    }

    if (event.status !== 'PUBLISHED') {
      return reply.status(409).send({
        error: 'Event must be PUBLISHED to reopen booking.',
      });
    }

    // Check booking period hasn't fully ended
    if (event.salesEndAt && event.salesEndAt < new Date()) {
      return reply.status(409).send({
        error: 'Booking cannot be reopened because the booking period has ended. Adjust sales dates separately.',
      });
    }

    if (!event.bookingClosed && !event.salesPaused) {
      return reply.send({ success: true, message: 'Booking is already open.' });
    }

    await prisma.event.update({ where: { id }, data: { bookingClosed: false, salesPaused: false } });

    await writeAuditLog('EVENT_REOPENED', 'Event', id, {
      actorId: request.user!.id, actorRole: 'ADMIN', eventId: id,
    });

    return reply.send({ success: true, message: 'Booking reopened. Public status set to LIVE.' });
  }

  // ── Attendees (ADMIN sees ALL ticket categories) ──────────

  async listAttendees(request: FastifyRequest, _reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const query = request.query as { search?: string; page?: string; limit?: string };
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '50', 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { eventId: id };
    if (query.search) {
      where.OR = [{ attendeeName: { contains: query.search, mode: 'insensitive' } }, { ticketNumber: { contains: query.search, mode: 'insensitive' } }];
    }

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          attendee: { select: { attendeeName: true, attendeeEmail: true, attendeePhone: true } },
          ticketType: { select: { name: true } },
          order: { select: { orderNumber: true } },
          checkIn: { select: { checkedInAt: true, result: true } },
          issuedBy: { select: { name: true } },
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
    // ADMIN sees ALL tickets including ADMIN_ONLY
    const tickets = await prisma.ticket.findMany({
      where: { eventId: id },
      include: {
        ticketType: { select: { name: true } },
        checkIn: { select: { checkedInAt: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    const csvHeader = 'Ticket Number,Attendee Name,Email,Phone,Ticket Type,Category,Visibility,Status,Checked In At\n';
    const csvRows = tickets.map((t) => [
      t.ticketNumber, t.attendeeName, t.attendeeEmail, t.attendeePhone,
      t.ticketType.name, t.ticketCategory, t.visibility, t.status,
      t.checkedInAt?.toISOString() || '',
    ].join(',')).join('\n');
    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', `attachment; filename=attendees-${id}.csv`);
    return reply.send(csvHeader + csvRows);
  }

  // ── Ticket Types ──────────────────────────────────────────

  async listTicketTypes(request: FastifyRequest, _reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const types = await prisma.ticketType.findMany({ where: { eventId: id }, orderBy: { price: 'asc' } });
    return { ticketTypes: types };
  }

  async createTicketType(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const body = request.body as { name: string; description?: string; price: number; capacity: number; maxPerOrder?: number; saleStartAt?: string; saleEndAt?: string; };
    const ticketType = await prisma.ticketType.create({
      data: { eventId: id, name: body.name, description: body.description, price: body.price, capacity: body.capacity, maxPerOrder: body.maxPerOrder || 10, saleStartAt: body.saleStartAt ? new Date(body.saleStartAt) : null, saleEndAt: body.saleEndAt ? new Date(body.saleEndAt) : null },
    });
    return reply.status(201).send({ ticketType });
  }

  async updateTicketType(request: FastifyRequest, reply: FastifyReply) {
    const { id: eventId, ticketTypeId } = request.params as { id: string; ticketTypeId: string };
    const body = request.body as {
      name?: string;
      description?: string;
      price?: number;
      capacity?: number;
      maxPerOrder?: number;
      active?: boolean;
    };
    const adminId = request.user!.id;

    // Verify ticket type belongs to this event
    const existing = await prisma.ticketType.findUnique({ where: { id: ticketTypeId } });
    if (!existing || existing.eventId !== eventId) {
      return reply.status(404).send({ error: 'Ticket type not found for this event' });
    }

    // Whitelist — never allow soldCount, eventId, or id to be changed
    const allowed: Record<string, unknown> = {};
    if (body.name !== undefined) allowed.name = body.name;
    if (body.description !== undefined) allowed.description = body.description;
    if (body.price !== undefined) {
      if (typeof body.price !== 'number' || body.price < 0) {
        return reply.status(400).send({ error: 'price must be a non-negative number (in paise)' });
      }
      allowed.price = body.price;
    }
    if (body.capacity !== undefined) {
      if (typeof body.capacity !== 'number' || body.capacity < existing.soldCount) {
        return reply.status(400).send({
          error: `capacity cannot be less than tickets already sold (${existing.soldCount})`,
        });
      }
      allowed.capacity = body.capacity;
    }
    if (body.maxPerOrder !== undefined) allowed.maxPerOrder = body.maxPerOrder;
    if (body.active !== undefined) allowed.active = body.active;

    if (Object.keys(allowed).length === 0) {
      return reply.status(400).send({ error: 'No valid fields to update' });
    }

    const ticketType = await prisma.ticketType.update({ where: { id: ticketTypeId }, data: allowed });

    await writeAuditLog('TICKET_TYPE_UPDATED' as any, 'TicketType', ticketTypeId, {
      actorId: adminId,
      actorRole: 'ADMIN',
      eventId,
      metadata: { changes: allowed },
    });

    return { ticketType };
  }

  // ── Branding ──────────────────────────────────────────────

  async upsertBranding(request: FastifyRequest, _reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const body = request.body as { venueLogoObjectKey?: string; primaryLogoObjectKey?: string; footerArtworkObjectKey?: string; contentPartnerHeading?: string; };
    const branding = await prisma.eventBranding.upsert({ where: { eventId: id }, update: body, create: { eventId: id, ...body } });
    return { branding };
  }

  // ── Partners ──────────────────────────────────────────────

  async listPartners(request: FastifyRequest, _reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const partners = await prisma.eventPartner.findMany({ where: { eventId: id }, orderBy: { displayOrder: 'asc' } });
    return { partners };
  }

  async createPartner(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const body = request.body as { name: string; logoObjectKey?: string; displayOrder?: number; partnerType?: string; };
    const partner = await prisma.eventPartner.create({ data: { eventId: id, name: body.name, logoObjectKey: body.logoObjectKey, displayOrder: body.displayOrder || 0, partnerType: body.partnerType || 'CONTENT_PARTNER' } });
    return reply.status(201).send({ partner });
  }

  async deletePartner(request: FastifyRequest, reply: FastifyReply) {
    const { partnerId } = request.params as { partnerId: string };
    await prisma.eventPartner.delete({ where: { id: partnerId } });
    return reply.status(204).send();
  }

  // ── Orders / Payment Verification ────────────────────────

  async listOrders(request: FastifyRequest, _reply: FastifyReply) {
    const query = request.query as { status?: string; eventId?: string; paymentMethod?: string; page?: string; limit?: string };
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.status) {
      where.status = query.status;
    } else {
      // Default: show orders pending payment or verification
      where.status = { in: ['PENDING_PAYMENT', 'PENDING_VERIFICATION'] };
    }

    // Only filter by payment method for the verification queue (PENDING statuses).
    // For CONFIRMED, REJECTED, CANCELLED, COMPLIMENTARY, etc., show ALL payment methods.
    const queueStatuses = ['PENDING_PAYMENT', 'PENDING_VERIFICATION'];
    const currentStatus = query.status || '';
    if (queueStatuses.includes(currentStatus) || (!query.status)) {
      where.paymentMethod = query.paymentMethod || 'BANK_TRANSFER';
    }
    // Explicit COMPLIMENTARY filter
    if (currentStatus === 'COMPLIMENTARY') {
      where.paymentMethod = 'COMPLIMENTARY';
    }
    if (query.eventId) where.eventId = query.eventId;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take: limit,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          event: { select: { id: true, title: true, slug: true } },
          attendees: { include: { ticketType: { select: { name: true, price: true } } } },
          paymentProof: { select: { id: true, utrNumber: true, amount: true, status: true, submittedAt: true, rejectionReason: true, googleDriveViewUrl: true, mimeType: true } },
          paymentProofHistory: { orderBy: { submittedAt: 'asc' }, include: { reviewedBy: { select: { name: true } } } },
          payments: { where: { method: 'utr' }, orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return { orders, total, page, limit };
  }

  /**
   * GET /admin/orders/:id
   * Full order detail for the verification page.
   */
  async getOrder(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        event: { select: { id: true, title: true, slug: true, startAt: true, venueName: true } },
        attendees: { include: { ticketType: { select: { name: true, price: true } } } },
        tickets: { select: { id: true, ticketNumber: true, ticketCategory: true, status: true } },
        paymentProof: true,
        paymentProofHistory: { orderBy: { submittedAt: 'asc' }, include: { reviewedBy: { select: { name: true } } } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!order) return reply.status(404).send({ error: 'Order not found' });
    return { order };
  }

  /**
   * POST /admin/orders/:id/approve
   * Idempotent. Uses shared finalization service.
   * Accepts: PENDING_PAYMENT, PENDING_VERIFICATION (initial), REJECTED (resubmission approved)
   */
  async approveOrder(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const body = request.body as { overrideAmount?: number; note?: string; expectedProofUpdatedAt?: string } | undefined;
    const adminId = request.user!.id;

    try {
      const order = await prisma.order.findUnique({
        where: { id },
        include: { paymentProof: true },
      });
      if (!order) return reply.status(404).send({ error: 'Order not found' });

      // Validate order status is eligible for approval
      const validStates = ['PENDING_PAYMENT', 'PENDING_VERIFICATION', 'REJECTED'];
      if (!validStates.includes(order.status)) {
        return reply.status(409).send({
          error: `Order is "${order.status}" — cannot approve.`,
        });
      }

      // Payment proof must exist and be PENDING for approval
      if (!order.paymentProof) {
        return reply.status(409).send({
          code: 'PAYMENT_PROOF_REQUIRED',
          error: 'Payment proof must be submitted before approval.',
        });
      }

      if (order.paymentProof.status !== 'PENDING') {
        return reply.status(409).send({
          error: 'Conflict: This payment has already been reviewed.',
          currentStatus: order.paymentProof.status,
          reviewedAt: order.paymentProof.reviewedAt,
        });
      }

      // Optional: verify the client's expected updatedAt matches
      if (
        body?.expectedProofUpdatedAt &&
        order.paymentProof.updatedAt.toISOString() !== body.expectedProofUpdatedAt
      ) {
        return reply.status(409).send({
          error: 'Conflict: This payment has been modified since you loaded it. Please refresh.',
        });
      }

      // PaymentProof status is now updated INSIDE the finalization transaction
      // to guarantee atomic consistency — no separate pre-update needed here.
      const result = await finalizeApprovedOrder(id, adminId, 'MANUAL_ADMIN', body?.overrideAmount, body?.note, request.ip, request.headers['user-agent']);

      return reply.send({
        success: true,
        message: `Payment approved. ${result.ticketsCreated} ticket(s) generated.`,
        data: { orderNumber: result.orderNumber, ticketsCreated: result.ticketsCreated, ticketNumbers: result.ticketNumbers },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(400).send({ error: 'Approval failed', message });
    }
  }

  /**
   * POST /admin/orders/:id/reject
   * Admin must provide a reason.
   *
   * Order stays alive at REJECTED status — user can resubmit proof on the same order.
   * Reserved capacity IS released so public availability reflects true inventory.
   */
  async rejectOrder(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const body = request.body as { reason: string };
    const adminId = request.user!.id;

    if (!body?.reason?.trim()) {
      return reply.status(400).send({ error: 'Rejection reason is required' });
    }

    try {
      const order = await prisma.order.findUnique({
        where: { id },
        include: { user: true, event: true, payments: { where: { status: 'PENDING' }, orderBy: { createdAt: 'desc' }, take: 1 }, paymentProof: true },
      });
      if (!order) return reply.status(404).send({ error: 'Order not found' });

      // Accept: PENDING_PAYMENT, PENDING_VERIFICATION
      const validStates = ['PENDING_PAYMENT', 'PENDING_VERIFICATION'];
      if (!validStates.includes(order.status)) {
        return reply.status(400).send({ error: `Order is "${order.status}" — can only reject orders in PENDING_PAYMENT or PENDING_VERIFICATION` });
      }

      await prisma.$transaction(async (tx) => {
        if (order.payments[0]) {
          await tx.payment.update({ where: { id: order.payments[0].id }, data: { status: 'FAILED' } });
        }
        if (order.paymentProof) {
          await tx.paymentProof.update({ where: { orderId: id }, data: { status: 'REJECTED', rejectionReason: body.reason, reviewedAt: new Date(), reviewedById: adminId } });
        }

        // Release reserved capacity: soldCount was incremented at booking creation
        // and must be decremented when the order is rejected.
        const attendees = await tx.orderAttendee.findMany({
          where: { orderId: id },
          select: { ticketTypeId: true },
        });
        const typeCounts = new Map<string, number>();
        for (const a of attendees) {
          typeCounts.set(a.ticketTypeId, (typeCounts.get(a.ticketTypeId) || 0) + 1);
        }
        for (const [ticketTypeId, quantity] of typeCounts) {
          const tt = await tx.ticketType.findUnique({ where: { id: ticketTypeId } });
          if (tt) {
            await tx.ticketType.update({
              where: { id: ticketTypeId },
              data: { soldCount: Math.max(0, tt.soldCount - quantity) },
            });
          }
        }

        // Order stays alive at REJECTED — NOT CANCELLED
        // Capacity IS released so public count reflects true availability
        await tx.order.update({
          where: { id },
          data: { status: 'REJECTED' },
        });
      });

      await writeAuditLog('PAYMENT_REJECTED', 'Order', id, {
        actorId: adminId, actorRole: 'ADMIN', eventId: order.eventId,
        ipAddress: request.ip, metadata: { reason: body.reason, orderNumber: order.orderNumber },
      });

      // Email notifications disabled until verified domain is set up.
      sendTelegramAdminAlert(`❌ <b>Payment Rejected</b>\nOrder: <code>${order.orderNumber}</code>\nReason: ${body.reason}`).catch(console.error);

      return reply.send({ success: true, message: `Payment rejected: ${body.reason} — user can resubmit proof.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(400).send({ error: 'Rejection failed', message });
    }
  }

  /**
   * POST /admin/orders/:id/request-resubmission
   */
  async requestResubmission(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const body = request.body as { message?: string };
    const adminId = request.user!.id;

    const order = await prisma.order.findUnique({ where: { id }, include: { paymentProof: true } });
    if (!order) return reply.status(404).send({ error: 'Order not found' });

    if (order.paymentProof) {
      await prisma.paymentProof.update({
        where: { orderId: id },
        data: { status: 'RESUBMISSION_REQUESTED', rejectionReason: body.message ?? 'Please resubmit your payment proof', reviewedAt: new Date(), reviewedById: adminId },
      });
    }

    await writeAuditLog('PAYMENT_RESUBMISSION_REQUESTED', 'Order', id, {
      actorId: adminId, actorRole: 'ADMIN', eventId: order.eventId, metadata: { message: body.message },
    });

    return { success: true, message: 'Resubmission requested' };
  }

  // ── Phase E: Complimentary Tickets ────────────────────────

  /**
   * POST /admin/events/:eventId/complimentary-tickets
   * Issue one or more complimentary tickets — admin only.
   * Does NOT create a payment record.
   * Visibility defaults to ADMIN_ONLY.
   */
  async issueComplimentaryTickets(request: FastifyRequest, reply: FastifyReply) {
    const { eventId } = request.params as { eventId: string };
    const adminId = request.user!.id;
    const body = request.body as {
      attendeeName: string;
      attendeeEmail: string;
      attendeePhone?: string;
      quantity: number;
      ticketCategory: string;
      reason: string;
      internalNote?: string;
      sendNotification?: boolean;
      ticketTypeId?: string;
    };

    const ALLOWED_COMPL_CATEGORIES = ['COMPLIMENTARY', 'VIP', 'MEDIA', 'ARTIST', 'SPONSOR', 'STAFF', 'VOLUNTEER'];
    if (!ALLOWED_COMPL_CATEGORIES.includes(body.ticketCategory)) {
      return reply.status(400).send({ error: `Invalid ticketCategory. Allowed: ${ALLOWED_COMPL_CATEGORIES.join(', ')}` });
    }
    if (!body.reason?.trim()) return reply.status(400).send({ error: 'Reason is required' });
    if (!body.attendeeName?.trim()) return reply.status(400).send({ error: 'Attendee name is required' });
    if (!body.attendeeEmail?.trim()) return reply.status(400).send({ error: 'Attendee email is required' });

    const qty = Math.min(Math.max(1, body.quantity || 1), 50);

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return reply.status(404).send({ error: 'Event not found' });

    // Find or use default ticket type for the event
    let ticketTypeId = body.ticketTypeId;
    if (!ticketTypeId) {
      const defaultTT = await prisma.ticketType.findFirst({ where: { eventId, active: true }, orderBy: { createdAt: 'asc' } });
      if (!defaultTT) return reply.status(400).send({ error: 'No ticket type found for this event. Create one first.' });
      ticketTypeId = defaultTT.id;
    } else {
      const tt = await prisma.ticketType.findUnique({ where: { id: ticketTypeId } });
      if (!tt || tt.eventId !== eventId) return reply.status(400).send({ error: 'Invalid ticketTypeId' });
    }

    // Find or create a placeholder user for the attendee
    let attendeeUser = await prisma.user.findUnique({ where: { email: body.attendeeEmail.toLowerCase() } });
    if (!attendeeUser) {
      attendeeUser = await prisma.user.create({
        data: { name: body.attendeeName, email: body.attendeeEmail.toLowerCase(), phone: body.attendeePhone, role: 'ATTENDEE', status: 'ACTIVE' },
      });
    }

    // Create Order + OrderAttendees + Tickets in a single transaction
    // Uses the shared issueTicketsForOrder() service
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create order with COMPLIMENTARY payment method
      const order = await tx.order.create({
        data: {
          orderNumber: `COMP-${Date.now()}`,
          eventId,
          userId: attendeeUser.id,
          status: 'CONFIRMED',
          paymentMethod: 'COMPLIMENTARY',
          subtotal: 0,
          fees: 0,
          total: 0,
          paidAt: new Date(),
        },
      });

      // 2. Create OrderAttendee records (schema-valid fields only)
      for (let i = 0; i < qty; i++) {
        await tx.orderAttendee.create({
          data: {
            orderId: order.id,
            ticketTypeId,
            attendeeName: body.attendeeName,
            attendeeEmail: body.attendeeEmail.toLowerCase(),
            attendeePhone: body.attendeePhone || '',
          },
        });
      }

      // 3. Create a Payment record for audit trail
      await tx.payment.create({
        data: {
          orderId: order.id,
          amount: 0,
          method: 'complimentary',
          status: 'SUCCEEDED',
        },
      });

      // 4. Use the authoritative shared ticket-issuance service
      const ticketResult = await issueTicketsForOrder({
        tx,
        orderId: order.id,
        issuedById: adminId,
        source: 'COMPLIMENTARY',
        ticketCategory: body.ticketCategory,
      });

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        ...ticketResult,
      };
    });

    await writeAuditLog('COMPLIMENTARY_TICKET_CREATED', 'Order', result.orderId, {
      actorId: adminId, actorRole: 'ADMIN', eventId,
      ipAddress: request.ip, userAgent: request.headers['user-agent'],
      metadata: { category: body.ticketCategory, reason: body.reason, internalNote: body.internalNote, quantity: qty, attendeeEmail: body.attendeeEmail },
    });

    return reply.status(201).send({
      success: true,
      orderNumber: result.orderNumber,
      ticketsCreated: result.ticketsCreated,
      ticketNumbers: result.ticketNumbers,
      count: qty,
    });
  }

  // ── Assignments ───────────────────────────────────────────

  async assignOrganizer(request: FastifyRequest, reply: FastifyReply) {
    const { eventId } = request.params as { eventId: string };
    const body = request.body as { organizerId: string; permissions?: Record<string, boolean> };
    const adminId = request.user!.id;

    const organizer = await prisma.user.findUnique({ where: { id: body.organizerId } });
    if (!organizer) return reply.status(404).send({ error: 'User not found' });
    if (organizer.role !== 'ORGANIZER' && organizer.role !== 'ADMIN') {
      return reply.status(400).send({ error: 'User must have ORGANIZER or ADMIN role' });
    }

    const assignment = await prisma.organizerAssignment.upsert({
      where: { organizerId_eventId: { organizerId: body.organizerId, eventId } },
      update: { permissions: JSON.stringify(body.permissions || {}) },
      create: { organizerId: body.organizerId, eventId, permissions: JSON.stringify(body.permissions || {}), assignedById: adminId },
    });

    await writeAuditLog('ORGANIZER_ASSIGNED', 'Event', eventId, {
      actorId: adminId, actorRole: 'ADMIN', eventId, metadata: { organizerId: body.organizerId },
    });

    return reply.status(201).send({ assignment });
  }

  async assignScanner(request: FastifyRequest, reply: FastifyReply) {
    const { eventId } = request.params as { eventId: string };
    const body = request.body as { scannerId: string; gateName?: string; isActive?: boolean };
    const adminId = request.user!.id;

    const scanner = await prisma.user.findUnique({ where: { id: body.scannerId } });
    if (!scanner) return reply.status(404).send({ error: 'User not found' });
    if (scanner.role !== 'SCANNER' && scanner.role !== 'ADMIN') {
      return reply.status(400).send({ error: 'User must have SCANNER or ADMIN role' });
    }

    const assignment = await prisma.scannerAssignment.upsert({
      where: { scannerId_eventId: { scannerId: body.scannerId, eventId } },
      update: { gateName: body.gateName ?? null, isActive: body.isActive ?? true },
      create: { scannerId: body.scannerId, eventId, gateName: body.gateName, isActive: body.isActive ?? true, assignedById: adminId },
    });

    await writeAuditLog('SCANNER_ASSIGNED', 'Event', eventId, {
      actorId: adminId, actorRole: 'ADMIN', eventId, metadata: { scannerId: body.scannerId, gateName: body.gateName },
    });

    return reply.status(201).send({ assignment });
  }

  // ── Users ─────────────────────────────────────────────────

  async listUsers(request: FastifyRequest, _reply: FastifyReply) {
    const query = request.query as { role?: string; page?: string; limit?: string; search?: string };
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { status: { not: 'DELETED' } };
    if (query.role) where.role = query.role;
    if (query.search) where.OR = [{ name: { contains: query.search, mode: 'insensitive' } }, { email: { contains: query.search, mode: 'insensitive' } }];
    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit, select: { id: true, name: true, email: true, phone: true, role: true, status: true, createdAt: true } }),
      prisma.user.count({ where }),
    ]);
    return { users, total, page, limit };
  }

  async updateUserRole(request: FastifyRequest, reply: FastifyReply) {
    const { userId } = request.params as { userId: string };
    const body = request.body as { role: string };
    const adminId = request.user!.id;
    const VALID_ROLES = ['ATTENDEE', 'ORGANIZER', 'SCANNER', 'ADMIN'];
    if (!VALID_ROLES.includes(body.role)) return reply.status(400).send({ error: `Invalid role. Valid: ${VALID_ROLES.join(', ')}` });
    const user = await prisma.user.update({ where: { id: userId }, data: { role: body.role }, select: { id: true, name: true, email: true, role: true } });
    await writeAuditLog('USER_ROLE_CHANGED', 'User', userId, { actorId: adminId, actorRole: 'ADMIN', metadata: { newRole: body.role } });
    return { user };
  }

  // ── Dashboard Stats ────────────────────────────────────────

  /**
   * GET /admin/stats
   * Real database aggregate counts for admin dashboard.
   * Never derived from a capped list of events.
   */
  async getStats(_request: FastifyRequest, _reply: FastifyReply) {
    const [
      totalEvents,
      draftEvents,
      publishedEvents,
      completedEvents,
      cancelledEvents,
      totalOrders,
      pendingPaymentOrders,
      pendingVerificationOrders,
      confirmedOrders,
      rejectedOrders,
      totalTickets,
      checkedInTickets,
      unreadMessages,
    ] = await Promise.all([
      prisma.event.count(),
      prisma.event.count({ where: { status: 'DRAFT' } }),
      prisma.event.count({ where: { status: 'PUBLISHED' } }),
      prisma.event.count({ where: { status: 'COMPLETED' } }),
      prisma.event.count({ where: { status: 'CANCELLED' } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: 'PENDING_PAYMENT' } }),
      prisma.order.count({ where: { status: 'PENDING_VERIFICATION' } }),
      prisma.order.count({ where: { status: 'CONFIRMED' } }),
      prisma.order.count({ where: { status: 'REJECTED' } }),
      prisma.ticket.count({ where: { status: { in: ['CONFIRMED', 'CHECKED_IN'] } } }),
      prisma.ticket.count({ where: { status: 'CHECKED_IN' } }),
      prisma.contactMessage.count({ where: { isRead: false } }),
    ]);

    return {
      events: {
        total: totalEvents,
        draft: draftEvents,
        published: publishedEvents,
        completed: completedEvents,
        cancelled: cancelledEvents,
      },
      orders: {
        total: totalOrders,
        pendingPayment: pendingPaymentOrders,
        pendingVerification: pendingVerificationOrders,
        confirmed: confirmedOrders,
        rejected: rejectedOrders,
      },
      tickets: {
        total: totalTickets,
        checkedIn: checkedInTickets,
      },
      messages: {
        unread: unreadMessages,
      },
    };
  }

  /**
   * GET /admin/tickets/export.csv
   * Export tickets as CSV with the same filters as listTickets.
   */
  async exportTicketsCsv(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as {
      eventId?: string;
      status?: string;
      category?: string;
      search?: string;
    };

    const where: Record<string, unknown> = {};
    if (query.eventId) where.eventId = query.eventId;
    if (query.status) where.status = query.status;
    if (query.category) where.ticketCategory = query.category;
    if (query.search) {
      where.OR = [
        { ticketNumber: { contains: query.search, mode: 'insensitive' } },
        { attendeeName: { contains: query.search, mode: 'insensitive' } },
        { attendeeEmail: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        event: { select: { title: true } },
        ticketType: { select: { name: true } },
        order: { select: { orderNumber: true } },
        checkIn: { select: { checkedInAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // CSV header
    const headers = [
      'Ticket Number',
      'Attendee Name',
      'Email',
      'Phone',
      'Event',
      'Ticket Type',
      'Category',
      'Order Number',
      'Source',
      'Status',
      'Issued At',
      'Checked In At',
    ];

    // CSV escape helper (same as exportOrdersCsv)
    const esc = (v: unknown): string => {
      const s = String(v ?? '');
      const dangerous = /^[=+\-@]/.test(s);
      const needsQuotes = /[,"\n\r]/.test(s) || dangerous;
      const escaped = s.replace(/"/g, '""');
      const final = dangerous ? `'${escaped}` : escaped;
      return needsQuotes ? `"${final}"` : final;
    };

    const headerLine = headers.join(',') + '\n';
    const rows = tickets.map((t) =>
      [
        t.ticketNumber,
        t.attendeeName,
        t.attendeeEmail,
        t.attendeePhone ? `="${t.attendeePhone}"` : '',
        t.event.title,
        t.ticketType?.name || '',
        t.ticketCategory,
        t.order?.orderNumber || '',
        t.source,
        t.status,
        t.createdAt.toISOString(),
        t.checkedInAt?.toISOString() || '',
      ].map(esc).join(','),
    );

    const csvContent = '\uFEFF' + headerLine + rows.join('\n');

    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', 'attachment; filename="tickets-export.csv"');
    reply.header('Cache-Control', 'no-cache');
    return reply.send(csvContent);
  }

  // ── Audit Logs ────────────────────────────────────────────

  async listAuditLogs(request: FastifyRequest, _reply: FastifyReply) {
    const query = request.query as { eventId?: string; action?: string; page?: string; limit?: string };
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '50', 10);
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (query.eventId) where.eventId = query.eventId;
    if (query.action) where.action = query.action;
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit, include: { actor: { select: { name: true, email: true, role: true } } } }),
      prisma.auditLog.count({ where }),
    ]);
    return { logs, total, page, limit };
  }

  // ── Google Drive Test ──────────────────────────────────────

  /**
   * GET /admin/drive/test
   * Diagnoses Google Drive configuration and tests connectivity.
   * Shows exactly which env vars are set/missing.
   */
  async testDriveConnection(request: FastifyRequest, reply: FastifyReply) {
    void request;

    const driveEnabled = process.env.GOOGLE_DRIVE_ENABLED === 'true';
    const keyJson       = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON;
    const projectId     = process.env.GOOGLE_PROJECT_ID;
    const clientEmail   = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey    = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

    // ── Config diagnosis ──────────────────────────────────
    const configCheck = {
      GOOGLE_DRIVE_ENABLED:               driveEnabled ? '✓ true' : '✗ not set or false',
      GOOGLE_SERVICE_ACCOUNT_KEY_JSON:    keyJson     ? `✓ set (${keyJson.length} chars)` : '✗ not set',
      GOOGLE_PROJECT_ID:                  projectId   ? `✓ ${projectId}` : '✗ not set',
      GOOGLE_SERVICE_ACCOUNT_EMAIL:       clientEmail ? `✓ ${clientEmail}` : '✗ not set',
      GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: privateKey  ? `✓ set (${privateKey.length} chars, starts with ${privateKey.slice(0, 27)}...)` : '✗ not set',
    };

    const hasKeyJson  = !!keyJson;
    const hasIndivual = !!(projectId && clientEmail && privateKey);
    const hasCreds    = hasKeyJson || hasIndivual;

    if (!driveEnabled) {
      return reply.send({
        ok: false,
        diagnosis: 'DRIVE_DISABLED',
        message: 'Set GOOGLE_DRIVE_ENABLED=true on Render to enable Drive uploads.',
        config: configCheck,
      });
    }

    if (!hasCreds) {
      return reply.send({
        ok: false,
        diagnosis: 'MISSING_CREDENTIALS',
        message: 'Drive is enabled but credentials are missing. Set GOOGLE_SERVICE_ACCOUNT_KEY_JSON (preferred) OR all three: GOOGLE_PROJECT_ID + GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.',
        config: configCheck,
      });
    }

    // ── Validate JSON if using key blob ───────────────────
    if (hasKeyJson && !hasIndivual) {
      try {
        const parsed = JSON.parse(keyJson!);
        if (!parsed.client_email || !parsed.private_key) {
          return reply.send({
            ok: false,
            diagnosis: 'INVALID_KEY_JSON',
            message: 'GOOGLE_SERVICE_ACCOUNT_KEY_JSON is valid JSON but missing client_email or private_key fields.',
            config: configCheck,
          });
        }
      } catch {
        return reply.send({
          ok: false,
          diagnosis: 'INVALID_KEY_JSON',
          message: 'GOOGLE_SERVICE_ACCOUNT_KEY_JSON is not valid JSON. Make sure it is pasted as a single line with no line breaks.',
          config: configCheck,
        });
      }
    }

    // ── Attempt real Drive connection ──────────────────────
    try {
      const driveService = new GoogleDriveService();
      const connectivity = await driveService.testConnectivity();

      // Try uploading a test file to verify full write access
      let uploadTest: { ok: boolean; fileId?: string; viewUrl?: string; error?: string };
      try {
        const uploadResult = await driveService.uploadTestFile();
        uploadTest = { ok: true, fileId: uploadResult.fileId, viewUrl: uploadResult.viewUrl };
        await driveService.deleteFile(uploadResult.fileId).catch(() => {});
      } catch (upErr) {
        uploadTest = { ok: false, error: upErr instanceof Error ? upErr.message : String(upErr) };
      }

      return reply.send({
        ok: uploadTest.ok,
        diagnosis: uploadTest.ok ? 'ALL_GOOD' : 'UPLOAD_FAILED',
        message: uploadTest.ok
          ? '✅ Google Drive is fully working. Payment proofs will be uploaded.'
          : '⚠️ Drive connection succeeded but upload test failed. Check service account folder permissions.',
        config: configCheck,
        connectivity,
        uploadTest,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(502).send({
        ok: false,
        diagnosis: 'CONNECTION_FAILED',
        message: `Drive connection failed: ${message}`,
        config: configCheck,
      });
    }
  }

  // ── Tickets ────────────────────────────────────────────────

  /**
   * GET /admin/tickets
   * Paginated list of all tickets with filters.
   */
  async listTickets(request: FastifyRequest, _reply: FastifyReply) {
    const query = request.query as {
      eventId?: string;
      status?: string;
      category?: string;
      search?: string;
      page?: string;
      limit?: string;
    };
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '30', 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.eventId) where.eventId = query.eventId;
    if (query.status) where.status = query.status;
    if (query.category) where.ticketCategory = query.category;
    if (query.search) {
      where.OR = [
        { ticketNumber: { contains: query.search, mode: 'insensitive' } },
        { attendeeName: { contains: query.search, mode: 'insensitive' } },
        { attendeeEmail: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          event: { select: { id: true, title: true, slug: true, startAt: true, venueName: true } },
          ticketType: { select: { name: true, price: true } },
          order: { select: { orderNumber: true, status: true } },
          attendee: { select: { attendeeName: true } },
          checkIn: { select: { checkedInAt: true, result: true } },
          issuedBy: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.ticket.count({ where }),
    ]);

    return { tickets, total, page, limit };
  }

  /**
   * GET /admin/tickets/:ticketNumber
   * Full detail for a single ticket.
   */
  async getTicket(request: FastifyRequest, reply: FastifyReply) {
    const { ticketNumber } = request.params as { ticketNumber: string };

    const ticket = await prisma.ticket.findUnique({
      where: { ticketNumber },
      include: {
        event: {
          select: {
            id: true, title: true, slug: true, posterObjectKey: true,
            startAt: true, endAt: true, venueName: true, venueAddress: true,
            mapUrl: true, status: true, organizerId: true,
            organizer: { select: { id: true, name: true } },
          },
        },
        ticketType: { select: { id: true, name: true, price: true, currency: true } },
        order: { select: { id: true, orderNumber: true, status: true, total: true } },
        attendee: { select: { id: true, attendeeName: true, attendeeEmail: true } },
        checkIn: { select: { checkedInAt: true, result: true, scannerId: true, gateName: true } },
        user: { select: { id: true, name: true, email: true } },
        issuedBy: { select: { name: true } },
      },
    });

    if (!ticket) {
      return reply.status(404).send({ error: 'Ticket not found' });
    }

    return { ticket };
  }

  /**
   * POST /admin/tickets/:ticketNumber/cancel
   * Cancel (soft-delete) any ticket by ticket number.
   *
   * Sets status to CANCELLED so the scanner rejects it.
   * Also releases the reserved capacity (decrements soldCount)
   * for the ticket's associated order.
   *
   * Does NOT hard-delete the record — preserves audit trail,
   * QR token, check-in history, and order linkage.
   *
   * Idempotent: cancelling an already-CANCELLED ticket returns
   * success without error.
   */
  async cancelTicket(request: FastifyRequest, reply: FastifyReply) {
    const { ticketNumber } = request.params as { ticketNumber: string };
    const adminId = request.user!.id;

    const ticket = await prisma.ticket.findUnique({
      where: { ticketNumber },
      include: {
        order: { select: { id: true } },
      },
    });

    if (!ticket) {
      return reply.status(404).send({ error: 'Ticket not found' });
    }

    if (ticket.status === 'CANCELLED') {
      // Idempotent: already cancelled, return success
      return reply.send({
        success: true,
        message: 'Ticket was already cancelled.',
        ticket: { ticketNumber: ticket.ticketNumber, status: 'CANCELLED' },
      });
    }

    if (ticket.status === 'CHECKED_IN') {
      return reply.status(409).send({
        code: 'TICKET_ALREADY_CHECKED_IN',
        error: 'Cannot cancel a ticket that has already been checked in. Revoke check-in first.',
      });
    }

    // Update ticket status to CANCELLED and release 1 unit of capacity
    await prisma.ticket.update({
      where: { ticketNumber },
      data: { status: 'CANCELLED' },
    });

    // Release capacity for this specific ticket (1 unit)
    const ticketType = await prisma.ticketType.findUnique({
      where: { id: ticket.ticketTypeId },
    });
    if (ticketType) {
      const newSoldCount = Math.max(0, ticketType.soldCount - 1);
      await prisma.ticketType.update({
        where: { id: ticket.ticketTypeId },
        data: { soldCount: newSoldCount },
      });
    }

    await writeAuditLog('TICKET_CANCELLED', 'Ticket', ticket.id, {
      actorId: adminId,
      actorRole: 'ADMIN',
      eventId: ticket.eventId,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      metadata: {
        ticketNumber: ticket.ticketNumber,
        attendeeName: ticket.attendeeName,
        ticketCategory: ticket.ticketCategory,
        previousStatus: ticket.status,
      },
    });

    return reply.send({
      success: true,
      message: `Ticket ${ticket.ticketNumber} has been cancelled. Capacity released.`,
      ticket: {
        ticketNumber: ticket.ticketNumber,
        previousStatus: ticket.status,
        status: 'CANCELLED',
      },
    });
  }

  /**
   * POST /admin/orders/:id/cancel
   * Cancel a pending order and release its reserved capacity.
   *
   * Eligible statuses: PENDING_PAYMENT, PENDING_VERIFICATION, REJECTED.
   * Does NOT apply to already-CONFIRMED orders (use ticket cancellation instead).
   *
   * Releases capacity (decrements soldCount) for all ticket types
   * associated with the order's attendees.
   */
  async cancelOrder(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const adminId = request.user!.id;

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        eventId: true,
      },
    });

    if (!order) {
      return reply.status(404).send({ error: 'Order not found' });
    }

    // Cannot cancel confirmed orders — cancel individual tickets instead
    // REJECTED is excluded because rejection already releases capacity.
    const cancellableStates = ['PENDING_PAYMENT', 'PENDING_VERIFICATION', 'EXPIRED'];
    if (!cancellableStates.includes(order.status)) {
      return reply.status(409).send({
        code: 'ORDER_NOT_CANCELLABLE',
        error: `Order status is "${order.status}" — cannot cancel. Only PENDING_PAYMENT, PENDING_VERIFICATION, or EXPIRED orders can be cancelled.`,
      });
    }

    // Release capacity and mark order as CANCELLED in a transaction
    const released = await prisma.$transaction(async (tx) => {
      // Group attendees by ticket type
      const attendees = await tx.orderAttendee.findMany({
        where: { orderId: order.id },
        select: { ticketTypeId: true },
      });

      const typeCounts = new Map<string, number>();
      for (const a of attendees) {
        typeCounts.set(a.ticketTypeId, (typeCounts.get(a.ticketTypeId) || 0) + 1);
      }

      const rel: { ticketTypeId: string; quantity: number }[] = [];
      for (const [ticketTypeId, quantity] of typeCounts) {
        const tt = await tx.ticketType.findUnique({ where: { id: ticketTypeId } });
        if (tt) {
          await tx.ticketType.update({
            where: { id: ticketTypeId },
            data: { soldCount: Math.max(0, tt.soldCount - quantity) },
          });
          rel.push({ ticketTypeId, quantity });
        }
      }

      await tx.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      });

      return rel;
    });

    await writeAuditLog('ORDER_CANCELLED', 'Order', order.id, {
      actorId: adminId,
      actorRole: 'ADMIN',
      eventId: order.eventId,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      metadata: {
        orderNumber: order.orderNumber,
        previousStatus: order.status,
        capacityReleased: released,
      },
    });

    return reply.send({
      success: true,
      message: `Order ${order.orderNumber} has been cancelled. Capacity released.`,
      order: {
        orderNumber: order.orderNumber,
        previousStatus: order.status,
        status: 'CANCELLED',
        capacityReleased: released.length,
      },
    });
  }

  // ── Expired Orders Processing ────────────────────────────

  /**
   * POST /admin/orders/process-expired
   * Find expired pending orders and release their reserved capacity.
   * Idempotent: only processes orders with expiresAt < now() and status PENDING_PAYMENT.
   * Marks them EXPIRED and decrements soldCount atomically.
   */
  async processExpiredOrders(request: FastifyRequest, reply: FastifyReply) {
    const adminId = request.user!.id;
    const now = new Date();

    const expiredOrders = await prisma.order.findMany({
      where: {
        status: 'PENDING_PAYMENT',
        expiresAt: { lt: now },
      },
      select: { id: true, orderNumber: true, eventId: true },
    });

    let processed = 0;
    for (const order of expiredOrders) {
      await prisma.$transaction(async (tx) => {
        // Re-check status inside transaction to prevent race
        const current = await tx.order.findUnique({
          where: { id: order.id },
          select: { status: true },
        });
        if (!current || current.status !== 'PENDING_PAYMENT') return;

        // Release reserved capacity
        const attendees = await tx.orderAttendee.findMany({
          where: { orderId: order.id },
          select: { ticketTypeId: true },
        });
        const typeCounts = new Map<string, number>();
        for (const a of attendees) {
          typeCounts.set(a.ticketTypeId, (typeCounts.get(a.ticketTypeId) || 0) + 1);
        }
        for (const [ticketTypeId, quantity] of typeCounts) {
          const tt = await tx.ticketType.findUnique({ where: { id: ticketTypeId } });
          if (tt) {
            await tx.ticketType.update({
              where: { id: ticketTypeId },
              data: { soldCount: Math.max(0, tt.soldCount - quantity) },
            });
          }
        }

        await tx.order.update({
          where: { id: order.id },
          data: { status: 'EXPIRED' },
        });
      });

      await writeAuditLog('ORDER_EXPIRED', 'Order', order.id, {
        actorId: adminId, actorRole: 'ADMIN', eventId: order.eventId,
        metadata: { orderNumber: order.orderNumber },
      });

      processed++;
    }

    return reply.send({
      processed,
      message: processed === 0
        ? 'No expired orders found.'
        : `${processed} expired order(s) processed. Capacity released.`,
    });
  }

  // ── CSV Export ────────────────────────────────────────────

  /**
   * GET /admin/orders/export.csv
   * Stream a CSV export of orders matching the current filters.
   * Supports same filters as listOrders.
   * Prevents CSV injection by prefixing dangerous values.
   */
  async exportOrdersCsv(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as {
      status?: string;
      eventId?: string;
      paymentMethod?: string;
      search?: string;
    };

    const where: Record<string, unknown> = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.eventId) where.eventId = query.eventId;

    // Build the filter for the search query
    if (query.search) {
      where.OR = [
        { orderNumber: { contains: query.search, mode: 'insensitive' } },
        { user: { name: { contains: query.search, mode: 'insensitive' } } },
        { user: { email: { contains: query.search, mode: 'insensitive' } } },
        { user: { phone: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        event: { select: { title: true, slug: true } },
        attendees: {
          include: { ticketType: { select: { name: true, price: true } } },
        },
        tickets: {
          select: { ticketNumber: true, status: true },
        },
        paymentProof: {
          select: {
            utrNumber: true,
            status: true,
            rejectionReason: true,
            reviewedBy: { select: { name: true } },
            reviewedAt: true,
          },
        },
      },
    });

    // CSV header
    const headers = [
      'Order Number',
      'Created At',
      'Event Name',
      'Ticket Type',
      'Quantity',
      'Customer Name',
      'Email',
      'Phone Number',
      'Payment Method',
      'Payment Reference',
      'Payment Status',
      'Order Status',
      'Verification Status',
      'Reviewed By',
      'Reviewed At',
      'Rejection Reason',
      'Ticket Numbers',
      'Ticket Status',
      'Checked In Count',
      'Total Amount',
    ];

    // Escape a CSV value: wrap in quotes if contains comma, quote, or newline
    // Prefix dangerous values (=, +, -, @) to prevent spreadsheet formula injection
    const esc = (v: unknown): string => {
      const s = String(v ?? '');
      const dangerous = /^[=+\-@]/.test(s);
      const needsQuotes = /[,"\n\r]/.test(s) || dangerous;
      const escaped = s.replace(/"/g, '""');
      const final = dangerous ? `'${escaped}` : escaped;
      return needsQuotes ? `"${final}"` : final;
    };

    const headerLine = headers.map(esc).join(',') + '\n';

    // Build CSV rows (stream manually by joining — manageable for typical export volumes)
    const rows = orders.map((o) => {
      const paymentProof = o.paymentProof;
      const ticketTypeNames = [...new Set(o.attendees.map((a) => a.ticketType?.name).filter(Boolean))].join('; ');
      const ticketNumbers = o.tickets.map((t) => t.ticketNumber).join('; ');
      const ticketStatuses = [...new Set(o.tickets.map((t) => t.status))].join('; ');
      const checkedInCount = o.tickets.filter((t: { status: string }) => t.status === 'CHECKED_IN').length;

      return [
        o.orderNumber,
        o.createdAt.toISOString(),
        o.event.title,
        ticketTypeNames,
        o.attendees.length,
        o.user.name,
        o.user.email,
        o.user.phone ? `="${o.user.phone}"` : '',  // Force text format for phone
        o.paymentMethod,
        paymentProof?.utrNumber || '',
        '', // Payment status (not directly tracked on order level)
        o.status,
        paymentProof?.status || '',
        paymentProof?.reviewedBy?.name || '',
        paymentProof?.reviewedAt?.toISOString() || '',
        paymentProof?.rejectionReason || '',
        ticketNumbers,
        ticketStatuses,
        checkedInCount,
        (o.total / 100).toFixed(2),
      ].map(esc).join(',');
    });

    const csvContent = '\uFEFF' + headerLine + rows.join('\n'); // BOM for Excel UTF-8

    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', 'attachment; filename="orders-export.csv"');
    reply.header('Cache-Control', 'no-cache');
    return reply.send(csvContent);
  }

  // ── Check-in Stats (live widget data) ───────────────────

  /**
   * GET /admin/events/:id/checkin-stats
   * Returns real-time check-in stats for the event dashboard widget.
   * Used by the CheckInStatsCard component with auto-polling.
   */
  async getCheckinStats(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };

    const event = await prisma.event.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!event) return reply.status(404).send({ error: 'Event not found' });

    // Aggregate check-in stats
    const [totalTickets, checkedIn] = await Promise.all([
      prisma.ticket.count({
        where: { eventId: id, status: { in: ['CONFIRMED', 'CHECKED_IN'] } },
      }),
      prisma.ticket.count({
        where: { eventId: id, status: 'CHECKED_IN' },
      }),
    ]);

    // Aggregate capacity and sold counts
    const ticketTypes = await prisma.ticketType.findMany({
      where: { eventId: id },
      select: { capacity: true, soldCount: true },
    });

    const totalCapacity = ticketTypes.reduce((sum, tt) => sum + (tt.capacity > 0 ? tt.capacity : 0), 0);
    const totalSold = ticketTypes.reduce((sum, tt) => sum + tt.soldCount, 0);

    return {
      totalTickets,
      checkedIn,
      remaining: totalTickets - checkedIn,
      totalCapacity: totalCapacity || null, // null means unlimited
      totalSold,
      hasCapacityTypes: ticketTypes.some((tt) => tt.capacity > 0),
    };
  }

  // ── Check-ins ─────────────────────────────────────────────

  async listCheckIns(request: FastifyRequest, _reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const checkIns = await prisma.checkIn.findMany({
      where: { eventId: id },
      include: { ticket: { select: { ticketNumber: true, ticketCategory: true } }, scanner: { select: { name: true, email: true } } },
      orderBy: { checkedInAt: 'desc' },
      take: 100,
    });
    return { checkIns };
  }

}
