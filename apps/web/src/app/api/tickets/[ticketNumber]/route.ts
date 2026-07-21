import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
const log = createLogger('api/tickets/[ticketNumber]');

export async function GET(
  _request: NextRequest,
  { params }: { params: { ticketNumber: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { ticketNumber: params.ticketNumber },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            posterObjectKey: true,
            startAt: true,
            venueName: true,
            venueAddress: true,
            status: true,
            organizerId: true,
            organizer: {
              select: { id: true, name: true },
            },
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            total: true,
          },
        },
        attendee: {
          select: {
            id: true,
            attendeeName: true,
            attendeeEmail: true,
            attendeePhone: true,
          },
        },
        ticketType: {
          select: { id: true, name: true, price: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Authorization
    const isPurchaser = ticket.userId === session.user.id;
    const isOrganizer = ticket.event.organizerId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';
    const isAttendee = ticket.attendee?.attendeeEmail === session.user.email;

    if (!isPurchaser && !isOrganizer && !isAdmin && !isAttendee) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    log.error({ error, ticketNumber: params.ticketNumber }, 'Failed to fetch ticket');
    return NextResponse.json({ error: 'Failed to load ticket.' }, { status: 500 });
  }
}
