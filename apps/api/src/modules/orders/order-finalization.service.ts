import { prisma } from '../../infrastructure/database/prisma.js';
import { generateQrToken } from '../../infrastructure/rendering/qr.service.js';
import { writeAuditLog } from '../../infrastructure/audit/audit.service.js';
import {
  sendPaymentApprovedEmail,
  sendTicketIssuedEmail,
} from '../../infrastructure/email/email.service.js';

export type ApprovalSource = 'MANUAL_ADMIN' | 'SYSTEM';

interface FinalizeResult {
  orderId: string;
  orderNumber: string;
  ticketsCreated: number;
  ticketNumbers: string[];
}

/**
 * Shared finalization service for payment approval.
 * Used by both manual admin approval and automatic gateway approval.
 *
 * IDEMPOTENT: If called on an already-CONFIRMED order, returns the existing result.
 * Runs inside a transaction with optimistic locking to prevent duplicate ticket creation.
 */
export async function finalizeApprovedOrder(
  orderId: string,
  approvedById: string,
  source: ApprovalSource = 'MANUAL_ADMIN',
  _overrideAmount?: number,
  approvalNote?: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<FinalizeResult> {
  const result = await prisma.$transaction(
    async (tx) => {
      // Lock the order row to prevent concurrent approvals
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          event: true,
          user: true,
          attendees: {
            include: { ticketType: true },
          },
          payments: {
            where: { status: 'PENDING' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          tickets: { select: { id: true, ticketNumber: true } },
        },
      });

      if (!order) {
        throw new Error('Order not found');
      }

      // Idempotency: already confirmed → return existing tickets
      if (order.status === 'CONFIRMED') {
        return {
          orderId: order.id,
          orderNumber: order.orderNumber,
          ticketsCreated: 0,
          ticketNumbers: order.tickets.map((t) => t.ticketNumber),
          alreadyConfirmed: true,
        };
      }

      // Accept: PENDING_PAYMENT (initial), PENDING_VERIFICATION (after proof), REJECTED (resubmission approved)
      const validStates = ['PENDING_PAYMENT', 'PENDING_VERIFICATION', 'REJECTED'];
      if (!validStates.includes(order.status)) {
        throw new Error(
          `Order status is "${order.status}" — cannot approve. Only PENDING_PAYMENT, PENDING_VERIFICATION, or REJECTED orders can be approved.`,
        );
      }

      // Verify capacity hasn't been over-sold (re-check in transaction)
      const capacityChecks = new Map<string, number>();
      for (const attendee of order.attendees) {
        const count = capacityChecks.get(attendee.ticketTypeId) || 0;
        capacityChecks.set(attendee.ticketTypeId, count + 1);
      }
      for (const [ttId, needed] of capacityChecks) {
        const tt = await tx.ticketType.findUnique({ where: { id: ttId } });
        if (!tt) throw new Error(`TicketType ${ttId} not found`);
        if (tt.soldCount + needed > tt.capacity && tt.capacity > 0) {
          throw new Error(`Insufficient capacity for ticket type "${tt.name}"`);
        }
      }

      // Mark payment as succeeded
      const pendingPayment = order.payments[0];
      if (pendingPayment) {
        await tx.payment.update({
          where: { id: pendingPayment.id },
          data: { status: 'SUCCEEDED', verifiedAt: new Date() },
        });
      }

      // Confirm the order
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'CONFIRMED',
          paymentProvider: source === 'MANUAL_ADMIN' ? 'utr' : 'gateway',
          paymentReference: pendingPayment?.id ?? null,
          paidAt: new Date(),
        },
      });

      // Generate tickets for each attendee
      const generatedTickets: { ticketNumber: string; id: string }[] = [];
      for (const attendee of order.attendees) {
        const { token, tokenHash } = generateQrToken();
        const prefix = order.event.ticketNumberPrefix || '7N-';
        const seq = generatedTickets.length + 1;
        const ticketNumber = `${prefix}${order.orderNumber}-${String(seq).padStart(2, '0')}`;

        const ticket = await tx.ticket.create({
          data: {
            ticketNumber,
            eventId: order.eventId,
            userId: order.userId,
            orderId: order.id,
            orderAttendeeId: attendee.id,
            ticketTypeId: attendee.ticketTypeId,
            attendeeName: attendee.attendeeName,
            attendeeEmail: attendee.attendeeEmail || '',
            attendeePhone: attendee.attendeePhone || '',
            ticketCategory: 'PAID',
            source: source === 'MANUAL_ADMIN' ? 'PAYMENT_APPROVAL' : 'SYSTEM',
            visibility: 'STANDARD',
            issuedById: approvedById,
            issuedByRole: 'ADMIN',
            pricePaid: attendee.ticketType.price,
            status: 'CONFIRMED',
            qrToken: token,
            qrTokenHash: tokenHash,
            templateVersion: 1,
            renderingStatus: 'PENDING',
          },
        });

        generatedTickets.push({ ticketNumber: ticket.ticketNumber, id: ticket.id });
      }

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        ticketsCreated: generatedTickets.length,
        ticketNumbers: generatedTickets.map((t) => t.ticketNumber),
        alreadyConfirmed: false,
        order,
      };
    },
    {
      isolationLevel: 'Serializable',
      timeout: 15000,
    },
  );

  // Post-transaction: write audit log and send notifications
  // These MUST NOT roll back the transaction if they fail
  const approver = await prisma.user.findUnique({
    where: { id: approvedById },
    select: { role: true },
  });

  await writeAuditLog('PAYMENT_APPROVED', 'Order', orderId, {
    actorId: approvedById,
    actorRole: approver?.role,
    eventId: (result as { order?: { eventId?: string } }).order?.eventId,
    ipAddress,
    userAgent,
    metadata: {
      orderNumber: result.orderNumber,
      ticketsCreated: result.ticketsCreated,
      source,
      note: approvalNote,
    },
  });

  // Send email notifications (fire and forget)
  const fullOrder = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      event: true,
    },
  });

  if (fullOrder && !(result as { alreadyConfirmed?: boolean }).alreadyConfirmed) {
    const eventDate = fullOrder.event.startAt.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    sendPaymentApprovedEmail({
      to: fullOrder.user.email,
      attendeeName: fullOrder.user.name,
      orderNumber: fullOrder.orderNumber,
      eventTitle: fullOrder.event.title,
      eventDate,
      venueName: fullOrder.event.venueName,
      ticketCount: result.ticketsCreated,
      userId: fullOrder.userId,
    }).catch((err) => console.error('[Email] sendPaymentApprovedEmail failed:', err));

    // Send individual ticket emails
    const tickets = await prisma.ticket.findMany({
      where: { orderId: fullOrder.id },
      include: { ticketType: true },
    });

    for (const ticket of tickets) {
      sendTicketIssuedEmail({
        to: ticket.attendeeEmail || fullOrder.user.email,
        attendeeName: ticket.attendeeName || fullOrder.user.name,
        eventTitle: fullOrder.event.title,
        eventDate,
        venueName: fullOrder.event.venueName,
        ticketNumber: ticket.ticketNumber,
        ticketCategory: ticket.ticketCategory,
        userId: fullOrder.userId,
      }).catch((err) => console.error('[Email] sendTicketIssuedEmail failed:', err));
    }
  }

  return {
    orderId: result.orderId,
    orderNumber: result.orderNumber,
    ticketsCreated: result.ticketsCreated,
    ticketNumbers: result.ticketNumbers,
  };
}
