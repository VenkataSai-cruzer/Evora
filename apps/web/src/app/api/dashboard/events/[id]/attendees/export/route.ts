import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';
import { writeAuditLog, getRequestMetadata } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const log = createLogger('api/dashboard/events/[id]/attendees/export');

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

    const tickets = await prisma.ticket.findMany({
      where: { eventId: params.id },
      orderBy: { purchasedAt: 'asc' },
      include: {
        attendee: {
          select: {
            fullName: true,
            email: true,
            phone: true,
            isCheckedIn: true,
            checkedInAt: true,
            ticketCategory: true,
          },
        },
        order: {
          select: {
            orderNumber: true,
            bookingType: true,
          },
        },
      },
    });

    // Generate CSV
    const headers = [
      'Attendee Name',
      'Email',
      'Phone',
      'Ticket Type',
      'Booking Mode',
      'Ticket Number',
      'Order Number',
      'Ticket Status',
      'Checked In',
      'Checked In At',
      'Registration Date',
    ].join(',');

    const rows = tickets.map((ticket) => {
      const name = ticket.attendee?.fullName || '';
      const email = ticket.attendee?.email || '';
      const phone = ticket.attendee?.phone || '';
      const ticketType = ticket.attendee?.ticketCategory || ticket.category || '';
      const bookingMode = ticket.order?.bookingType || '';
      const orderNumber = ticket.order?.orderNumber || '';
      const checkedIn = ticket.attendee?.isCheckedIn ? 'Yes' : 'No';
      const checkedInAt = ticket.attendee?.checkedInAt
        ? ticket.attendee.checkedInAt.toISOString()
        : '';
      const regDate = ticket.purchasedAt.toISOString();

      // Escape fields that may contain commas
      const escape = (val: string) => `"${val.replace(/"/g, '""')}"`;
      return [
        escape(name),
        escape(email),
        escape(phone),
        escape(ticketType),
        escape(bookingMode),
        escape(ticket.ticketNumber),
        escape(orderNumber),
        escape(ticket.status),
        escape(checkedIn),
        escape(checkedInAt),
        escape(regDate),
      ].join(',');
    });

    const csv = `${headers}\n${rows.join('\n')}`;

    // Audit log
    await writeAuditLog({
      action: 'ATTENDEE_EXPORTED',
      entityType: 'Event',
      entityId: params.id,
      actorId: access.session.user.id,
      metadata: {
        eventTitle: access.event.title,
        recordCount: tickets.length,
      },
      ...getRequestMetadata(request),
    });

    log.info({ eventId: params.id, count: tickets.length }, 'Attendees exported');

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
