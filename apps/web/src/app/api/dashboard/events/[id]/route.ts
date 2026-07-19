import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';
import { writeAuditLog, getRequestMetadata } from '@/lib/audit';
import { z } from 'zod';

const log = createLogger('api/dashboard/events/[id]');

const updateEventSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().min(10).max(10000).optional(),
  coverImageUrl: z.string().url().optional().nullable(),
  eventLogoUrl: z.string().url().optional().nullable(),
  edition: z.string().max(50).optional().nullable(),
  startDate: z.string().optional(),
  startTime: z.string().optional(),
  endDate: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  venueName: z.string().min(2).max(200).optional(),
  venueAddress: z.string().min(2).max(500).optional(),
  venueLat: z.number().optional().nullable(),
  venueLng: z.number().optional().nullable(),
  capacity: z.number().int().min(1).max(100000).optional(),
  ticketType: z.enum(['FREE', 'PAID']).optional(),
  price: z.number().min(0).optional().nullable(),
  instruments: z.string().optional(),
  skillLevel: z.string().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'SALES_OPEN', 'SALES_PAUSED', 'SALES_CLOSED', 'SOLD_OUT', 'COMPLETED', 'CANCELLED']).optional(),
  featured: z.boolean().optional(),
  entryGate: z.string().max(100).optional().nullable(),
  entryInstructions: z.string().max(2000).optional().nullable(),
  termsUrl: z.string().url().optional().nullable(),
  upiId: z.string().max(50).optional().nullable(),
  upiQrCodeUrl: z.string().url().optional().nullable(),
});

