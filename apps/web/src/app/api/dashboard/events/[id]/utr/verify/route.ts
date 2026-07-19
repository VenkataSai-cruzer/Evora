import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const log = createLogger('api/dashboard/events/[id]/utr/verify');

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

const verifySchema = z.object({
  paymentId: z.string().uuid('Invalid payment ID'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const access = await checkEventAccess(params.id);
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await request.json();
    const parsed = verifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', fieldErrors: parsed.error.flatten().fieldErrors }, { status: 422 });
    }

    const { paymentId } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { order: true },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status === 'SUCCEEDED') {
        throw new Error('Payment is already verified');
      }

      if (payment.method !== 'UTR') {
        throw new Error('Only UTR payments can be manually verified');
      }

      // Verify the payment
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'SUCCEEDED',
          verifiedAt: new Date(),
        },
      });

      // Confirm the order
      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          status: 'CONFIRMED',
          paymentProvider: 'UTR',
        },
      });

      // Confirm all tickets for this order
      await tx.ticket.updateMany({
        where: { orderId: payment.orderId },
        data: { status: 'CONFIRMED' },
      });

      return { paymentId: payment.id, orderId: payment.orderId };
    });

    log.info({ paymentId, orderId: result.orderId, eventId: params.id }, 'UTR payment manually verified');

    return NextResponse.json({
      message: 'Payment verified successfully. Tickets have been confirmed.',
      paymentId: result.paymentId,
      orderId: result.orderId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to verify payment';
    log.error({ error, eventId: params.id }, 'UTR verification failed');
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
