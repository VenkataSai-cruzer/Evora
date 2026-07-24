import { prisma } from '../../infrastructure/database/prisma.js';
import { generateQrToken } from '../../infrastructure/rendering/qr.service.js';
import { writeAuditLog } from '../../infrastructure/audit/audit.service.js';


export type ApprovalSource = 'MANUAL_ADMIN' | 'SYSTEM';

// ── Shared Ticket Issuance Service ─────────────────────────

interface IssueTicketsOptions {
  tx: any; // Prisma transaction client
  orderId: string;
  issuedById: string;
  source: string;
  /** Ticket category override — required because OrderAttendee does not store ticketCategory */
  ticketCategory?: string;
}

interface IssueTicketsResult {
  ticketNumbers: string[];
  ticketsCreated: number;
}

/**
 * Authoritative ticket-issuance service.
 * Creates one Ticket per OrderAttendee with unique QR token.
 *
 * IDEMPOTENT: Skips attendees that already have a Ticket.
 * Must run inside an existing Prisma transaction.
 */
export async function issueTicketsForOrder(opts: IssueTicketsOptions): Promise<IssueTicketsResult> {
  const { tx, orderId, issuedById, source, ticketCategory } = opts;

  // Load order with attendee and ticket info
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: {
      event: { select: { id: true, ticketNumberPrefix: true } },
      attendees: { include: { ticketType: { select: { name: true, price: true } } } },
      tickets: { select: { orderAttendeeId: true, ticketNumber: true } },
    },
  });

  if (!order) throw new Error('Order not found');

  // Generate a derived order number for naming (fallback if no orderNumber is set)
  const orderRef = order.orderNumber || orderId.slice(0, 8).toUpperCase();

  // Build set of attendee IDs that already have tickets
  const existingAttendeeIds = new Set(
    order.tickets.map((t: { orderAttendeeId: string | null }) => t.orderAttendeeId).filter(Boolean),
  );

  const generatedTickets: { ticketNumber: string; id: string }[] = [];
  const prefix = order.event.ticketNumberPrefix || '7N-';

  for (const attendee of order.attendees) {
    // Skip if ticket already exists for this attendee
    if (existingAttendeeIds.has(attendee.id)) continue;

    const { token, tokenHash } = generateQrToken();
    const seq = generatedTickets.length + 1;
    const ticketNumber = `${prefix}${orderRef}-${String(seq).padStart(2, '0')}`;

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
        ticketCategory: ticketCategory || 'PAID',
        source,
        visibility: ticketCategory && ticketCategory !== 'PAID' ? 'ADMIN_ONLY' : 'STANDARD',
        issuedById,
        issuedByRole: source.includes('COMPLIMENTARY') ? 'ADMIN' : 'ADMIN',
        pricePaid: attendee.ticketType?.price || 0,
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
    ticketNumbers: generatedTickets.map((t) => t.ticketNumber),
    ticketsCreated: generatedTickets.length,
  };
}

// ── Capacity Management ─────────────────────────────────────

interface CapacityReleaseItem {
  ticketTypeId: string;
  quantity: number;
}

/**
 * Release reserved capacity for a cancelled/expired order.
 * Decrements soldCount on the associated ticket types.
 * Safe to call multiple times — uses Math.max to prevent negative soldCount.
 */
export async function releaseOrderCapacity(orderId: string): Promise<CapacityReleaseItem[]> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      attendees: { select: { ticketTypeId: true } },
    },
  });

  if (!order) return [];

  // Group attendees by ticket type to count how many per type
  const typeCounts = new Map<string, number>();
  for (const attendee of order.attendees) {
    const count = typeCounts.get(attendee.ticketTypeId) || 0;
    typeCounts.set(attendee.ticketTypeId, count + 1);
  }

  const released: CapacityReleaseItem[] = [];

  for (const [ticketTypeId, quantity] of typeCounts) {
    const tt = await prisma.ticketType.findUnique({ where: { id: ticketTypeId } });
    if (!tt) continue;

    // Decrement soldCount, floor at 0
    const newSoldCount = Math.max(0, tt.soldCount - quantity);
    await prisma.ticketType.update({
      where: { id: ticketTypeId },
      data: { soldCount: newSoldCount },
    });

    released.push({ ticketTypeId, quantity });
  }

  return released;
}

interface FinalizeResult {
  orderId: string;
  orderNumber: string;
  ticketsCreated: number;
  ticketNumbers: string[];
  eventId?: string;
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
          paymentProof: { select: { id: true, status: true } },
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
          eventId: order.eventId,
        };
      }

      // Accept: PENDING_PAYMENT (initial), PENDING_VERIFICATION (after proof), REJECTED (resubmission approved)
      const validStates = ['PENDING_PAYMENT', 'PENDING_VERIFICATION', 'REJECTED'];
      if (!validStates.includes(order.status)) {
        throw new Error(
          `Order status is "${order.status}" — cannot approve. Only PENDING_PAYMENT, PENDING_VERIFICATION, or REJECTED orders can be approved.`,
        );
      }

      // ── Atomically mark PaymentProof as APPROVED inside the transaction ──
      // This prevents the race condition where PaymentProof = APPROVED but
      // order finalization fails, leaving inconsistent state.
      if (order.paymentProof && order.paymentProof.status === 'PENDING') {
        await tx.paymentProof.update({
          where: { id: order.paymentProof.id },
          data: { status: 'APPROVED', reviewedAt: new Date(), reviewedById: approvedById },
        });
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

      // Use the shared ticket-issuance service (idempotent, one QR per attendee)
      const ticketResult = await issueTicketsForOrder({
        tx,
        orderId: order.id,
        issuedById: approvedById,
        source: source === 'MANUAL_ADMIN' ? 'PAYMENT_APPROVAL' : 'SYSTEM',
      });

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        ticketsCreated: ticketResult.ticketsCreated,
        ticketNumbers: ticketResult.ticketNumbers,
        eventId: order.eventId,
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
    eventId: result.eventId,
    ipAddress,
    userAgent,
    metadata: {
      orderNumber: result.orderNumber,
      ticketsCreated: result.ticketsCreated,
      source,
      note: approvalNote,
    },
  });

  // Payment/ticket email notifications disabled until verified domain is set up.
  // Users check status via their dashboard.

  return {
    orderId: result.orderId,
    orderNumber: result.orderNumber,
    ticketsCreated: result.ticketsCreated,
    ticketNumbers: result.ticketNumbers,
  };
}
