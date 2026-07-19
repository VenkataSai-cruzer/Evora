import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';
import { writeAuditLog, getRequestMetadata } from '@/lib/audit';
import { z } from 'zod';

const log = createLogger('api/dashboard/events/[id]/performers/[performerId]');

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  bio: z.string().max(2000).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  instrument: z.string().max(100).optional().nullable(),
  role: z.string().max(50).optional(),
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
  { params }: { params: { id: string; performerId: string } },
) {
  try {
    const access = await checkAccess(params.id);
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }, { status: 422 });
    }

    const existing = await prisma.eventPerformer.findFirst({ where: { id: params.performerId, eventId: params.id } });
    if (!existing) return NextResponse.json({ error: 'Performer not found' }, { status: 404 });

    const updated = await prisma.eventPerformer.update({ where: { id: params.performerId }, data: parsed.data });

    await writeAuditLog({
      action: 'PERFORMER_UPDATED',
      entityType: 'EventPerformer',
      entityId: updated.id,
      actorId: access.session.user.id,
      metadata: { eventId: params.id, name: updated.name, changedFields: Object.keys(parsed.data) },
      ...getRequestMetadata(request),
    });

    return NextResponse.json({ performer: updated });
  } catch (error) {
    log.error({ error, eventId: params.id, performerId: params.performerId }, 'Failed to update performer');
    return NextResponse.json({ error: 'Failed to update performer.' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; performerId: string } },
) {
  try {
    const access = await checkAccess(params.id);
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

    const existing = await prisma.eventPerformer.findFirst({ where: { id: params.performerId, eventId: params.id } });
    if (!existing) return NextResponse.json({ error: 'Performer not found' }, { status: 404 });

    await prisma.eventPerformer.delete({ where: { id: params.performerId } });

    await writeAuditLog({
      action: 'PERFORMER_DELETED',
      entityType: 'EventPerformer',
      entityId: params.performerId,
      actorId: access.session.user.id,
      metadata: { eventId: params.id, name: existing.name },
      ...getRequestMetadata(request),
    });

    return NextResponse.json({ message: 'Performer deleted.' });
  } catch (error) {
    log.error({ error, eventId: params.id, performerId: params.performerId }, 'Failed to delete performer');
    return NextResponse.json({ error: 'Failed to delete performer.' }, { status: 500 });
  }
}