async function checkOwnership(eventId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: 'Unauthorized', status: 401 };
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, organizerId: true, title: true, slug: true, status: true },
  });

  if (!event) {
    return { error: 'Event not found', status: 404 };
  }

  const isOwner = event.organizerId === session.user.id;
  const isAdmin = session.user.role === 'ADMIN';

  if (!isOwner && !isAdmin) {
    return { error: 'Forbidden', status: 403 };
  }

  return { session, event };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const ownership = await checkOwnership(params.id);
    if ('error' in ownership) {
      return NextResponse.json({ error: ownership.error }, { status: ownership.status });
    }

    const event = await prisma.event.findUnique({
      where: { id: params.id },
      include: {
        performers: { orderBy: { sortOrder: 'asc' } },
        faqs: { orderBy: { sortOrder: 'asc' }, where: { isPublished: true } },
        scheduleItems: { orderBy: { sortOrder: 'asc' } },
        updates: { orderBy: { publishedAt: 'desc' }, take: 20 },
        journals: { orderBy: { createdAt: 'desc' }, take: 5 },
        stories: true,
        media: { orderBy: { sortOrder: 'asc' } },
        externalLinks: true,
        _count: {
          select: {
            tickets: true,
            orders: true,
            checkIns: true,
            appreciationMessages: true,
          },
        },
      },
    });

    return NextResponse.json({ event });
  } catch (error) {
    log.error({ error, eventId: params.id }, 'Failed to fetch event');
    return NextResponse.json({ error: 'Failed to load event.' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const ownership = await checkOwnership(params.id);
    if ('error' in ownership) {
      return NextResponse.json({ error: ownership.error }, { status: ownership.status });
    }

    const body = await request.json();
    const parsed = updateEventSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return NextResponse.json({ error: 'Validation failed', fieldErrors: errors }, { status: 422 });
    }

    const data = parsed.data;
    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.coverImageUrl !== undefined) updateData.coverImageUrl = data.coverImageUrl;
    if (data.eventLogoUrl !== undefined) updateData.eventLogoUrl = data.eventLogoUrl;
    if (data.edition !== undefined) updateData.edition = data.edition;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.startTime !== undefined) updateData.startTime = data.startTime;
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    if (data.endTime !== undefined) updateData.endTime = data.endTime;
    if (data.venueName !== undefined) updateData.venueName = data.venueName;
    if (data.venueAddress !== undefined) updateData.venueAddress = data.venueAddress;
    if (data.venueLat !== undefined) updateData.venueLat = data.venueLat;
    if (data.venueLng !== undefined) updateData.venueLng = data.venueLng;
    if (data.capacity !== undefined) updateData.capacity = data.capacity;
    if (data.ticketType !== undefined) updateData.ticketType = data.ticketType;
    if (data.price !== undefined && data.price !== null) updateData.priceAmount = Math.round(data.price * 100);
    if (data.instruments !== undefined) updateData.instruments = data.instruments;
    if (data.skillLevel !== undefined) updateData.skillLevel = data.skillLevel;
    if (data.visibility !== undefined) updateData.visibility = data.visibility;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.featured !== undefined) updateData.featured = data.featured;
    if (data.entryGate !== undefined) updateData.entryGate = data.entryGate;
    if (data.entryInstructions !== undefined) updateData.entryInstructions = data.entryInstructions;
    if (data.termsUrl !== undefined) updateData.termsUrl = data.termsUrl;
    if (data.upiId !== undefined) updateData.upiId = data.upiId;
    if (data.upiQrCodeUrl !== undefined) updateData.upiQrCodeUrl = data.upiQrCodeUrl;

    const event = await prisma.event.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        updatedAt: true,
      },
    });

    // Audit log — distinguish publish/unpublish from regular updates
    let auditAction = 'EVENT_UPDATED';
    if (data.status === 'PUBLISHED' && ownership.event.status !== 'PUBLISHED') {
      auditAction = 'EVENT_PUBLISHED';
    } else if (data.status === 'DRAFT' && ownership.event.status === 'PUBLISHED') {
      auditAction = 'EVENT_UNPUBLISHED';
    }

    await writeAuditLog({
      action: auditAction,
      entityType: 'Event',
      entityId: event.id,
      actorId: ownership.session.user.id,
      metadata: { title: event.title, status: event.status, changedFields: Object.keys(data) },
      ...getRequestMetadata(request),
    });

    log.info({ eventId: event.id, status: event.status }, 'Event updated');

    return NextResponse.json({ event });
  } catch (error) {
    log.error({ error, eventId: params.id }, 'Failed to update event');
    return NextResponse.json({ error: 'Failed to update event.' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const ownership = await checkOwnership(params.id);
    if ('error' in ownership) {
      return NextResponse.json({ error: ownership.error }, { status: ownership.status });
    }

    await prisma.event.update({
      where: { id: params.id },
      data: { status: 'CANCELLED' },
    });

    // Audit log
    const actorId = (await getServerSession(authOptions))?.user?.id;
    await writeAuditLog({
      action: 'EVENT_CANCELLED',
      entityType: 'Event',
      entityId: params.id,
      actorId,
      metadata: { eventSlug: ownership.event.slug, eventTitle: ownership.event.title },
      ...getRequestMetadata(_request),
    });

    log.info({ eventId: params.id }, 'Event cancelled');

    return NextResponse.json({ message: 'Event cancelled successfully.' });
  } catch (error) {
    log.error({ error, eventId: params.id }, 'Failed to cancel event');
    return NextResponse.json({ error: 'Failed to cancel event.' }, { status: 500 });
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  // POST is used for duplicate action via ?action=duplicate
  try {
    const ownership = await checkOwnership(params.id);
    if ('error' in ownership) {
      return NextResponse.json({ error: ownership.error }, { status: ownership.status });
    }
    const { event } = ownership;

    // Duplicate the event
    const original = await prisma.event.findUnique({
      where: { id: params.id },
    });

    if (!original) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const newSlug = `${original.slug}-copy-${Date.now().toString(36)}`;

    const duplicate = await prisma.event.create({
      data: {
        title: `${original.title} (Copy)`,
        slug: newSlug,
        description: original.description,
        coverImageUrl: original.coverImageUrl,
        venueName: original.venueName,
        venueAddress: original.venueAddress,
        venueLat: original.venueLat,
        venueLng: original.venueLng,
        capacity: original.capacity,
        ticketType: original.ticketType,
        priceAmount: original.priceAmount,
        instruments: original.instruments,
        skillLevel: original.skillLevel,
        visibility: original.visibility,
        status: 'DRAFT',
        organizerId: event.organizerId,
        startDate: original.startDate,
        startTime: original.startTime,
        endDate: original.endDate,
        endTime: original.endTime,
      },
      select: { id: true, title: true, slug: true, status: true },
    });

    // Audit log
    await writeAuditLog({
      action: 'EVENT_DUPLICATED',
      entityType: 'Event',
      entityId: duplicate.id,
      actorId: ownership.session.user.id,
      metadata: { originalId: params.id, originalTitle: original.title },
      ...getRequestMetadata(_request),
    });

    log.info({ originalId: params.id, duplicateId: duplicate.id }, 'Event duplicated');

    return NextResponse.json({ event: duplicate }, { status: 201 });
  } catch (error) {
    log.error({ error, eventId: params.id }, 'Failed to duplicate event');
    return NextResponse.json({ error: 'Failed to duplicate event.' }, { status: 500 });
  }
}
