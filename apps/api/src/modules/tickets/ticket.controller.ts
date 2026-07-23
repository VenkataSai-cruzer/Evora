import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../infrastructure/database/prisma.js';
import { generateQrCodeDataUrl } from '../../infrastructure/rendering/qr.service.js';
import { renderTicketHtml } from '../../infrastructure/rendering/ticket.service.js';
import { renderTicketPng, renderTicketPdf } from '../../infrastructure/rendering/ticket.renderer.js';

export class TicketController {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user!.id;
    const query = request.query as { eventId?: string; status?: string };

    try {
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      request.log.error({ err, userId }, 'Failed to list tickets');
      return reply.status(500).send({ error: 'Failed to load tickets', message });
    }
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

    if (ticket.userId !== request.user!.id && request.user!.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Access denied' });
    }

    if (!ticket.pdfObjectKey && !ticket.pngObjectKey) {
      return reply.status(404).send({ error: 'Ticket file not yet generated' });
    }

    return {
      ticketNumber: ticket.ticketNumber,
      pngKey: ticket.pngObjectKey,
      pdfKey: ticket.pdfObjectKey,
    };
  }

  /**
   * GET /tickets/:ticketNumber/qr
   * Returns the QR code data URL for the ticket owner.
   * The raw qrToken is never sent — only the rendered QR image.
   */
  async getQrCode(request: FastifyRequest, reply: FastifyReply) {
    const { ticketNumber } = request.params as { ticketNumber: string };

    const ticket = await prisma.ticket.findUnique({
      where: { ticketNumber },
      select: { userId: true, qrToken: true, status: true },
    });

    if (!ticket) {
      return reply.status(404).send({ error: 'Ticket not found' });
    }

    // Only the ticket owner or admin can see the QR
    if (ticket.userId !== request.user!.id && request.user!.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Access denied' });
    }

    if (!ticket.qrToken) {
      return reply.status(404).send({ error: 'QR code not available yet' });
    }

    if (ticket.status === 'CANCELLED' || ticket.status === 'EXPIRED') {
      return reply.status(400).send({ error: 'Ticket is no longer valid' });
    }

    const qrDataUrl = await generateQrCodeDataUrl(ticket.qrToken);
    return { qrCodeUrl: qrDataUrl };
  }

  /**
   * GET /tickets/:ticketNumber/html
   * Render the ticket as HTML (for PDF generation on client or print).
   */
  async renderHtml(request: FastifyRequest, reply: FastifyReply) {
    const { ticketNumber } = request.params as { ticketNumber: string };

    const ticket = await prisma.ticket.findUnique({
      where: { ticketNumber },
      include: {
        event: true,
        ticketType: true,
        order: { select: { orderNumber: true } },
      },
    });

    if (!ticket) return reply.status(404).send({ error: 'Ticket not found' });
    if (ticket.userId !== request.user!.id && request.user!.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Access denied' });
    }
    if (!ticket.qrToken) return reply.status(404).send({ error: 'Ticket not ready' });

    const html = await renderTicketHtml({
      ticketNumber: ticket.ticketNumber,
      attendeeName: ticket.attendeeName,
      attendeeEmail: ticket.attendeeEmail,
      attendeePhone: ticket.attendeePhone,
      eventTitle: ticket.event.title,
      eventDate: ticket.event.startAt.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      eventTime: ticket.event.startAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      venueName: ticket.event.venueName,
      venueAddress: ticket.event.venueAddress || '',
      ticketType: ticket.ticketType.name,
      ticketCategory: ticket.ticketCategory,
      orderNumber: ticket.order?.orderNumber,
      qrToken: ticket.qrToken,
      terms: ticket.event.terms || undefined,
    });

    reply.header('Content-Type', 'text/html');
    return reply.send(html);
  }

  /**
   * GET /tickets/:ticketNumber/render
   * Renders the ticket as a PNG image using the Ticket.png template.
   * Authenticated — requires ticket ownership or ADMIN.
   */
  async renderPng(request: FastifyRequest, reply: FastifyReply) {
    const { ticketNumber } = request.params as { ticketNumber: string };

    const ticket = await prisma.ticket.findUnique({
      where: { ticketNumber },
      include: {
        event: { select: { title: true, startAt: true, venueName: true, venueAddress: true } },
        ticketType: { select: { name: true } },
        order: { select: { orderNumber: true } },
      },
    });

    if (!ticket) return reply.status(404).send({ error: 'Ticket not found' });
    if (ticket.userId !== request.user!.id && request.user!.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Access denied' });
    }
    if (!ticket.qrToken) return reply.status(404).send({ error: 'Ticket not ready' });

    const venue = ticket.event.venueAddress
      ? `${ticket.event.venueName}, ${ticket.event.venueAddress}`
      : ticket.event.venueName;

    try {
      const pngBuffer = await renderTicketPng({
        eventTitle: ticket.event.title,
        eventDate: ticket.event.startAt.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        eventTime: ticket.event.startAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        venue,
        attendeeName: ticket.attendeeName || 'Attendee',
        ticketType: ticket.ticketType.name,
        ticketNumber: ticket.ticketNumber,
        orderNumber: ticket.order?.orderNumber || '',
        qrPayload: ticket.qrToken,
      });

      reply.header('Content-Type', 'image/png');
      reply.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      return reply.send(pngBuffer);
    } catch (error) {
      request.log.error({ error, ticketNumber }, 'Failed to render ticket PNG');
      return reply.status(500).send({ error: 'Ticket rendering failed' });
    }
  }

  /**
   * GET /tickets/:ticketNumber/download
   * Downloads the ticket as a PDF.
   */
  async downloadPdf(request: FastifyRequest, reply: FastifyReply) {
    const { ticketNumber } = request.params as { ticketNumber: string };

    const ticket = await prisma.ticket.findUnique({
      where: { ticketNumber },
      include: {
        event: { select: { title: true, startAt: true, venueName: true, venueAddress: true } },
        ticketType: { select: { name: true } },
        order: { select: { orderNumber: true } },
      },
    });

    if (!ticket) return reply.status(404).send({ error: 'Ticket not found' });
    if (ticket.userId !== request.user!.id && request.user!.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Access denied' });
    }
    if (!ticket.qrToken) return reply.status(404).send({ error: 'Ticket not ready' });

    const venue = ticket.event.venueAddress
      ? `${ticket.event.venueName}, ${ticket.event.venueAddress}`
      : ticket.event.venueName;

    try {
      const pdfBuffer = await renderTicketPdf({
        eventTitle: ticket.event.title,
        eventDate: ticket.event.startAt.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        eventTime: ticket.event.startAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        venue,
        attendeeName: ticket.attendeeName || 'Attendee',
        ticketType: ticket.ticketType.name,
        ticketNumber: ticket.ticketNumber,
        orderNumber: ticket.order?.orderNumber || '',
        qrPayload: ticket.qrToken,
      });

      const safeFilename = ticketNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', `attachment; filename="${safeFilename}.pdf"`);
      reply.header('Cache-Control', 'private, no-cache');
      return reply.send(pdfBuffer);
    } catch (error) {
      request.log.error({ error, ticketNumber }, 'Failed to render ticket PDF');
      return reply.status(500).send({ error: 'PDF generation failed' });
    }
  }
}
