import { FastifyInstance } from 'fastify';
import { prisma } from '../../infrastructure/database/prisma.js';

/**
 * Test payment endpoint for staging/staging environments.
 *
 * This route is ONLY available when:
 *   1. NODE_ENV is not 'production'
 *   2. ENABLE_TEST_PAYMENT is 'true'
 *
 * It simulates a successful payment for testing without a real payment provider.
 * It must never be accessible in production.
 */

export async function testPaymentRoutes(app: FastifyInstance) {
  /**
   * POST /api/v1/payments/test
   *
   * Simulates completing a pending order's payment.
   * Body: { orderId: string }
   *
   * This creates a successful payment record and confirms the order,
   * similar to what a real payment webhook would do.
   */
  app.post('/payments/test', async (request, reply) => {
    // Guard: only available in non-production with feature flag
    if (
      process.env.NODE_ENV === 'production' ||
      process.env.ENABLE_TEST_PAYMENT !== 'true'
    ) {
      return reply.code(404).send({
        error: 'Not found',
        message: 'Test payment is not available in this environment.',
      });
    }

    const { orderId } = request.body as { orderId?: string };

    if (!orderId) {
      return reply.code(400).send({
        error: 'Bad request',
        message: 'orderId is required.',
      });
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        // Verify order exists and is pending
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: { event: true },
        });

        if (!order) {
          throw new Error('Order not found');
        }

        if (order.status !== 'PENDING_PAYMENT') {
          throw new Error(
            `Order status is "${order.status}", expected PENDING_PAYMENT`,
          );
        }

        // Create test payment record
        const payment = await tx.payment.create({
          data: {
            orderId: order.id,
            amount: order.total,
            currency: order.currency,
            method: 'test',
            status: 'SUCCEEDED',
            providerPaymentId: `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            verifiedAt: new Date(),
          },
        });

        // Confirm the order
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'CONFIRMED',
            paymentProvider: 'test',
            paymentReference: payment.id,
            paidAt: new Date(),
          },
        });

        // Create tickets from order attendees
        const orderAttendees = await tx.orderAttendee.findMany({
          where: { orderId: order.id },
        });

        const tickets = [];
        for (const attendee of orderAttendees) {
          const ticketNumber = `${order.event.ticketNumberPrefix || '7N-'}${order.orderNumber}-${String(attendee.id).slice(-4)}`;

          const ticket = await tx.ticket.create({
            data: {
              ticketNumber,
              eventId: order.eventId,
              userId: order.userId,
              orderId: order.id,
              orderAttendeeId: attendee.id,
              ticketTypeId: attendee.ticketTypeId,
              status: 'CONFIRMED',
              qrTokenHash: `test_hash_${Date.now()}_${Math.random().toString(36).slice(2, 16)}`,
              templateVersion: 1,
              renderingStatus: 'PENDING',
            },
          });
          tickets.push(ticket);
        }

        return {
          payment: { id: payment.id, status: payment.status },
          order: { id: order.id, status: 'CONFIRMED', orderNumber: order.orderNumber },
          ticketsCreated: tickets.length,
        };
      });

      return reply.code(201).send({
        success: true,
        message: `Test payment completed. ${result.ticketsCreated} ticket(s) created.`,
        data: {
          payment: result.payment,
          order: result.order,
          ticketsCreated: result.ticketsCreated,
        },
        note: 'TEST PAYMENT — Not a real transaction. Only available in staging.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return reply.code(400).send({
        error: 'Payment failed',
        message,
      });
    }
  });

  /**
   * GET /api/v1/payments/test/status
   *
   * Returns whether test payments are available in this environment.
   */
  app.get('/payments/test/status', async (_request, reply) => {
    const available =
      process.env.NODE_ENV !== 'production' &&
      process.env.ENABLE_TEST_PAYMENT === 'true';

    return reply.send({
      testPaymentAvailable: available,
      environment: process.env.NODE_ENV || 'development',
    });
  });
}
