import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';
import { writeAuditLog, getRequestMetadata } from '@/lib/audit';
import { z } from 'zod';

const log = createLogger('api/dashboard/events/[id]/schedule/[itemId]');

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  startTime: z.string().optional(),
  endTime: z.string().optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
  isPublished: z.boolean().optional(),
});

async function checkAccess(eventId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: 'Unauthorized', status: 401 } as const;
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true, organizerId: true } });
  if (!event) return { error: 'Event not found', status: 404 } as const;
  if (event.organizerId !== session.user.id && session.user.role !== 'ADMIN') return { error: 'Forbidden', status: 403 } as const;
  return { session, event };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } },
) {
  try {
    const access = await checkAccess(params.id);
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }, { status: 422 });
    }

    const item = await prisma.eventScheduleItem.findFirst({
      where: { id: params.itemId, eventId: params.id },
    });

    if (!item) return NextResponse.json({ error: 'Schedule item not found' }, { status: 404 });

    const updated = await prisma.eventScheduleItem.update({
      where: { id: params.itemId },
      data: parsed.data,
    });

    await writeAuditLog({
      action: 'SCHEDULE_ITEM_UPDATED',
      entityType: 'EventScheduleItem',
      entityId: updated.id,
      actorId: access.session.user.id,
      metadata: { eventId: params.id, title: updated.title, changedFields: Object.keys(parsed.data) },
      ...getRequestMetadata(request),
    });

    return NextResponse.json({ item: updated });
  } catch (error) {
    log.error({ error, eventId: params.id, itemId: params.itemId }, 'Failed to update schedule item');
    return NextResponse.json({ error: 'Failed to update schedule item.' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } },
) {
  try {
    const access = await checkAccess(params.id);
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

    const item = await prisma.eventScheduleItem.findFirst({
      where: { id: params.itemId, eventId: params.id },
    });

    if (!item) return NextResponse.json({ error: 'Schedule item not found' }, { status: 404 });

    await prisma.eventScheduleItem.delete({ where: { id: params.itemId } });

    await writeAuditLog({
      action: 'SCHEDULE_ITEM_DELETED',
      entityType: 'EventScheduleItem',
      entityId: params.itemId,
      actorId: access.session.user.id,
      metadata: { eventId: params.id, title: item.title },
      ...getRequestMetadata(request),
    });

    return NextResponse.json({ message: 'Schedule item deleted.' });
  } catch (error) {
    log.error({ error, eventId: params.id, itemId: params.itemId }, 'Failed to delete schedule item');
    return NextResponse.json({ error: 'Failed to delete schedule item.' }, { status: 500 });
  }
}
