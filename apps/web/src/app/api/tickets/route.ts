import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';
import { z } from 'zod';
import crypto from 'crypto';
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';

const log = createLogger('api/tickets');

const attendeeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Valid email required').optional().nullable(),
});

const registerSchema = z.object({
  eventId: z.string().uuid('Invalid event ID'),
  ticketTypeId: z.string().uuid('Invalid ticket type ID').optional(),
  attendees: z.array(attendeeSchema).min(1, 'At least one attendee required').max(10, 'Maximum 10 attendees per booking'),
  utrNumber: z.string().regex(/^\d{12}$/, 'UTR number must be exactly 12 digits').optional(),
});

function generateOrderNumber(): string {
  const prefix = 'ORD';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

function generateTicketNumber(): string {
  const prefix = 'TKT';
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${random}`;
}

function generateQRSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

function hashQRToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(ip, RATE_LIMITS.tickets);
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.remaining, rateCheck.resetIn);
    }

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'You must be signed in to register.' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return NextResponse.json({ error: 'Validation failed', fieldErrors: errors }, { status: 422 });
    }

    const { eventId, ticketTypeId, attendees } = parsed.data;

    // Fetch event
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        totalCapacity: true,
        status: true,
        salesPaused: true,
        bookingClosed: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
    }

    if (event.status !== 'PUBLISHED' || event.salesPaused || event.bookingClosed) {
      return NextResponse.json({ error: 'Registration is closed for this event.' }, { status: 400 });
    }

    // Find active ticket type
    const ticketTypeWhere: Record<string, unknown> = { eventId, active: true };
    if (ticketTypeId) {
      ticketTypeWhere.id = ticketTypeId;
    }

    const ticketType = await prisma.ticketType.findFirst({
      where: ticketTypeWhere,
    });

    if (!ticketType) {
      return NextResponse.json({ error: 'No active ticket type found for this event.' }, { status: 400 });
    }

    // Determine payment type
    const isUtrPayment = ticketType.price > 0 && parsed.data.utrNumber;
    const isFree = ticketType.price === 0;

    if (ticketType.price > 0 && !parsed.data.utrNumber) {
      return NextResponse.json({
        error: 'UTR payment number required.',
        message: 'Please enter your 12-digit UPI UTR/Ref number to complete the booking.',
      }, { status: 400 });
    }

    // Validate max per order
    if (attendees.length > ticketType.maxPerOrder) {
      return NextResponse.json(
        { error: `Maximum ${ticketType.maxPerOrder} attendees per booking for ${ticketType.name}.` },
        { status: 400 },
      );
    }

    const totalAmount = isUtrPayment ? ticketType.price * attendees.length : 0;

    // Check for duplicate UTR
    if (isUtrPayment) {
      const existingUtrPayment = await prisma.payment.findUnique({
        where: { utrNumber: parsed.data.utrNumber },
      });
      if (existingUtrPayment) {
        return NextResponse.json({
          error: 'This UTR number has already been used.',
          message: 'Each UTR number can only be used once. Please check your UTR number and try again.',
        }, { status: 400 });
      }
    }

    // Create everything in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const freshTicketType = await tx.ticketType.findUnique({ where: { id: ticketType.id } });

      if (!freshTicketType) {
        throw new Error('Ticket type no longer available');
      }

      if (!freshTicketType.active) {
        throw new Error('This ticket type is not available');
      }

      // Check sale window
      const now = new Date();
      if (freshTicketType.saleStartAt && now < freshTicketType.saleStartAt) {
        throw new Error('Ticket sales have not started yet');
      }
      if (freshTicketType.saleEndAt && now > freshTicketType.saleEndAt) {
        throw new Error('Ticket sales have ended');
      }

      // Check capacity via soldCount
      const availableForType = freshTicketType.capacity - freshTicketType.soldCount;
      if (availableForType < attendees.length) {
        throw new Error(
          `Only ${availableForType} spot${availableForType === 1 ? '' : 's'} remaining for ${freshTicketType.name}.`,
        );
      }

      // Re-check event
      const freshEvent = await tx.event.findUnique({
        where: { id: eventId },
        select: { totalCapacity: true, status: true, salesPaused: true, bookingClosed: true },
      });

      if (!freshEvent || freshEvent.status !== 'PUBLISHED' || freshEvent.salesPaused || freshEvent.bookingClosed) {
        throw new Error('This event is no longer accepting registrations');
      }

      // Check event-level capacity
      const eventTicketsSold = await tx.ticket.count({
        where: { eventId, status: { in: ['CONFIRMED', 'CHECKED_IN', 'PENDING_PAYMENT'] } },
      });
      const remainingCapacity = freshEvent.totalCapacity - eventTicketsSold;
      if (remainingCapacity < attendees.length) {
        throw new Error(
          `Only ${remainingCapacity} spot${remainingCapacity === 1 ? '' : 's'} remaining.`,
        );
      }

      // Check duplicate registration
      const existingTicket = await tx.ticket.findFirst({
        where: {
          eventId,
          userId: session.user.id,
          status: { in: ['CONFIRMED', 'CHECKED_IN', 'PENDING_PAYMENT'] },
        },
      });

      if (existingTicket) {
        throw new Error('You are already registered for this event');
      }

      // Create order
      const orderStatus = isFree ? 'CONFIRMED' : 'PENDING_PAYMENT';
      const order = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          eventId,
          userId: session.user.id,
          subtotal: totalAmount,
          fees: 0,
          total: totalAmount,
          currency: freshTicketType.currency,
          status: orderStatus,
          expiresAt: isUtrPayment ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null,
          attendees: {
            create: attendees.map((a) => ({
              ticketTypeId: freshTicketType.id,
              attendeeName: a.name,
              attendeeEmail: a.email || session.user.email,
              attendeePhone: null,
            })),
          },
        },
        include: { attendees: true },
      });

      // Create payment for UTR
      if (isUtrPayment) {
        await tx.payment.create({
          data: {
            orderId: order.id,
            amount: totalAmount,
            currency: freshTicketType.currency || 'INR',
            method: 'utr',
            status: 'PENDING',
            utrNumber: parsed.data.utrNumber,
          },
        });
      }

      // Reserve capacity
      await tx.ticketType.update({
        where: { id: freshTicketType.id },
        data: { soldCount: { increment: attendees.length } },
      });

      // Create tickets
      const createdTickets = [];
      for (const attendeeRecord of order.attendees) {
        const qrSecret = generateQRSecret();
        const qrTokenHash = hashQRToken(qrSecret);

        const ticket = await tx.ticket.create({
          data: {
            ticketNumber: generateTicketNumber(),
            eventId,
            userId: session.user.id,
            orderId: order.id,
            orderAttendeeId: attendeeRecord.id,
            ticketTypeId: freshTicketType.id,
            status: orderStatus,
            qrTokenHash,
            renderingStatus: 'PENDING',
          },
        });

        createdTickets.push({ ...ticket, qrSecret });
      }

      return { order, tickets: createdTickets };
    });

    log.info({
      orderId: result.order.id,
      eventId,
      attendeeCount: attendees.length,
      paymentMethod: isUtrPayment ? 'UTR' : 'FREE',
    }, 'Registration completed');

    return NextResponse.json({
      order: {
        id: result.order.id,
        orderNumber: result.order.orderNumber,
        status: result.order.status,
      },
      tickets: result.tickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        status: t.status,
        qrSecret: isFree ? t.qrSecret : undefined,
      })),
      isUtrPayment,
      message: isUtrPayment
        ? 'Registration submitted! Your payment is pending verification. You will receive a confirmation once your UTR is verified.'
        : undefined,
    }, { status: 201 });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
