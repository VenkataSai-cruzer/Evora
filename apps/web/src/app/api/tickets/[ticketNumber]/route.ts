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
            coverImageUrl: true,
            eventLogoUrl: true,
            edition: true,
            startDate: true,
            startTime: true,
            endDate: true,
            endTime: true,
            venueName: true,
            venueAddress: true,
            entryGate: true,
            entryInstructions: true,
            capacity: true,
            ticketType: true,
            priceAmount: true,
            status: true,
            organizerId: true,
            organizer: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
              },
            },
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
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Authorization: ticket purchaser, attendee, event organizer, or admin
    const isPurchaser = ticket.userId === session.user.id;
    const isOrganizer = ticket.event.organizerId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';
    const isAttendee = ticket.attendee?.email === session.user.email;

    if (!isPurchaser && !isOrganizer && !isAdmin && !isAttendee) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Do not expose qrSecret to unauthorized users
    const response: Record<string, unknown> = {
      id: ticket.ticketNumber,
      ticketNumber: ticket.ticketNumber,
      type: ticket.type,
      category: ticket.category,
      status: ticket.status,
      priceAmount: ticket.priceAmount,
      purchasedAt: ticket.purchasedAt,
      cancelledAt: ticket.cancelledAt,
      expiredAt: ticket.expiredAt,
      entryGate: ticket.entryGate,
      zone: ticket.zone,
      seat: ticket.seat,
      event: ticket.event,
      order: ticket.order,
      attendee: ticket.attendee,
      user: ticket.user,
    };

    // Only include QR secret for valid/checked-in tickets owned by purchaser/organizer/admin
    if ((ticket.status === 'CONFIRMED' || ticket.status === 'CHECKED_IN') && (isPurchaser || isOrganizer || isAdmin)) {
      response.qrSecret = ticket.qrSecret;
      response.qrDataUrl = ticket.qrDataUrl;
    }

    return NextResponse.json({ ticket: response });
  } catch (error) {
    log.error({ error, ticketNumber: params.ticketNumber }, 'Failed to fetch ticket');
    return NextResponse.json({ error: 'Failed to load ticket.' }, { status: 500 });
  }
}
