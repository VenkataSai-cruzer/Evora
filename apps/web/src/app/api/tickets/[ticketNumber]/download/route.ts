import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';
import { generatePassHtml } from '@/lib/pass-generator';
import { generatePdfPass, generatePngPass } from '@/lib/pdf-generator';
import type { PassData } from '@/lib/pass-generator';
import { writeAuditLog, getRequestMetadata } from '@/lib/audit';

const log = createLogger('api/tickets/[ticketNumber]/download');
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { ticketNumber: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'html';
    if (format !== 'html' && format !== 'pdf' && format !== 'png') {
      return NextResponse.json({ error: 'Invalid format. Use html, pdf, or png.' }, { status: 400 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { ticketNumber: params.ticketNumber },
      include: {
        event: {
          select: {
            title: true,
            slug: true,
            posterObjectKey: true,
            startAt: true,
            venueName: true,
            venueAddress: true,
            organizer: { select: { id: true, name: true } },
          },
        },
        order: { select: { orderNumber: true } },
        attendee: { select: { attendeeName: true } },
        ticketType: { select: { name: true, price: true } },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const isPurchaser = ticket.userId === session.user.id;
    const isOrganizer = ticket.event.organizer.id === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';
    if (!isPurchaser && !isOrganizer && !isAdmin) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (ticket.status !== 'CONFIRMED' && ticket.status !== 'CHECKED_IN') {
      return NextResponse.json({ error: 'Cannot download pass for cancelled or expired tickets.' }, { status: 400 });
    }

    const eventDate = ticket.event.startAt.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });

    const passData: PassData = {
      eventTitle: ticket.event.title,
      eventSlug: ticket.event.slug,
      startDate: eventDate,
      venueName: ticket.event.venueName,
      venueAddress: ticket.event.venueAddress || '',
      attendeeName: ticket.attendee?.attendeeName || 'Attendee',
      ticketCategory: ticket.ticketType.name,
      orderNumber: ticket.order?.orderNumber || null,
      ticketNumber: ticket.ticketNumber,
      organizerName: ticket.event.organizer.name,
      status: ticket.status,
      ticketType: ticket.ticketType.name,
      priceAmount: ticket.ticketType.price,
    };

    let result: { data: Uint8Array; contentType: string; filename: string };

    if (format === 'pdf') {
      const r = await generatePdfPass(passData);
      result = { data: new Uint8Array(r.buffer), contentType: r.contentType, filename: r.filename };
    } else if (format === 'png') {
      const r = await generatePngPass(passData);
      result = { data: new Uint8Array(r.buffer), contentType: r.contentType, filename: r.filename };
    } else {
      const html = generatePassHtml(passData);
      result = { data: new Uint8Array(Buffer.from(html, 'utf-8')), contentType: 'text/html; charset=utf-8', filename: `${ticket.event.slug || 'event'}-${ticket.ticketNumber}.html` };
    }

    await writeAuditLog({
      action: 'PASS_DOWNLOADED',
      entityType: 'Ticket',
      entityId: ticket.id,
      actorId: session.user.id,
      metadata: { ticketNumber: params.ticketNumber, format, eventTitle: ticket.event.title },
      ...getRequestMetadata(request),
    });

    return new NextResponse(result.data as unknown as BodyInit, {
      headers: {
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Content-Length': String(result.data.byteLength),
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    log.error({ error, ticketNumber: params.ticketNumber }, 'Failed to generate pass');
    return NextResponse.json({ error: 'Failed to generate pass.' }, { status: 500 });
  }
}
