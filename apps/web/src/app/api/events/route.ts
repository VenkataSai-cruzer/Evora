import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';
import { buildEventWhereClause } from '@/lib/prisma-types';
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';

const log = createLogger('api/events');

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(ip, RATE_LIMITS.events);
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.remaining, rateCheck.resetIn);
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '12', 10)));
    const search = searchParams.get('search') || '';
    const skillLevel = searchParams.get('skillLevel') || '';
    const instrument = searchParams.get('instrument') || '';
    const date = searchParams.get('date') || '';
    const sort = searchParams.get('sort') || 'date';

    const skip = (page - 1) * limit;

    const where = buildEventWhereClause({ search, skillLevel, instrument, date });

    // Order by
    const orderBy: Prisma.EventOrderByWithRelationInput =
      sort === 'title' ? { title: 'asc' } :
      sort === 'created' ? { createdAt: 'desc' } :
      { startDate: 'asc' };

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          coverImageUrl: true,
          startDate: true,
          startTime: true,
          endDate: true,
          endTime: true,
          venueName: true,
          venueAddress: true,
          capacity: true,
          ticketType: true,
          priceAmount: true,
          instruments: true,
          skillLevel: true,
          status: true,
          organizer: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          _count: {
            select: {
              tickets: {
                where: { status: 'CONFIRMED' },
              },
            },
          },
        },
      }),
      prisma.event.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      events,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    log.error({ error }, 'Failed to fetch events');
    return NextResponse.json(
      { error: 'Failed to load events. Please try again.' },
      { status: 500 },
    );
  }
}
