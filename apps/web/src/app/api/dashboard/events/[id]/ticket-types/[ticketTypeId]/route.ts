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
  price: z.number().min(0).optional(),
  currency: z.string().max(10).optional(),
  capacity: z.number().int().min(0).optional(),
  maxPerOrder: z.number().int().min(1).max(100).optional(),
  active: z.boolean().optional(),
  saleStartAt: z.string().optional().nullable(),
  saleEndAt: z.string().optional().nullable(),
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

    // If reducing capacity, ensure it doesn't go below already sold count
    if (data.capacity !== undefined) {
      const soldCount = await prisma.ticket.count({
        where: {
          eventId: params.id,
          ticketTypeId: params.ticketTypeId,
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        },
      });

      if (data.capacity < soldCount) {
        return NextResponse.json(
          { error: `Cannot reduce capacity below ${soldCount} (already sold).` },
          { status: 400 },
        );
      }
    }

    const saleStartAt = data.saleStartAt !== undefined
      ? (data.saleStartAt ? new Date(data.saleStartAt) : null)
      : undefined;
    const saleEndAt = data.saleEndAt !== undefined
      ? (data.saleEndAt ? new Date(data.saleEndAt) : null)
      : undefined;

    if (saleStartAt && saleEndAt && saleEndAt <= saleStartAt) {
      return NextResponse.json(
        { error: 'Sale end must be after sale start.' },
        { status: 400 },
      );
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.capacity !== undefined) updateData.capacity = data.capacity;
    if (data.maxPerOrder !== undefined) updateData.maxPerOrder = data.maxPerOrder;
    if (data.active !== undefined) updateData.active = data.active;
    if (saleStartAt !== undefined) updateData.saleStartAt = saleStartAt;
    if (saleEndAt !== undefined) updateData.saleEndAt = saleEndAt;

    const ticketType = await prisma.ticketType.update({
      where: { id: params.ticketTypeId },
      data: updateData,
    });

    await writeAuditLog({
      action: 'TICKET_TYPE_UPDATED',
      entityType: 'TicketType',
      entityId: ticketType.id,
      actorId: access.session.user.id,
      metadata: { eventId: params.id, name: ticketType.name, changedFields: Object.keys(data) },
      ...getRequestMetadata(request),
    });

    log.info({ eventId: params.id, ticketTypeId: ticketType.id }, 'Ticket type updated');

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

    const hasOrders = await prisma.ticket.findFirst({
      where: {
        eventId: params.id,
        ticketTypeId: params.ticketTypeId,
        status: { not: 'CANCELLED' },
      },
    });

    if (hasOrders) {
      return NextResponse.json(
        { error: 'Cannot delete a ticket type with active orders. Deactivate it instead.' },
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

    return NextResponse.json({ message: 'Ticket type deleted.' });
  } catch (error) {
    log.error({ error, eventId: params.id, ticketTypeId: params.ticketTypeId }, 'Failed to delete ticket type');
    return NextResponse.json({ error: 'Failed to delete ticket type.' }, { status: 500 });
  }
}
