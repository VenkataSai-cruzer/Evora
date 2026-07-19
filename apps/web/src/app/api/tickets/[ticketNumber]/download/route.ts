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
            ticketType: true,
            priceAmount: true,
            organizer: { select: { id: true, displayName: true } },
          },
        },
        order: { select: { orderNumber: true, bookingType: true } },
        attendee: { select: { fullName: true, ticketCategory: true } },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Authorization
    const isPurchaser = ticket.userId === session.user.id;
    const isOrganizer = ticket.event.organizer.id === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';
    if (!isPurchaser && !isOrganizer && !isAdmin) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (ticket.status !== 'CONFIRMED' && ticket.status !== 'CHECKED_IN') {
      return NextResponse.json(
        { error: 'Cannot download pass for cancelled or expired tickets.' },
        { status: 400 },
      );
    }

    const eventDate = ticket.event.startDate.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });

    const [hours, minutes] = (ticket.event.startTime || '00:00').split(':');
    const hour = parseInt(hours);
    const eventTime = `${hour % 12 || 12}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`;

    const passData: PassData = {
      eventTitle: ticket.event.title,
      eventSlug: ticket.event.slug,
      edition: ticket.event.edition,
      coverImageUrl: ticket.event.coverImageUrl,
      eventLogoUrl: ticket.event.eventLogoUrl,
      startDate: eventDate,
      startTime: eventTime,
      endTime: ticket.event.endTime,
      venueName: ticket.event.venueName,
      venueAddress: ticket.event.venueAddress,
      entryGate: ticket.event.entryGate,
      entryInstructions: ticket.event.entryInstructions,
      ticketType: ticket.event.ticketType,
      priceAmount: ticket.event.priceAmount,
      attendeeName: ticket.attendee?.fullName || 'Attendee',
      ticketCategory: ticket.attendee?.ticketCategory || ticket.category,
      bookingType: ticket.order?.bookingType || null,
      orderNumber: ticket.order?.orderNumber || null,
      ticketNumber: ticket.ticketNumber,
      organizerName: ticket.event.organizer.displayName,
      status: ticket.status,
    };

    // Generate pass in requested format
    let result: { data: Uint8Array; contentType: string; filename: string };

    if (format === 'pdf') {
      const r = await generatePdfPass(passData);
      result = { data: new Uint8Array(r.buffer), contentType: r.contentType, filename: r.filename };
    } else if (format === 'png') {
      const r = await generatePngPass(passData);
      result = { data: new Uint8Array(r.buffer), contentType: r.contentType, filename: r.filename };
    } else {
      const html = generatePassHtml(passData);
      const htmlFilename = `${ticket.event.slug || 'event'}-${ticket.ticketNumber}.html`;
      result = { data: new Uint8Array(Buffer.from(html, 'utf-8')), contentType: 'text/html; charset=utf-8', filename: htmlFilename };
    }

    // Audit log for download
    await writeAuditLog({
      action: 'PASS_DOWNLOADED',
      entityType: 'Ticket',
      entityId: ticket.id,
      actorId: session.user.id,
      metadata: {
        ticketNumber: params.ticketNumber,
        format,
        realFormat: format === 'html' || result.contentType !== 'text/html',
        eventTitle: ticket.event.title,
      },
      ...getRequestMetadata(request),
    });

    log.info({ ticketNumber: params.ticketNumber, format }, 'Event pass downloaded');

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
