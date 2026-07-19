import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';
import { writeAuditLog, getRequestMetadata } from '@/lib/audit';
import { z } from 'zod';

const log = createLogger('api/dashboard/events/[id]/ticket-types/[ticketTypeId]');

const updateTicketTypeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  price: z.number().min(0).optional().default(0),
  currency: z.string().max(10).optional(),
  quantity: z.number().int().min(0).optional(),
  saleStart: z.string().optional().nullable(),
  saleEnd: z.string().optional().nullable(),
  minPerBooking: z.number().int().min(1).optional(),
  maxPerBooking: z.number().int().min(1).max(100).optional(),
  bookingMode: z.enum(['SOLO', 'DUO', 'TRIO', 'GROUP', 'FLEXIBLE']).optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'SOLD_OUT', 'CLOSED']).optional(),
});

async function checkTicketTypeAccess(eventId: string, ticketTypeId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: 'Unauthorized', status: 401 } as const;
  }

  const ticketType = await prisma.ticketType.findUnique({
    where: { id: ticketTypeId },
    select: {
      id: true,
      eventId: true,
      name: true,
      event: { select: { organizerId: true, title: true } },
    },
  });

  if (!ticketType || ticketType.eventId !== eventId) {
    return { error: 'Ticket type not found', status: 404 } as const;
  }

  const isOwner = ticketType.event.organizerId === session.user.id;
  const isAdmin = session.user.role === 'ADMIN';

  if (!isOwner && !isAdmin) {
    return { error: 'Forbidden', status: 403 } as const;
  }

  return { session, ticketType };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; ticketTypeId: string } },
) {
  try {
    const access = await checkTicketTypeAccess(params.id, params.ticketTypeId);
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await request.json();
    const parsed = updateTicketTypeSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return NextResponse.json({ error: 'Validation failed', fieldErrors: errors }, { status: 422 });
    }

    const data = parsed.data;

    // If reducing quantity, ensure it doesn't go below already sold count
    if (data.quantity !== undefined) {
      const soldCount = await prisma.ticket.count({
        where: {
          eventId: params.id,
          category: access.ticketType.name,
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        },
      });

      if (data.quantity < soldCount) {
        return NextResponse.json(
          { error: `Cannot reduce quantity below ${soldCount} (already sold).` },
          { status: 400 },
        );
      }
    }

    // Validate sale window
    const saleStart = data.saleStart !== undefined
      ? (data.saleStart ? new Date(data.saleStart) : null)
      : undefined;
    const saleEnd = data.saleEnd !== undefined
      ? (data.saleEnd ? new Date(data.saleEnd) : null)
      : undefined;

    if (saleStart && saleEnd && saleEnd <= saleStart) {
      return NextResponse.json(
        { error: 'Sale end must be after sale start.' },
        { status: 400 },
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.price !== undefined) updateData.priceAmount = Math.round(data.price * 100);
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (saleStart !== undefined) updateData.saleStart = saleStart;
    if (saleEnd !== undefined) updateData.saleEnd = saleEnd;
    if (data.minPerBooking !== undefined) updateData.minPerBooking = data.minPerBooking;
    if (data.maxPerBooking !== undefined) updateData.maxPerBooking = data.maxPerBooking;
    if (data.bookingMode !== undefined) updateData.bookingMode = data.bookingMode;
    if (data.visibility !== undefined) updateData.visibility = data.visibility;
    if (data.status !== undefined) updateData.status = data.status;

    const ticketType = await prisma.ticketType.update({
      where: { id: params.ticketTypeId },
      data: updateData,
    });

    const isStatusChange = data.status !== undefined;
    await writeAuditLog({
      action: isStatusChange ? 'TICKET_SALES_' + (ticketType.status === 'ACTIVE' ? 'ACTIVATED' : ticketType.status === 'PAUSED' ? 'PAUSED' : ticketType.status === 'SOLD_OUT' ? 'SOLD_OUT' : 'UPDATED') : 'TICKET_TYPE_UPDATED',
      entityType: 'TicketType',
      entityId: ticketType.id,
      actorId: access.session.user.id,
      metadata: { eventId: params.id, name: ticketType.name, status: ticketType.status, changedFields: Object.keys(data) },
      ...getRequestMetadata(request),
    });

    log.info(
      { eventId: params.id, ticketTypeId: ticketType.id, status: ticketType.status },
      'Ticket type updated',
    );

    return NextResponse.json({ ticketType });
  } catch (error) {
    log.error({ error, eventId: params.id, ticketTypeId: params.ticketTypeId }, 'Failed to update ticket type');
    return NextResponse.json({ error: 'Failed to update ticket type.' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; ticketTypeId: string } },
) {
  try {
    const access = await checkTicketTypeAccess(params.id, params.ticketTypeId);
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    // Prevent deletion if tickets have been sold for this ticket type
    const hasOrders = await prisma.ticket.findFirst({
      where: {
        eventId: params.id,
        category: access.ticketType.name,
        status: { not: 'CANCELLED' },
      },
    });

    if (hasOrders) {
      return NextResponse.json(
        { error: 'Cannot delete a ticket type with active orders. Close it instead.' },
        { status: 400 },
      );
    }

    await prisma.ticketType.delete({
      where: { id: params.ticketTypeId },
    });

    await writeAuditLog({
      action: 'TICKET_TYPE_DELETED',
      entityType: 'TicketType',
      entityId: params.ticketTypeId,
      actorId: access.session.user.id,
      metadata: { eventId: params.id, name: access.ticketType.name },
      ...getRequestMetadata(_request),
    });

    log.info({ eventId: params.id, ticketTypeId: params.ticketTypeId }, 'Ticket type deleted');

    return NextResponse.json({ message: 'Ticket type deleted successfully.' });
  } catch (error) {
    log.error({ error, eventId: params.id, ticketTypeId: params.ticketTypeId }, 'Failed to delete ticket type');
    return NextResponse.json({ error: 'Failed to delete ticket type.' }, { status: 500 });
  }
}
