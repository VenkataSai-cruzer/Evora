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
  shortDescription: z.string().max(300).optional().nullable(),
  description: z.string().max(10000).optional().nullable(),
  startAt: z.string().optional(),
  endAt: z.string().optional().nullable(),
  venueName: z.string().min(2).max(200).optional(),
  venueAddress: z.string().max(500).optional().nullable(),
  mapUrl: z.string().optional().nullable(),
  timezone: z.string().optional(),
  totalCapacity: z.number().int().min(0).max(100000).optional(),
  salesStartAt: z.string().optional().nullable(),
  salesEndAt: z.string().optional().nullable(),
  salesPaused: z.boolean().optional(),
  bookingClosed: z.boolean().optional(),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED']).optional(),
  posterObjectKey: z.string().optional().nullable(),
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
        _count: {
          select: {
            tickets: true,
            orders: true,
            checkIns: true,
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
    if (data.shortDescription !== undefined) updateData.shortDescription = data.shortDescription;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.startAt !== undefined) updateData.startAt = new Date(data.startAt);
    if (data.endAt !== undefined) updateData.endAt = data.endAt ? new Date(data.endAt) : null;
    if (data.venueName !== undefined) updateData.venueName = data.venueName;
    if (data.venueAddress !== undefined) updateData.venueAddress = data.venueAddress;
    if (data.mapUrl !== undefined) updateData.mapUrl = data.mapUrl;
    if (data.totalCapacity !== undefined) updateData.totalCapacity = data.totalCapacity;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail;
    if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone;
    if (data.terms !== undefined) updateData.terms = data.terms;
    if (data.salesPaused !== undefined) updateData.salesPaused = data.salesPaused;
    if (data.bookingClosed !== undefined) updateData.bookingClosed = data.bookingClosed;

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
        shortDescription: original.shortDescription,
        description: original.description,
        posterObjectKey: original.posterObjectKey,
        status: 'DRAFT',
        startAt: original.startAt,
        venueName: original.venueName,
        venueAddress: original.venueAddress,
        mapUrl: original.mapUrl,
        timezone: original.timezone,
        totalCapacity: original.totalCapacity,
        contactEmail: original.contactEmail,
        terms: original.terms,
        organizerId: event.organizerId,
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
