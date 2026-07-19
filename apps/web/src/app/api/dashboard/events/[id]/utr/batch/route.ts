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

/**
 * Parse UTR numbers from CSV text.
 * Supports: CSV with UTR column, or simple list of 12-digit numbers.
 * Common bank formats: UTR number may be in a column, or part of a transaction description.
 */
function parseUtrsFromCsv(csvText: string): { utrNumber: string; amount?: number }[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  const results: { utrNumber: string; amount?: number }[] = [];

  // Try to detect header row
  const firstLine = lines[0]?.toLowerCase() || '';
  const hasHeader = /utr|ref|transaction|txn|amount|date/i.test(firstLine);
  const dataLines = hasHeader ? lines.slice(1) : lines;

  for (const line of dataLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Try parsing as CSV columns
    const columns = trimmed.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));

    // Look for a 12-digit number in any column
    let utrNumber = '';
    let amount: number | undefined;

    for (const col of columns) {
      const cleaned = col.replace(/[\s-]/g, '');
      // Check if it's a 12-digit number (UTR)
      if (/^\d{12}$/.test(cleaned)) {
        utrNumber = cleaned;
      }
      // Check if it's a monetary amount
      const amountMatch = col.replace(/[₹$,\s]/g, '').match(/^(\d+(\.\d{1,2})?)$/);
      if (amountMatch && parseFloat(amountMatch[1]) > 0) {
        amount = Math.round(parseFloat(amountMatch[1]) * 100); // Convert to cents
      }
    }

    // If no CSV column matched, try extracting 12-digit number from the raw line
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
      return NextResponse.json({ error: 'No file provided. Please upload a CSV or Excel file.' }, { status: 400 });
    }

    // Read file content
    let csvText: string;
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
      csvText = await file.text();
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      return NextResponse.json({
        error: 'Excel files are not yet supported. Please export your bank statement as CSV.',
      }, { status: 400 });
    } else {
      // Try reading as text regardless
      csvText = await file.text();
    }

    // Parse UTRs from CSV
    const parsed = parseUtrsFromCsv(csvText);

    if (parsed.length === 0) {
      return NextResponse.json({
        error: 'No valid 12-digit UTR numbers found in the file.',
        message: 'Please ensure your bank statement CSV contains the UTR/Ref number column.',
      }, { status: 400 });
    }

    // Create batch and records in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.utrBatch.create({
        data: {
          eventId,
          uploadedById: access.session.user.id,
          filename: file.name,
          rowCount: parsed.length,
          status: 'PROCESSING',
        },
      });

      // Create UTR records
      let matchedCount = 0;
      for (const item of parsed) {
        // Check if this UTR matches any pending payment
        const matchingPayment = await tx.payment.findUnique({
          where: { utrNumber: item.utrNumber },
        });

        const isMatched = !!matchingPayment;

        await tx.utrRecord.create({
          data: {
            batchId: batch.id,
            utrNumber: item.utrNumber,
            amount: item.amount,
            isMatched,
            matchedPaymentId: matchingPayment?.id || null,
          },
        });

        if (isMatched) {
          matchedCount++;

          // Update payment as verified
          await tx.payment.update({
            where: { id: matchingPayment.id },
            data: {
              status: 'SUCCEEDED',
              utrBatchId: batch.id,
              verifiedAt: new Date(),
            },
          });

          // Update the associated order to CONFIRMED
          await tx.order.update({
            where: { id: matchingPayment.orderId },
            data: {
              status: 'CONFIRMED',
              paymentProvider: 'UTR',
            },
          });

          // Update all tickets for this order to CONFIRMED
          await tx.ticket.updateMany({
            where: { orderId: matchingPayment.orderId },
            data: { status: 'CONFIRMED' },
          });
        }
      }

      // Update batch stats
      await tx.utrBatch.update({
        where: { id: batch.id },
        data: {
          matchedCount,
          unmatchedCount: parsed.length - matchedCount,
          status: 'COMPLETED',
        },
      });

      return { batch, matchedCount, unmatchedCount: parsed.length - matchedCount, totalFound: parsed.length };
    });

    log.info({
      eventId,
      batchId: result.batch.id,
      totalFound: result.totalFound,
      matched: result.matchedCount,
      unmatched: result.unmatchedCount,
    }, 'UTR batch uploaded and processed');

    return NextResponse.json({
      batch: {
        id: result.batch.id,
        filename: result.batch.filename,
        totalFound: result.totalFound,
        matchedCount: result.matchedCount,
        unmatchedCount: result.unmatchedCount,
        status: result.batch.status,
      },
      message: `Found ${result.totalFound} UTR numbers. ${result.matchedCount} matched and verified. ${result.unmatchedCount} unmatched.`,
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

    const batches = await prisma.utrBatch.findMany({
      where: { eventId: params.id },
      orderBy: { createdAt: 'desc' },
      include: {
        uploaded: {
          select: { id: true, displayName: true },
        },
        _count: {
          select: { records: true },
        },
      },
    });

    // Get UTR payment stats
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

    return NextResponse.json({
      batches,
      stats: {
        pendingPayments,
        verifiedPayments,
        totalBatches: batches.length,
        totalRecords: (batches as any[]).reduce((sum: number, b: any) => sum + b._count.records, 0),
      },
    });
  } catch (error) {
    log.error({ error, eventId: params.id }, 'Failed to fetch UTR batches');
    return NextResponse.json({ error: 'Failed to load UTR data.' }, { status: 500 });
  }
}
