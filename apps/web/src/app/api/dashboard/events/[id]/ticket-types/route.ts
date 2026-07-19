import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';
import { writeAuditLog, getRequestMetadata } from '@/lib/audit';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const log = createLogger('api/dashboard/events/[id]/ticket-types');

const createTicketTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional().nullable(),
  price: z.number().min(0, 'Price cannot be negative').optional().default(0),
  currency: z.string().max(10).optional().default('USD'),
  quantity: z.number().int().min(0, 'Quantity cannot be negative'),
  saleStart: z.string().optional().nullable(),
  saleEnd: z.string().optional().nullable(),
  minPerBooking: z.number().int().min(1).optional().default(1),
  maxPerBooking: z.number().int().min(1).max(100).optional().default(10),
  bookingMode: z.enum(['SOLO', 'DUO', 'TRIO', 'GROUP', 'FLEXIBLE']).optional().default('FLEXIBLE'),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional().default('PUBLIC'),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED']).optional().default('DRAFT'),
});

async function checkEventAccess(eventId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: 'Unauthorized', status: 401 } as const;
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, organizerId: true, title: true },
  });

  if (!event) {
    return { error: 'Event not found', status: 404 } as const;
  }

  const isOwner = event.organizerId === session.user.id;
  const isAdmin = session.user.role === 'ADMIN';

  if (!isOwner && !isAdmin) {
    return { error: 'Forbidden', status: 403 } as const;
  }

  return { session, event };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const access = await checkEventAccess(params.id);
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const ticketTypes = await prisma.ticketType.findMany({
      where: { eventId: params.id },
      orderBy: { createdAt: 'asc' },
    });

    // Compute real sold quantities from tickets
    const ticketCounts = await prisma.ticket.groupBy({
      by: ['category'],
      where: {
        eventId: params.id,
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
      },
      _count: true,
    });

    const soldByCategory = new Map(ticketCounts.map((t) => [t.category, t._count]));

    // Reserve counting — payment integration coming later
    const reservedByCategory = new Map<string, number>();

    const typesWithCounts = ticketTypes.map((tt) => ({
      ...tt,
      soldQty: soldByCategory.get(tt.name) ?? 0,
      reservedQty: reservedByCategory.get(tt.name) ?? 0,
    }));

    return NextResponse.json({ ticketTypes: typesWithCounts });
  } catch (error) {
    log.error({ error, eventId: params.id }, 'Failed to fetch ticket types');
    return NextResponse.json({ error: 'Failed to load ticket types.' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const access = await checkEventAccess(params.id);
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await request.json();
    const parsed = createTicketTypeSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return NextResponse.json({ error: 'Validation failed', fieldErrors: errors }, { status: 422 });
    }

    const data = parsed.data;

    // Validate sale window
    if (data.saleStart && data.saleEnd && new Date(data.saleEnd) <= new Date(data.saleStart)) {
      return NextResponse.json(
        { error: 'Sale end must be after sale start.' },
        { status: 400 },
      );
    }

    const ticketType = await prisma.ticketType.create({
      data: {
        eventId: params.id,
        name: data.name,
        description: data.description || null,
        priceAmount: Math.round(data.price * 100),
        currency: data.currency || 'USD',
        quantity: data.quantity,
        saleStart: data.saleStart ? new Date(data.saleStart) : null,
        saleEnd: data.saleEnd ? new Date(data.saleEnd) : null,
        minPerBooking: data.minPerBooking ?? 1,
        maxPerBooking: data.maxPerBooking ?? 10,
        bookingMode: data.bookingMode || 'FLEXIBLE',
        visibility: data.visibility || 'PUBLIC',
        status: data.status || 'DRAFT',
      },
    });

    await writeAuditLog({
      action: 'TICKET_TYPE_CREATED',
      entityType: 'TicketType',
      entityId: ticketType.id,
      actorId: access.session.user.id,
      metadata: { eventId: params.id, name: ticketType.name, priceAmount: ticketType.priceAmount, status: ticketType.status },
      ...getRequestMetadata(request),
    });

    log.info({ eventId: params.id, ticketTypeId: ticketType.id }, 'Ticket type created');

    return NextResponse.json({ ticketType }, { status: 201 });
  } catch (error) {
    log.error({ error, eventId: params.id }, 'Failed to create ticket type');
    return NextResponse.json({ error: 'Failed to create ticket type.' }, { status: 500 });
  }
}
