import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';
import { writeAuditLog, getRequestMetadata } from '@/lib/audit';
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';

const log = createLogger('api/dashboard/events');

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const createEventSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters').max(10000),
  startAt: z.string().min(1, 'Start date is required'),
  venueName: z.string().min(2, 'Venue name is required').max(200),
  venueAddress: z.string().min(2, 'Venue address is required').max(500),
  totalCapacity: z.number().int().min(1, 'Capacity must be at least 1').max(100000),
  status: z.enum(['DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED']).optional().default('DRAFT'),
});

async function checkAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: 'Unauthorized', status: 401 };
  }
  const role = session.user.role;
  if (role !== 'ADMIN') {
    return { error: 'Forbidden', status: 403 };
  }
  return { session };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuth();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { session } = auth;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    const where: Prisma.EventWhereInput = {};

    // Admins see all events
    if (session.user.role === 'ADMIN') {
      // admins see all events
    }

    if (status) {
      where.status = status;
    }

    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          startAt: true,
          venueName: true,
          totalCapacity: true,
          status: true,
          createdAt: true,
          updatedAt: true,
      _count: {
        select: {
          tickets: true,
          orders: true,
        },
      },
          organizerId: true,
        },
      }),
      prisma.event.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      events,
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
    });
  } catch (error) {
    log.error({ error }, 'Failed to fetch organizer events');
    return NextResponse.json({ error: 'Failed to load events.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(ip, RATE_LIMITS.organizer);
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.remaining, rateCheck.resetIn);
    }

    const auth = await checkAuth();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { session } = auth;

    const body = await request.json();
    const parsed = createEventSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return NextResponse.json({ error: 'Validation failed', fieldErrors: errors }, { status: 422 });
    }

    const data = parsed.data;
    let slug = slugify(data.title);

    // Ensure unique slug
    const existing = await prisma.event.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const event = await prisma.event.create({
      data: {
        title: data.title,
        slug,
        description: data.description,
        startAt: new Date(data.startAt),
        venueName: data.venueName,
        venueAddress: data.venueAddress,
        totalCapacity: data.totalCapacity,
        status: data.status || 'DRAFT',
        organizerId: session.user.id,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        createdAt: true,
      },
    });

    // Audit log
    await writeAuditLog({
      action: 'EVENT_CREATED',
      entityType: 'Event',
      entityId: event.id,
      actorId: session.user.id,
      metadata: { title: event.title, status: event.status, slug: event.slug },
      ...getRequestMetadata(request),
    });

    log.info({ eventId: event.id, slug: event.slug }, 'Event created');

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    log.error({ error }, 'Failed to create event');
    return NextResponse.json({ error: 'Failed to create event.' }, { status: 500 });
  }
}
