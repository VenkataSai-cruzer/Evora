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
        shortDescription: true,
        description: true,
        posterObjectKey: true,
        startAt: true,
        endAt: true,
        venueName: true,
        venueAddress: true,
        mapUrl: true,
        totalCapacity: true,
        status: true,
        salesPaused: true,
        bookingClosed: true,
        salesStartAt: true,
        salesEndAt: true,
        contactEmail: true,
        contactPhone: true,
        terms: true,
        organizerId: true,
        organizer: {
          select: {
            id: true,
            name: true,
          },
        },
        ticketTypes: {
          where: { active: true },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            currency: true,
            capacity: true,
            soldCount: true,
            maxPerOrder: true,
          },
        },
        branding: true,
        partners: { orderBy: { displayOrder: 'asc' } },
        faqs: { where: { isPublished: true }, orderBy: { sortOrder: 'asc' } },
        performers: { where: { isPublished: true }, orderBy: { sortOrder: 'asc' } },
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
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.status !== 'PUBLISHED') {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ event });
  } catch (error) {
    log.error({ error, slug: params.slug }, 'Failed to fetch event');
    return NextResponse.json({ error: 'Failed to load event.' }, { status: 500 });
  }
}
