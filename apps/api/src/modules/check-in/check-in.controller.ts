import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../infrastructure/database/prisma.js';
import crypto from 'crypto';

export class CheckInController {
  async verify(request: FastifyRequest, reply: FastifyReply) {
    const { qrToken } = request.body as { qrToken: string };
    const scannerId = request.user!.id;

    if (!qrToken) {
      return reply.status(400).send({ error: 'QR token is required' });
    }

    const tokenHash = crypto.createHash('sha256').update(qrToken).digest('hex');

    const ticket = await prisma.ticket.findUnique({
      where: { qrTokenHash: tokenHash },
      include: { event: true, ticketType: true },
    });

    if (!ticket) {
      return reply.status(404).send({ result: 'INVALID', message: 'Ticket not found' });
    }

    // Validate ticket
    if (ticket.status === 'CANCELLED') {
      return reply.send({ result: 'INVALID', message: 'Ticket has been cancelled' });
    }

    if (ticket.status === 'CHECKED_IN' || ticket.checkedInAt) {
      const existingCheckIn = await prisma.checkIn.findUnique({
        where: { ticketId: ticket.id },
      });
      return reply.send({
        result: 'ALREADY_CHECKED_IN',
        message: 'Ticket already checked in',
        checkedInAt: existingCheckIn?.checkedInAt,
      });
    }

    // Transactional check-in to prevent race conditions
    const checkIn = await prisma.$transaction(async (tx) => {
      // Double-check inside transaction
      const currentTicket = await tx.ticket.findUnique({
        where: { id: ticket.id },
      });

      if (!currentTicket || currentTicket.status === 'CHECKED_IN' || currentTicket.checkedInAt) {
        throw new Error('ALREADY_CHECKED_IN');
      }

      await tx.ticket.update({
        where: { id: ticket.id },
        data: { status: 'CHECKED_IN', checkedInAt: new Date() },
      });

      return tx.checkIn.create({
        data: {
          ticketId: ticket.id,
          eventId: ticket.eventId,
          scannerId,
          result: 'VALID',
          deviceInfo: request.headers['user-agent'] || null,
        },
      });
    });

    return reply.send({
      result: 'VALID',
      message: 'Check-in successful',
      attendeeName: ticket.attendee?.attendeeName || 'Unknown',
      ticketType: ticket.ticketType.name,
      ticketNumber: ticket.ticketNumber,
      checkedInAt: checkIn.checkedInAt,
    });
  }

  async manual(request: FastifyRequest, reply: FastifyReply) {
    const { ticketNumber } = request.body as { ticketNumber: string };

    if (!ticketNumber) {
      return reply.status(400).send({ error: 'Ticket number is required' });
    }

    // Find by ticket number instead of QR
    const ticket = await prisma.ticket.findUnique({
      where: { ticketNumber },
    });

    if (!ticket) {
      return reply.status(404).send({ result: 'INVALID', message: 'Ticket not found' });
    }

    // Create a qrToken from ticketNumber for reusing verify logic
    request.body = { qrToken: `manual:${ticketNumber}` };
    return this.verify(request, reply);
  }
}
