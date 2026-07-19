import type { Prisma } from '@prisma/client';
import { PAYMENT_METHOD } from '@jamming/shared';
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
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Valid email required').optional().nullable(),
});

const registerSchema = z.object({
  eventId: z.string().uuid('Invalid event ID'),
  ticketTypeId: z.string().uuid('Invalid ticket type ID').optional(),
  bookingType: z.enum(['SOLO', 'DUO', 'TRIO', 'GROUP']).optional().default('SOLO'),
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

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
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

    const { eventId, ticketTypeId, bookingType, attendees } = parsed.data;

    // Fetch event (read-only — safe outside transaction)
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        capacity: true,
        status: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
    }

    if (event.status !== 'SALES_OPEN') {
      return NextResponse.json({ error: 'Registration is closed for this event.' }, { status: 400 });
    }

    // Find active ticket type
    const ticketTypeWhere: Prisma.TicketTypeWhereInput = { eventId, status: 'ACTIVE' };
    if (ticketTypeId) {
      ticketTypeWhere.id = ticketTypeId;
    }

    const ticketType = await prisma.ticketType.findFirst({ where: ticketTypeWhere });

    if (!ticketType) {
      return NextResponse.json({ error: 'No active ticket type found for this event.' }, { status: 400 });
    }

    // Determine if this is a UTR payment booking
    const isUtrPayment = ticketType.priceAmount > 0 && parsed.data.utrNumber;
    const isFree = ticketType.priceAmount === 0;

    // Paid bookings without UTR number are blocked
    if (ticketType.priceAmount > 0 && !parsed.data.utrNumber) {
      return NextResponse.json({
        error: 'UTR payment number required.',
        message: 'Please enter your 12-digit UPI UTR/Ref number to complete the booking.',
      }, { status: 400 });
    }

    // Validate booking rules from TicketType (read-only — safe outside transaction)
    const maxAttendees = ticketType.maxPerBooking;
    if (attendees.length > maxAttendees) {
      return NextResponse.json(
        { error: `Maximum ${maxAttendees} attendees per booking for ${ticketType.name}.` },
        { status: 400 },
      );
    }

    if (attendees.length < ticketType.minPerBooking) {
      return NextResponse.json(
        { error: `Minimum ${ticketType.minPerBooking} attendee${ticketType.minPerBooking === 1 ? '' : 's'} per booking for ${ticketType.name}.` },
        { status: 400 },
      );
    }

    const totalAmount = isUtrPayment ? ticketType.priceAmount * attendees.length : 0;

    // Check for duplicate UTR number (prevent reuse of same UTR)
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

    // Create everything in a single transaction — all capacity checks inside
    const result = await prisma.$transaction(async (tx) => {
      // Re-read ticket type inside the transaction to get fresh inventory
      const freshTicketType = await tx.ticketType.findUnique({ where: { id: ticketType.id } });

      if (!freshTicketType) {
        throw new ValidationError('Ticket type no longer available');
      }

      if (freshTicketType.status !== 'ACTIVE') {
        throw new ValidationError('This ticket type is not available');
      }

      // Re-check sale window inside transaction
      const now = new Date();
      if (freshTicketType.saleStart && now < freshTicketType.saleStart) {
        throw new ValidationError('Ticket sales have not started yet');
      }
      if (freshTicketType.saleEnd && now > freshTicketType.saleEnd) {
        throw new ValidationError('Ticket sales have ended');
      }

      // For free events, count confirmed/checked-in tickets only
      // For UTR payments, count confirmed + pending_payment (since we'll hold capacity)
      const activeStatuses = isFree ? ['CONFIRMED', 'CHECKED_IN'] : ['CONFIRMED', 'CHECKED_IN', 'PENDING_PAYMENT'];

      // Count sold tickets inside the transaction (serialized by SQLite)
      const soldForType = await tx.ticket.count({
        where: {
          eventId,
          category: freshTicketType.name,
          status: { in: activeStatuses },
        },
      });

      const availableForType = freshTicketType.quantity - soldForType;
      if (availableForType < attendees.length) {
        throw new ValidationError(
          `Only ${availableForType} spot${availableForType === 1 ? '' : 's'} remaining for ${freshTicketType.name}.`,
        );
      }

      // Re-check event status and capacity inside transaction
      const freshEvent = await tx.event.findUnique({
        where: { id: eventId },
        select: { capacity: true, status: true },
      });

      if (!freshEvent || freshEvent.status !== 'SALES_OPEN') {
        throw new ValidationError('This event is no longer accepting registrations');
      }

      const eventTicketsSold = await tx.ticket.count({
        where: { eventId, status: { in: activeStatuses } },
      });
      const remainingCapacity = freshEvent.capacity - eventTicketsSold;
      if (remainingCapacity < attendees.length) {
        throw new ValidationError(
          `Only ${remainingCapacity} spot${remainingCapacity === 1 ? '' : 's'} remaining.`,
        );
      }

      // Check duplicate registration inside transaction
      const existingTicket = await tx.ticket.findFirst({
        where: {
          eventId,
          userId: session.user.id,
          status: { in: activeStatuses },
        },
      });

      if (existingTicket) {
        throw new ValidationError('You are already registered for this event');
      }

      // 1. Create the order — CONFIRMED for free, PENDING_PAYMENT for UTR
      const orderStatus = isFree ? 'CONFIRMED' : 'PENDING_PAYMENT';
      const order = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          eventId,
          userId: session.user.id,
          bookingType,
          attendeeCount: attendees.length,
          totalAmount,
          status: orderStatus,
        },
      });

      // 2. Create payment record for UTR bookings
      if (isUtrPayment) {
        await tx.payment.create({
          data: {
            orderId: order.id,
            amount: totalAmount,
            currency: freshTicketType.currency || 'INR',
            method: PAYMENT_METHOD.UTR,
            status: 'PENDING',
            utrNumber: parsed.data.utrNumber,
          },
        });
      }

      // 3. Create attendees and tickets
      const createdTickets = [];
      for (const attendee of attendees) {
        const orderAttendee = await tx.orderAttendee.create({
          data: {
            orderId: order.id,
            fullName: attendee.fullName,
            email: attendee.email || session.user.email,
            ticketCategory: ticketType.name,
          },
        });

        const ticketStatus = isFree ? 'CONFIRMED' : 'PENDING_PAYMENT';
        const ticket = await tx.ticket.create({
          data: {
            ticketNumber: generateTicketNumber(),
            eventId,
            userId: session.user.id,
            orderId: order.id,
            attendeeId: orderAttendee.id,
            type: isFree ? 'FREE' : 'PAID',
            category: ticketType.name,
            status: ticketStatus,
            priceAmount: isFree ? 0 : ticketType.priceAmount,
            qrDataUrl: '',
            qrSecret: generateQRSecret(),
          },
        });

        await tx.orderAttendee.update({
          where: { id: orderAttendee.id },
          data: { ticketId: ticket.id },
        });

        createdTickets.push(ticket);
      }

      // 4. Auto-mark ticket type as SOLD_OUT if all quantity consumed
      if (availableForType === attendees.length) {
        await tx.ticketType.update({
          where: { id: freshTicketType.id },
          data: { status: 'SOLD_OUT' },
        });
      }

      return { order, tickets: createdTickets };
    });

    log.info({
      orderId: result.order.id,
      eventId,
      bookingType,
      attendeeCount: attendees.length,
      paymentMethod: isUtrPayment ? PAYMENT_METHOD.UTR : 'FREE',
    }, 'Registration completed');

    return NextResponse.json({
      order: {
        id: result.order.id,
        orderNumber: result.order.orderNumber,
        bookingType: result.order.bookingType,
        attendeeCount: result.order.attendeeCount,
        status: result.order.status,
      },
      tickets: result.tickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        status: t.status,
      })),
      isUtrPayment,
      message: isUtrPayment
        ? 'Registration submitted! Your payment is pending verification. You will receive a confirmation once your UTR is verified.'
        : undefined,
    }, { status: 201 });

  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    log.error({ error }, 'Registration failed');
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 });
  }
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
