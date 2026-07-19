import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';
import { writeAuditLog, getRequestMetadata } from '@/lib/audit';
import { z } from 'zod';

const log = createLogger('api/dashboard/events/[id]/faqs/[faqId]');

const updateSchema = z.object({
  question: z.string().min(1).max(500).optional(),
  answer: z.string().min(1).max(5000).optional(),
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
  { params }: { params: { id: string; faqId: string } },
) {
  try {
    const access = await checkAccess(params.id);
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }, { status: 422 });
    }

    const existing = await prisma.eventFAQ.findFirst({ where: { id: params.faqId, eventId: params.id } });
    if (!existing) return NextResponse.json({ error: 'FAQ not found' }, { status: 404 });

    const updated = await prisma.eventFAQ.update({ where: { id: params.faqId }, data: parsed.data });

    await writeAuditLog({
      action: 'FAQ_UPDATED',
      entityType: 'EventFAQ',
      entityId: updated.id,
      actorId: access.session.user.id,
      metadata: { eventId: params.id, question: updated.question.slice(0, 100) },
      ...getRequestMetadata(request),
    });

    return NextResponse.json({ faq: updated });
  } catch (error) {
    log.error({ error, eventId: params.id, faqId: params.faqId }, 'Failed to update FAQ');
    return NextResponse.json({ error: 'Failed to update FAQ.' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; faqId: string } },
) {
  try {
    const access = await checkAccess(params.id);
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

    const existing = await prisma.eventFAQ.findFirst({ where: { id: params.faqId, eventId: params.id } });
    if (!existing) return NextResponse.json({ error: 'FAQ not found' }, { status: 404 });

    await prisma.eventFAQ.delete({ where: { id: params.faqId } });

    await writeAuditLog({
      action: 'FAQ_DELETED',
      entityType: 'EventFAQ',
      entityId: params.faqId,
      actorId: access.session.user.id,
      metadata: { eventId: params.id, question: existing.question.slice(0, 100) },
      ...getRequestMetadata(request),
    });

    return NextResponse.json({ message: 'FAQ deleted.' });
  } catch (error) {
    log.error({ error, eventId: params.id, faqId: params.faqId }, 'Failed to delete FAQ');
    return NextResponse.json({ error: 'Failed to delete FAQ.' }, { status: 500 });
  }
}
