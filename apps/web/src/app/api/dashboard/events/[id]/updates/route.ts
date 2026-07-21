import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';
import { writeAuditLog, getRequestMetadata } from '@/lib/audit';
import { z } from 'zod';

const log = createLogger('api/dashboard/events/[id]/updates');

const updateSchema = z.object({
  message: z.string().min(1, 'Message is required').max(2000),
  updateType: z.enum([
    'EVENT_STARTED', 'ENTRY_OPENED', 'VENUE_CHANGE', 'TIMING_CHANGE',
    'PERFORMANCE_NOW', 'BREAK', 'INSTRUCTION', 'EVENT_COMPLETED',
    'EMERGENCY', 'CANCELLATION',
  ]).optional().default('INSTRUCTION'),
  visibility: z.enum(['PUBLIC', 'ATTENDEES_ONLY']).optional().default('PUBLIC'),
  isPinned: z.boolean().optional().default(false),
});

async function checkEventAccess(eventId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: 'Unauthorized', status: 401 } as const;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, organizerId: true },
  });
  if (!event) return { error: 'Event not found', status: 404 } as const;
  const isOwner = event.organizerId === session.user.id;
  if (!isOwner && session.user.role !== 'ADMIN') return { error: 'Forbidden', status: 403 } as const;
  return { session, event };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const access = await checkEventAccess(params.id);
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });
    const updates = await prisma.eventUpdate.findMany({
      where: { eventId: params.id },
      orderBy: { publishedAt: 'desc' },
      take: 50,
      include: { author: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ updates });
  } catch (error) {
    log.error({ error, eventId: params.id }, 'Failed to fetch updates');
    return NextResponse.json({ error: 'Failed to load updates.' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const access = await checkEventAccess(params.id);
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }, { status: 422 });
    }
    const data = parsed.data;
    const update = await prisma.eventUpdate.create({
      data: {
        eventId: params.id,
        authorId: access.session.user.id,
        message: data.message,
        updateType: data.updateType || 'INSTRUCTION',
        visibility: data.visibility || 'PUBLIC',
        isPinned: data.isPinned ?? false,
      },
    });
    await writeAuditLog({
      action: 'LIVE_UPDATE_CREATED',
      entityType: 'EventUpdate',
      entityId: update.id,
      actorId: access.session.user.id,
      metadata: { eventId: params.id, type: update.updateType, message: update.message.slice(0, 200) },
      ...getRequestMetadata(request),
    });

    log.info({ eventId: params.id, updateId: update.id, type: update.updateType }, 'Live update published');
    return NextResponse.json({ update }, { status: 201 });
  } catch (error) {
    log.error({ error, eventId: params.id }, 'Failed to publish update');
    return NextResponse.json({ error: 'Failed to publish update.' }, { status: 500 });
  }
}
