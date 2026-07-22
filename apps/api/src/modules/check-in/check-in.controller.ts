import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../infrastructure/database/prisma.js';
import { hashQrToken } from '../../infrastructure/rendering/qr.service.js';
import { writeAuditLog } from '../../infrastructure/audit/audit.service.js';

export class CheckInController {
  /**
   * POST /check-in/verify
   *
   * Scan a QR token. Enforces:
   * - Scanner assigned to event (or ADMIN)
   * - Ticket belongs to event
   * - Ticket is active/confirmed
   * - One-time check-in (atomic, race-safe)
   *
   * Every scan is recorded in CheckInAttempt.
   * Only one SUCCESS per ticket (enforced by CheckIn unique constraint).
   */
  async verify(request: FastifyRequest, reply: FastifyReply) {
    const { qrToken, eventId, gateName, scannerDevice } = request.body as {
      qrToken: string;
      eventId?: string;
      gateName?: string;
      scannerDevice?: string;
    };
    const scannerId = request.user!.id;
    const scannerRole = request.user!.role;

    if (!qrToken) {
      return reply.status(400).send({ error: 'qrToken is required' });
    }

    const tokenHash = hashQrToken(qrToken);

    const ticket = await prisma.ticket.findUnique({
      where: { qrTokenHash: tokenHash },
      include: {
        event: { select: { id: true, title: true, status: true } },
        ticketType: { select: { name: true } },
        checkIn: true,
      },
    });

    // Helper to record every attempt
    const recordAttempt = async (
      result: string,
      tId: string,
      eId: string,
      meta?: Record<string, unknown>,
    ) => {
      await prisma.checkInAttempt.create({
        data: {
          ticketId: tId,
          eventId: eId,
          scannerId,
          gateName: gateName ?? null,
          scannerDevice: scannerDevice ?? request.headers['user-agent'] ?? null,
          result,
          metadata: JSON.stringify(meta ?? {}),
        },
      }).catch((e) => console.error('[CheckIn] Failed to record attempt:', e));
    };

    if (!ticket) {
      return reply.status(200).send({ result: 'INVALID_TICKET', message: 'Ticket not found or QR invalid' });
    }

    // Validate event match
    if (eventId && ticket.eventId !== eventId) {
      await recordAttempt('WRONG_EVENT', ticket.id, eventId || ticket.eventId, { expectedEventId: eventId, ticketEventId: ticket.eventId });
      return reply.send({ result: 'WRONG_EVENT', message: 'This ticket is for a different event' });
    }

    const resolvedEventId = ticket.eventId;

    // Verify scanner is assigned to this event (skip for ADMIN)
    if (scannerRole === 'SCANNER') {
      const assignment = await prisma.scannerAssignment.findUnique({
        where: { scannerId_eventId: { scannerId, eventId: resolvedEventId } },
        select: { isActive: true },
      });
      if (!assignment || !assignment.isActive) {
        await recordAttempt('NOT_ACTIVE', ticket.id, resolvedEventId);
        return reply.status(403).send({ error: 'Not assigned to this event or assignment inactive' });
      }
    }

    // Ticket status checks
    if (ticket.status === 'CANCELLED') {
      await recordAttempt('CANCELLED', ticket.id, resolvedEventId);
      return reply.send({ result: 'CANCELLED', message: 'This ticket has been cancelled' });
    }

    if (ticket.status === 'EXPIRED') {
      await recordAttempt('EXPIRED', ticket.id, resolvedEventId);
      return reply.send({ result: 'EXPIRED', message: 'This ticket has expired' });
    }

    // Already checked in?
    if (ticket.checkIn) {
      await recordAttempt('ALREADY_CHECKED_IN', ticket.id, resolvedEventId, {
        originalCheckedInAt: ticket.checkIn.checkedInAt,
        originalScannerId: ticket.checkIn.scannerId,
      });

      const originalScanner = await prisma.user.findUnique({
        where: { id: ticket.checkIn.scannerId },
        select: { name: true },
      });

      await writeAuditLog('CHECK_IN_DUPLICATE', 'Ticket', ticket.id, {
        actorId: scannerId, eventId: resolvedEventId,
        metadata: { ticketNumber: ticket.ticketNumber, originalScannerId: ticket.checkIn.scannerId },
      });

      return reply.send({
        result: 'ALREADY_CHECKED_IN',
        message: 'Ticket already checked in',
        ticketNumber: ticket.ticketNumber,
        attendeeName: ticket.attendeeName,
        ticketCategory: ticket.ticketCategory,
        event: ticket.event.title,
        originalCheckedInAt: ticket.checkIn.checkedInAt,
        originalCheckedInBy: originalScanner?.name ?? 'Unknown',
        originalGateName: ticket.checkIn.gateName,
        currentScanAt: new Date(),
      });
    }

    // Attempt atomic check-in
    try {
      const result = await prisma.$transaction(
        async (tx) => {
          // Re-read with lock to catch concurrent scans
          const current = await tx.ticket.findUnique({ where: { id: ticket.id }, include: { checkIn: true } });
          if (!current) throw new Error('TICKET_GONE');
          if (current.checkIn) throw new Error('ALREADY_CHECKED_IN');
          if (current.status !== 'CONFIRMED') throw new Error(`STATUS_${current.status}`);

          // Update ticket
          await tx.ticket.update({
            where: { id: ticket.id },
            data: { status: 'CHECKED_IN', checkedInAt: new Date(), checkedInById: scannerId, gateName: gateName ?? null },
          });

          // Create immutable CheckIn record
          const checkIn = await tx.checkIn.create({
            data: {
              ticketId: ticket.id,
              eventId: resolvedEventId,
              scannerId,
              gateName: gateName ?? null,
              scannerDevice: scannerDevice ?? request.headers['user-agent'] ?? null,
              result: 'SUCCESS',
              metadata: JSON.stringify({ ticketCategory: ticket.ticketCategory }),
            },
          });

          return checkIn;
        },
        { isolationLevel: 'Serializable' },
      );

      await recordAttempt('SUCCESS', ticket.id, resolvedEventId);

      await writeAuditLog('CHECK_IN_SUCCESS', 'Ticket', ticket.id, {
        actorId: scannerId, eventId: resolvedEventId,
        metadata: { ticketNumber: ticket.ticketNumber, gateName, ticketCategory: ticket.ticketCategory },
      });

      return reply.send({
        result: 'SUCCESS',
        message: 'Check-in successful',
        ticketNumber: ticket.ticketNumber,
        attendeeName: ticket.attendeeName,
        attendeeEmail: ticket.attendeeEmail,
        ticketCategory: ticket.ticketCategory,
        ticketType: ticket.ticketType.name,
        event: ticket.event.title,
        checkedInAt: result.checkedInAt,
        checkedInBy: request.user!.name,
        gateName: result.gateName,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown';

      if (msg === 'ALREADY_CHECKED_IN') {
        await recordAttempt('ALREADY_CHECKED_IN', ticket.id, resolvedEventId);
        return reply.send({ result: 'ALREADY_CHECKED_IN', message: 'Ticket already checked in (concurrent scan)' });
      }

      throw err; // Let error handler deal with unexpected errors
    }
  }

  /**
   * POST /check-in/manual
   * Check in by ticket number instead of QR.
   */
  async manual(request: FastifyRequest, reply: FastifyReply) {
    const { ticketNumber, eventId, gateName, scannerDevice } = request.body as {
      ticketNumber: string;
      eventId?: string;
      gateName?: string;
      scannerDevice?: string;
    };

    if (!ticketNumber) {
      return reply.status(400).send({ error: 'Ticket number is required' });
    }

    const ticket = await prisma.ticket.findUnique({ where: { ticketNumber }, select: { qrToken: true } });
    if (!ticket?.qrToken) {
      return reply.status(404).send({ result: 'INVALID_TICKET', message: 'Ticket not found' });
    }

    // Delegate to verify using the real QR token
    request.body = { qrToken: ticket.qrToken, eventId, gateName, scannerDevice };
    return this.verify(request, reply);
  }

  /**
   * GET /check-in/scanner/events
   * List events the current scanner is assigned to.
   */
  async getScannerEvents(request: FastifyRequest, _reply: FastifyReply) {
    const scannerId = request.user!.id;
    const scannerRole = request.user!.role;

    if (scannerRole === 'ADMIN') {
      // Admins can see all published events
      const events = await prisma.event.findMany({
        where: { status: 'PUBLISHED' },
        select: { id: true, title: true, slug: true, startAt: true, venueName: true },
        orderBy: { startAt: 'asc' },
      });
      return { events };
    }

    const assignments = await prisma.scannerAssignment.findMany({
      where: { scannerId, isActive: true },
      include: { event: { select: { id: true, title: true, slug: true, startAt: true, venueName: true, status: true } } },
    });

    const events = assignments
      .filter((a) => a.event.status === 'PUBLISHED')
      .map((a) => ({ ...a.event, gateName: a.gateName }));

    return { events };
  }
}
