import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
const log = createLogger('api/dashboard/events/[id]/attendees/export');

async function checkEventAccess(eventId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: 'Unauthorized', status: 401 } as const;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, organizerId: true, title: true },
  });
  if (!event) return { error: 'Event not found', status: 404 } as const;
  if (event.organizerId !== session.user.id && session.user.role !== 'ADMIN') return { error: 'Forbidden', status: 403 } as const;
  return { session, event };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const access = await checkEventAccess(params.id);
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

    const tickets = await prisma.ticket.findMany({
      where: { eventId: params.id },
      orderBy: { createdAt: 'asc' },
      include: {
        attendee: {
          select: {
            attendeeName: true,
            attendeeEmail: true,
            attendeePhone: true,
          },
        },
        ticketType: { select: { name: true } },
        order: { select: { orderNumber: true } },
        checkIn: { select: { checkedInAt: true } },
      },
    });

    const headers = [
      'Attendee Name', 'Email', 'Phone', 'Ticket Type',
      'Ticket Number', 'Order Number', 'Status', 'Checked In At', 'Registration Date',
    ].join(',');

    const rows = tickets.map((ticket) => {
      const name = ticket.attendee?.attendeeName || '';
      const email = ticket.attendee?.attendeeEmail || '';
      const phone = ticket.attendee?.attendeePhone || '';
      const ticketType = ticket.ticketType.name || '';
      const orderNumber = ticket.order?.orderNumber || '';
      const checkedInAt = ticket.checkIn?.checkedInAt?.toISOString() || '';
      const regDate = ticket.createdAt.toISOString();
      const escape = (val: string) => `"${val.replace(/"/g, '""')}"`;
      return [
        escape(name), escape(email), escape(phone), escape(ticketType),
        escape(ticket.ticketNumber), escape(orderNumber), escape(ticket.status),
        escape(checkedInAt), escape(regDate),
      ].join(',');
    });

    const csv = `${headers}\n${rows.join('\n')}`;
    const filename = `attendees-${access.event.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase().slice(0, 40)}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    log.error({ error, eventId: params.id }, 'Failed to export attendees');
    return NextResponse.json({ error: 'Failed to export attendees.' }, { status: 500 });
  }
}
