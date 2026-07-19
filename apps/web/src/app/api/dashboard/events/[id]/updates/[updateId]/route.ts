import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';
import { writeAuditLog, getRequestMetadata } from '@/lib/audit';
import { z } from 'zod';

const log = createLogger('api/dashboard/events/[id]/updates/[updateId]');

const updateSchema = z.object({
  message: z.string().min(1).max(2000).optional(),
  updateType: z.enum(['EVENT_STARTED', 'ENTRY_OPENED', 'VENUE_CHANGE', 'TIMING_CHANGE', 'PERFORMANCE_NOW', 'BREAK', 'INSTRUCTION', 'EVENT_COMPLETED', 'EMERGENCY', 'CANCELLATION']).optional(),
  visibility: z.enum(['PUBLIC', 'ATTENDEES_ONLY']).optional(),
  isPinned: z.boolean().optional(),
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
  { params }: { params: { id: string; updateId: string } },
) {
  try {
    const access = await checkAccess(params.id);
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }, { status: 422 });
    }

    const existing = await prisma.eventUpdate.findFirst({ where: { id: params.updateId, eventId: params.id } });
    if (!existing) return NextResponse.json({ error: 'Update not found' }, { status: 404 });

    const updated = await prisma.eventUpdate.update({ where: { id: params.updateId }, data: parsed.data });

    await writeAuditLog({
      action: 'LIVE_UPDATE_UPDATED',
      entityType: 'EventUpdate',
      entityId: updated.id,
      actorId: access.session.user.id,
      metadata: { eventId: params.id, type: updated.updateType },
      ...getRequestMetadata(request),
    });

    return NextResponse.json({ update: updated });
  } catch (error) {
    log.error({ error, eventId: params.id, updateId: params.updateId }, 'Failed to update live update');
    return NextResponse.json({ error: 'Failed to update live update.' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; updateId: string } },
) {
  try {
    const access = await checkAccess(params.id);
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

    const existing = await prisma.eventUpdate.findFirst({ where: { id: params.updateId, eventId: params.id } });
    if (!existing) return NextResponse.json({ error: 'Update not found' }, { status: 404 });

    await prisma.eventUpdate.delete({ where: { id: params.updateId } });

    await writeAuditLog({
      action: 'LIVE_UPDATE_DELETED',
      entityType: 'EventUpdate',
      entityId: params.updateId,
      actorId: access.session.user.id,
      metadata: { eventId: params.id, type: existing.updateType },
      ...getRequestMetadata(request),
    });

    return NextResponse.json({ message: 'Update deleted.' });
  } catch (error) {
    log.error({ error, eventId: params.id, updateId: params.updateId }, 'Failed to delete live update');
    return NextResponse.json({ error: 'Failed to delete live update.' }, { status: 500 });
  }
}
