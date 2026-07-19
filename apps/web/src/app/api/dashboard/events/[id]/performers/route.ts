import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';
import { writeAuditLog, getRequestMetadata } from '@/lib/audit';
import { z } from 'zod';

const log = createLogger('api/dashboard/events/[id]/performers');

const performerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  bio: z.string().max(2000).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  instrument: z.string().max(100).optional().nullable(),
  role: z.string().max(50).optional().default('PERFORMER'),
  sortOrder: z.number().int().min(0).optional(),
  isPublished: z.boolean().optional().default(true),
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
    const performers = await prisma.eventPerformer.findMany({
      where: { eventId: params.id },
      orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json({ performers });
  } catch (error) {
    log.error({ error, eventId: params.id }, 'Failed to fetch performers');
    return NextResponse.json({ error: 'Failed to load performers.' }, { status: 500 });
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
    const parsed = performerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }, { status: 422 });
    }
    const data = parsed.data;
    const maxOrder = await prisma.eventPerformer.aggregate({
      where: { eventId: params.id },
      _max: { sortOrder: true },
    });
    const performer = await prisma.eventPerformer.create({
      data: {
        eventId: params.id,
        name: data.name,
        bio: data.bio || null,
        imageUrl: data.imageUrl || null,
        instrument: data.instrument || null,
        role: data.role || 'PERFORMER',
        sortOrder: data.sortOrder ?? (maxOrder._max.sortOrder ?? -1) + 1,
        isPublished: data.isPublished ?? true,
      },
    });
    await writeAuditLog({
      action: 'PERFORMER_CREATED',
      entityType: 'EventPerformer',
      entityId: performer.id,
      actorId: access.session.user.id,
      metadata: { eventId: params.id, name: performer.name, role: performer.role },
      ...getRequestMetadata(request),
    });

    log.info({ eventId: params.id, performerId: performer.id }, 'Performer created');
    return NextResponse.json({ performer }, { status: 201 });
  } catch (error) {
    log.error({ error, eventId: params.id }, 'Failed to create performer');
    return NextResponse.json({ error: 'Failed to create performer.' }, { status: 500 });
  }
}
