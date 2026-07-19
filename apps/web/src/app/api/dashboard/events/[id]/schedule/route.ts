import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';
import { writeAuditLog, getRequestMetadata } from '@/lib/audit';
import { z } from 'zod';

const log = createLogger('api/dashboard/events/[id]/schedule');

const scheduleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional().nullable(),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
  isPublished: z.boolean().optional().default(true),
});

async function checkEventAccess(eventId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: 'Unauthorized', status: 401 } as const;
  }
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

    const items = await prisma.eventScheduleItem.findMany({
      where: { eventId: params.id },
      orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json({ items });
  } catch (error) {
    log.error({ error, eventId: params.id }, 'Failed to fetch schedule');
    return NextResponse.json({ error: 'Failed to load schedule.' }, { status: 500 });
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
    const parsed = scheduleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }, { status: 422 });
    }

    const data = parsed.data;
    const maxOrder = await prisma.eventScheduleItem.aggregate({
      where: { eventId: params.id },
      _max: { sortOrder: true },
    });

    const item = await prisma.eventScheduleItem.create({
      data: {
        eventId: params.id,
        authorId: access.session.user.id,
        title: data.title,
        description: data.description || null,
        startTime: data.startTime,
        endTime: data.endTime || null,
        sortOrder: data.sortOrder ?? (maxOrder._max.sortOrder ?? -1) + 1,
        isPublished: data.isPublished ?? true,
      },
    });

    await writeAuditLog({
      action: 'SCHEDULE_ITEM_CREATED',
      entityType: 'EventScheduleItem',
      entityId: item.id,
      actorId: access.session.user.id,
      metadata: { eventId: params.id, title: item.title, startTime: item.startTime },
      ...getRequestMetadata(request),
    });

    log.info({ eventId: params.id, itemId: item.id }, 'Schedule item created');
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    log.error({ error, eventId: params.id }, 'Failed to create schedule item');
    return NextResponse.json({ error: 'Failed to create schedule item.' }, { status: 500 });
  }
}
