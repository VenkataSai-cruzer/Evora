import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
const log = createLogger('api/dashboard/events/[id]/attendees');

async function checkEventAccess(eventId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: 'Unauthorized', status: 401 } as const;
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
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const statusFilter = searchParams.get('status') || '';
    const ticketTypeFilter = searchParams.get('ticketType') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

    const where: Record<string, unknown> = { eventId: params.id };
    if (statusFilter) where.status = statusFilter;
    if (ticketTypeFilter) where.ticketTypeId = ticketTypeFilter;

    if (search) {
      const searchLower = search.toLowerCase();
      where.OR = [
        { ticketNumber: { contains: searchLower } },
        { attendee: { attendeeName: { contains: searchLower } } },
        { attendee: { attendeeEmail: { contains: searchLower } } },
        { order: { orderNumber: { contains: searchLower } } },
      ];
    }

    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where: where as any,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          attendee: {
            select: {
              id: true,
              attendeeName: true,
              attendeeEmail: true,
              attendeePhone: true,
            },
          },
          ticketType: { select: { id: true, name: true } },
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
            },
          },
          user: {
            select: { id: true, name: true, email: true },
          },
          checkIn: {
            select: { checkedInAt: true, result: true },
          },
        },
      }),
      prisma.ticket.count({ where: where as any }),
    ]);

    const ticketTypes = await prisma.ticketType.findMany({
      where: { eventId: params.id },
      select: { id: true, name: true },
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      tickets,
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
      filters: { ticketTypes: ticketTypes.map((t: { id: string; name: string }) => t.id) },
    });
  } catch (error) {
    log.error({ error, eventId: params.id }, 'Failed to fetch attendees');
    return NextResponse.json({ error: 'Failed to load attendees.' }, { status: 500 });
  }
}
