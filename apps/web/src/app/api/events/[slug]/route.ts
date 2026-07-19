import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/events/[slug]');

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const event = await prisma.event.findUnique({
      where: { slug: params.slug },
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
        venueLat: true,
        venueLng: true,
        capacity: true,
        ticketType: true,
        priceAmount: true,
        instruments: true,
        skillLevel: true,
        visibility: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        organizerId: true,
        organizer: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            bio: true,
          },
        },
        _count: {
          select: {
            tickets: {
              where: { status: { in: ['CONFIRMED', 'CHECKED_IN'] } },
            },
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 },
      );
    }

    // Only return public/active events to non-authenticated users
    if (!['PUBLISHED', 'SALES_OPEN'].includes(event.status) || event.visibility !== 'PUBLIC') {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ event });
  } catch (error) {
    log.error({ error, slug: params.slug }, 'Failed to fetch event');
    return NextResponse.json(
      { error: 'Failed to load event. Please try again.' },
      { status: 500 },
    );
  }
}
