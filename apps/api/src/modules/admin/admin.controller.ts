import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../infrastructure/database/prisma.js';
import { finalizeApprovedOrder } from '../orders/order-finalization.service.js';
import { generateQrToken } from '../../infrastructure/rendering/qr.service.js';
import { writeAuditLog } from '../../infrastructure/audit/audit.service.js';
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

  async updateTicketType(request: FastifyRequest, _reply: FastifyReply) {
    const { ticketTypeId } = request.params as { ticketTypeId: string };
    const body = request.body as Record<string, unknown>;
    const ticketType = await prisma.ticketType.update({ where: { id: ticketTypeId }, data: body });
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
    const query = request.query as { status?: string; eventId?: string; page?: string; limit?: string };
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    // Default: show both PENDING_PAYMENT (no proof yet) and PENDING_VERIFICATION (proof submitted, awaiting review)
    if (query.status) {
      where.status = query.status;
    } else {
      where.status = { in: ['PENDING_PAYMENT', 'PENDING_VERIFICATION'] };
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

      // Update PaymentProof status
      await prisma.paymentProof.update({
        where: { orderId: id },
        data: { status: 'APPROVED', reviewedAt: new Date(), reviewedById: adminId },
      });

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
   * Capacity is NOT released on rejection (remains reserved for the order).
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
        // Order stays alive at REJECTED — NOT CANCELLED
        // Capacity remains reserved — user can resubmit proof
        // Rejection reason stored on PaymentProof (not duplicated on Order)
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

    const tickets = [];
    for (let i = 0; i < qty; i++) {
      const { token, tokenHash } = generateQrToken();
      const seq = i + 1;
      const prefix = event.ticketNumberPrefix || '7N-';
      const ticketNumber = `${prefix}COMP-${Date.now()}-${String(seq).padStart(2, '0')}`;

      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber, eventId, userId: attendeeUser.id,
          ticketTypeId, attendeeName: body.attendeeName,
          attendeeEmail: body.attendeeEmail.toLowerCase(),
          attendeePhone: body.attendeePhone || '',
          ticketCategory: body.ticketCategory,
          source: 'ADMIN_MANUAL', visibility: 'ADMIN_ONLY',
          issuedById: adminId, issuedByRole: 'ADMIN',
          pricePaid: 0, status: 'CONFIRMED',
          qrToken: token, qrTokenHash: tokenHash,
          templateVersion: 1, renderingStatus: 'PENDING',
        },
      });
      tickets.push(ticket);
    }

    await writeAuditLog('COMPLIMENTARY_TICKET_CREATED', 'Event', eventId, {
      actorId: adminId, actorRole: 'ADMIN', eventId,
      ipAddress: request.ip, userAgent: request.headers['user-agent'],
      metadata: { category: body.ticketCategory, reason: body.reason, internalNote: body.internalNote, quantity: qty, attendeeEmail: body.attendeeEmail },
    });

    // Email notifications disabled until verified domain is set up.

    return reply.status(201).send({
      success: true,
      tickets: tickets.map((t) => ({ ticketNumber: t.ticketNumber, ticketCategory: t.ticketCategory, status: t.status })),
      count: tickets.length,
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
