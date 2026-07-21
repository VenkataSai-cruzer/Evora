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
  price: z.number().min(0, 'Price cannot be negative').default(0),
  currency: z.string().max(10).default('INR'),
  capacity: z.number().int().min(0, 'Capacity cannot be negative'),
  maxPerOrder: z.number().int().min(1).default(10),
  active: z.boolean().default(true),
  saleStartAt: z.string().optional().nullable(),
  saleEndAt: z.string().optional().nullable(),
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

    return NextResponse.json({ ticketTypes });
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

    if (data.saleStartAt && data.saleEndAt && new Date(data.saleEndAt) <= new Date(data.saleStartAt)) {
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
        price: data.price,
        currency: data.currency,
        capacity: data.capacity,
        maxPerOrder: data.maxPerOrder,
        active: data.active,
        saleStartAt: data.saleStartAt ? new Date(data.saleStartAt) : null,
        saleEndAt: data.saleEndAt ? new Date(data.saleEndAt) : null,
      },
    });

    await writeAuditLog({
      action: 'TICKET_TYPE_CREATED',
      entityType: 'TicketType',
      entityId: ticketType.id,
      actorId: access.session.user.id,
      metadata: { eventId: params.id, name: ticketType.name, price: ticketType.price, active: ticketType.active },
      ...getRequestMetadata(request),
    });

    log.info({ eventId: params.id, ticketTypeId: ticketType.id }, 'Ticket type created');

    return NextResponse.json({ ticketType }, { status: 201 });
  } catch (error) {
    log.error({ error, eventId: params.id }, 'Failed to create ticket type');
    return NextResponse.json({ error: 'Failed to create ticket type.' }, { status: 500 });
  }
}
