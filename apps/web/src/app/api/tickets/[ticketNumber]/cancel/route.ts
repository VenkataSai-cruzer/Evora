import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';
import { writeAuditLog, getRequestMetadata } from '@/lib/audit';

export const dynamic = 'force-dynamic';
const log = createLogger('api/tickets/[ticketNumber]/cancel');

export async function POST(
  request: NextRequest,
  { params }: { params: { ticketNumber: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { ticketNumber: params.ticketNumber },
      include: { event: { select: { id: true, organizerId: true, title: true } } },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const isPurchaser = ticket.userId === session.user.id;
    const isOrganizer = ticket.event.organizerId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';
    if (!isPurchaser && !isOrganizer && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (ticket.status === 'CHECKED_IN') {
      return NextResponse.json({ error: 'Cannot cancel a ticket that has already been checked in.' }, { status: 400 });
    }

    if (ticket.status === 'CANCELLED') {
      return NextResponse.json({ error: 'This ticket has already been cancelled.' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedTicket = await tx.ticket.update({
        where: { id: ticket.id },
        data: { status: 'CANCELLED' },
      });

      // Release capacity
      if (ticket.ticketTypeId) {
        await tx.ticketType.update({
          where: { id: ticket.ticketTypeId },
          data: { soldCount: { decrement: 1 } },
        });
      }

      if (ticket.orderId) {
        const remaining = await tx.ticket.count({
          where: { orderId: ticket.orderId, status: { in: ['CONFIRMED', 'CHECKED_IN'] } },
        });
        if (remaining === 0) {
          await tx.order.update({
            where: { id: ticket.orderId },
            data: { status: 'CANCELLED' },
          });
        }
      }

      return updatedTicket;
    });

    await writeAuditLog({
      action: 'TICKET_CANCELLED',
      entityType: 'Ticket',
      entityId: result.id,
      actorId: session.user.id,
      metadata: { ticketNumber: params.ticketNumber, eventTitle: ticket.event.title },
      ...getRequestMetadata(request),
    });

    log.info({ ticketNumber: params.ticketNumber }, 'Ticket cancelled');
    return NextResponse.json({ message: 'Ticket cancelled successfully.', ticket: { ticketNumber: params.ticketNumber, status: 'CANCELLED' } });
  } catch (error) {
    log.error({ error, ticketNumber: params.ticketNumber }, 'Failed to cancel ticket');
    return NextResponse.json({ error: 'Failed to cancel ticket.' }, { status: 500 });
  }
}
