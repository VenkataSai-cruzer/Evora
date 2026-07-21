import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const log = createLogger('api/dashboard/events/[id]/utr/batch');

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

function parseUtrsFromCsv(csvText: string): { utrNumber: string; amount?: number }[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  const results: { utrNumber: string; amount?: number }[] = [];

  const firstLine = lines[0]?.toLowerCase() || '';
  const hasHeader = /utr|ref|transaction|txn|amount|date/i.test(firstLine);
  const dataLines = hasHeader ? lines.slice(1) : lines;

  for (const line of dataLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const columns = trimmed.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));

    let utrNumber = '';
    let amount: number | undefined;

    for (const col of columns) {
      const cleaned = col.replace(/[\s-]/g, '');
      if (/^\d{12}$/.test(cleaned)) {
        utrNumber = cleaned;
      }
      const amountMatch = col.replace(/[₹$,\s]/g, '').match(/^(\d+(\.\d{1,2})?)$/);
      if (amountMatch && parseFloat(amountMatch[1]) > 0) {
        amount = Math.round(parseFloat(amountMatch[1]) * 100);
      }
    }

    if (!utrNumber) {
      const utrMatch = trimmed.replace(/[\s-]/g, '').match(/\b(\d{12})\b/);
      if (utrMatch) {
        utrNumber = utrMatch[1];
      }
    }

    if (utrNumber) {
      results.push({ utrNumber, amount });
    }
  }

  return results;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const access = await checkEventAccess(params.id);
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const eventId = params.id;

    if (!file) {
      return NextResponse.json({ error: 'No file provided. Please upload a CSV file.' }, { status: 400 });
    }

    let csvText: string;
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
      csvText = await file.text();
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      return NextResponse.json({
        error: 'Excel files are not yet supported. Please export your bank statement as CSV.',
      }, { status: 400 });
    } else {
      csvText = await file.text();
    }

    const parsed = parseUtrsFromCsv(csvText);

    if (parsed.length === 0) {
      return NextResponse.json({
        error: 'No valid 12-digit UTR numbers found in the file.',
        message: 'Please ensure your bank statement CSV contains the UTR/Ref number column.',
      }, { status: 400 });
    }

    // Process UTRs by matching against existing pending payments
    const results = await prisma.$transaction(async (tx) => {
      const matched: { utrNumber: string; paymentId: string; orderId: string }[] = [];
      const unmatched: { utrNumber: string; amount?: number }[] = [];

      for (const item of parsed) {
        // Check if this UTR already exists in the system
        const existingPayment = await tx.payment.findUnique({
          where: { utrNumber: item.utrNumber },
          include: { order: true },
        });

        if (existingPayment) {
          matched.push({
            utrNumber: item.utrNumber,
            paymentId: existingPayment.id,
            orderId: existingPayment.orderId,
          });
          continue;
        }

        // Try to match against pending UTR payments for this event
        if (item.amount) {
          const pendingPayment = await tx.payment.findFirst({
            where: {
              method: 'UTR',
              status: 'PENDING',
              order: { eventId },
              amount: item.amount,
            },
            include: { order: true },
          });

          if (pendingPayment) {
            await tx.payment.update({
              where: { id: pendingPayment.id },
              data: {
                status: 'SUCCEEDED',
                utrNumber: item.utrNumber,
                verifiedAt: new Date(),
              },
            });

            await tx.order.update({
              where: { id: pendingPayment.orderId },
              data: { status: 'CONFIRMED', paymentProvider: 'UTR' },
            });

            await tx.ticket.updateMany({
              where: { orderId: pendingPayment.orderId },
              data: { status: 'CONFIRMED' },
            });

            matched.push({
              utrNumber: item.utrNumber,
              paymentId: pendingPayment.id,
              orderId: pendingPayment.orderId,
            });
            continue;
          }
        }

        unmatched.push({ utrNumber: item.utrNumber, amount: item.amount });
      }

      return { matched, unmatched };
    });

    log.info({
      eventId,
      totalFound: parsed.length,
      matched: results.matched.length,
      unmatched: results.unmatched.length,
    }, 'UTR batch processed');

    return NextResponse.json({
      matchedCount: results.matched.length,
      unmatchedCount: results.unmatched.length,
      totalFound: parsed.length,
      matched: results.matched,
      unmatched: results.unmatched,
      message: `Found ${parsed.length} UTR numbers. ${results.matched.length} matched and verified. ${results.unmatched.length} unmatched (you can manually link these to orders).`,
    }, { status: 201 });
  } catch (error) {
    log.error({ error, eventId: params.id }, 'Failed to process UTR batch');
    return NextResponse.json({ error: 'Failed to process bank statement. Please try again.' }, { status: 500 });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const access = await checkEventAccess(params.id);
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const pendingPayments = await prisma.payment.count({
      where: {
        order: { eventId: params.id },
        method: 'UTR',
        status: 'PENDING',
      },
    });

    const verifiedPayments = await prisma.payment.count({
      where: {
        order: { eventId: params.id },
        method: 'UTR',
        status: 'SUCCEEDED',
      },
    });

    const allUtrPayments = await prisma.payment.findMany({
      where: {
        method: 'UTR',
        order: { eventId: params.id },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        utrNumber: true,
        amount: true,
        status: true,
        verifiedAt: true,
        createdAt: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            userId: true,
          },
        },
      },
    });

    return NextResponse.json({
      payments: allUtrPayments,
      stats: {
        pendingPayments,
        verifiedPayments,
        totalPayments: allUtrPayments.length,
      },
    });
  } catch (error) {
    log.error({ error, eventId: params.id }, 'Failed to fetch UTR data');
    return NextResponse.json({ error: 'Failed to load UTR data.' }, { status: 500 });
  }
}
