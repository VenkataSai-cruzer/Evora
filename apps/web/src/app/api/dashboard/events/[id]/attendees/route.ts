import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

const log = createLogger('api/dashboard/events/[id]/attendees');

async function checkEventAccess(eventId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: 'Unauthorized', status: 401 } as const;
  }
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, organizerId: true, title: true },
  });
  if (!event) return { error: 'Event not found', status: 404 } as const;
  const isOwner = event.organizerId === session.user.id;
  if (!isOwner && session.user.role !== 'ADMIN') return { error: 'Forbidden', status: 403 } as const;
  return { session, event };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const access = await checkEventAccess(params.id);
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const ticketType = searchParams.get('ticketType') || '';
    const bookingMode = searchParams.get('bookingMode') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

    // Build where clause for tickets
    const ticketWhere: Prisma.TicketWhereInput = {
      eventId: params.id,
    };

    if (status) {
      ticketWhere.status = status;
    }

    if (ticketType) {
      ticketWhere.category = ticketType;
    }

    if (search) {
      // Note: SQLite does case-sensitive contains. For case-insensitive search,
      // we normalize both the search term and the stored values to lowercase.
      // This is a local dev limitation — PostgreSQL supports mode: 'insensitive' natively.
      const searchLower = search.toLowerCase();
      ticketWhere.OR = [
        { ticketNumber: { contains: searchLower } },
        { attendee: { fullName: { contains: searchLower } } },
        { attendee: { email: { contains: searchLower } } },
        { order: { orderNumber: { contains: searchLower } } },
      ];
    }

    // Filter by booking mode through orders
    const orderFilter: Prisma.OrderWhereInput = {};
    if (bookingMode) {
      orderFilter.bookingType = bookingMode;
    }

    if (bookingMode) {
      const orderIds = await prisma.order.findMany({
        where: { eventId: params.id, ...orderFilter },
        select: { id: true },
      });
      ticketWhere.orderId = { in: orderIds.map(o => o.id) };
    }

    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where: ticketWhere,
        orderBy: { purchasedAt: 'desc' },
        skip,
        take: limit,
        include: {
          attendee: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              ticketCategory: true,
              isCheckedIn: true,
              checkedInAt: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              bookingType: true,
              attendeeCount: true,
              status: true,
            },
          },
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
      }),
      prisma.ticket.count({ where: ticketWhere }),
    ]);

    // Get available ticket types for filter
    const ticketTypes = await prisma.ticketType.findMany({
      where: { eventId: params.id },
      select: { name: true },
      distinct: ['name'],
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      tickets,
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
      filters: {
        ticketTypes: ticketTypes.map(t => t.name),
      },
    });
  } catch (error) {
    log.error({ error, eventId: params.id }, 'Failed to fetch attendees');
    return NextResponse.json({ error: 'Failed to load attendees.' }, { status: 500 });
  }
}
