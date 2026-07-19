import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';
import { writeAuditLog, getRequestMetadata } from '@/lib/audit';
import { z } from 'zod';

const log = createLogger('api/dashboard/events/[id]/faqs');

const faqSchema = z.object({
  question: z.string().min(1, 'Question is required').max(500),
  answer: z.string().min(1, 'Answer is required').max(5000),
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
    const faqs = await prisma.eventFAQ.findMany({
      where: { eventId: params.id },
      orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json({ faqs });
  } catch (error) {
    log.error({ error, eventId: params.id }, 'Failed to fetch FAQs');
    return NextResponse.json({ error: 'Failed to load FAQs.' }, { status: 500 });
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
    const parsed = faqSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }, { status: 422 });
    }
    const data = parsed.data;
    const maxOrder = await prisma.eventFAQ.aggregate({
      where: { eventId: params.id },
      _max: { sortOrder: true },
    });
    const faq = await prisma.eventFAQ.create({
      data: {
        eventId: params.id,
        authorId: access.session.user.id,
        question: data.question,
        answer: data.answer,
        sortOrder: data.sortOrder ?? (maxOrder._max.sortOrder ?? -1) + 1,
        isPublished: data.isPublished ?? true,
      },
    });
    await writeAuditLog({
      action: 'FAQ_CREATED',
      entityType: 'EventFAQ',
      entityId: faq.id,
      actorId: access.session.user.id,
      metadata: { eventId: params.id, question: faq.question.slice(0, 100) },
      ...getRequestMetadata(request),
    });

    log.info({ eventId: params.id, faqId: faq.id }, 'FAQ created');
    return NextResponse.json({ faq }, { status: 201 });
  } catch (error) {
    log.error({ error, eventId: params.id }, 'Failed to create FAQ');
    return NextResponse.json({ error: 'Failed to create FAQ.' }, { status: 500 });
  }
}
