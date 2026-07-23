import bcrypt from 'bcryptjs';
import { prisma } from '../../infrastructure/database/prisma.js';

/**
 * Seed the staging database with test data.
 * Idempotent — safe to call multiple times.
 * Only runs when NODE_ENV is NOT production (additional check — admin routes already require ADMIN role).
 */
export async function seedStagingData() {
  const results: string[] = [];

  // Safety: refuse to run in production
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
    throw new Error('Seed refused: NODE_ENV is production. Set ALLOW_PRODUCTION_SEED=true to override.');
  }

  // ── Accounts ──────────────────────────────────────────
  const adminEmail = process.env.STAGING_ADMIN_EMAIL || 'admin@7notes.in';
  const adminPasswordRaw = process.env.STAGING_ADMIN_PASSWORD || 'admin123';
  const attendeeEmail = process.env.STAGING_ATTENDEE_EMAIL || 'attendee@7notes.in';
  const attendeePasswordRaw = process.env.STAGING_ATTENDEE_PASSWORD || 'attendee123';

  const adminPassword = await bcrypt.hash(adminPasswordRaw, 12);
  const attendeePassword = await bcrypt.hash(attendeePasswordRaw, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { name: '7 NOTES Admin', role: 'ADMIN' },
    create: {
      email: adminEmail,
      name: '7 NOTES Admin',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  });
  results.push(`Admin: ${admin.email}`);

  const attendee = await prisma.user.upsert({
    where: { email: attendeeEmail },
    update: { name: 'Jam Fan', role: 'ATTENDEE' },
    create: {
      email: attendeeEmail,
      name: 'Jam Fan',
      passwordHash: attendeePassword,
      role: 'ATTENDEE',
    },
  });
  results.push(`Attendee: ${attendee.email}`);

  // ── Organizer (Development) ─────────────────────────────
  const organizerEmail = process.env.STAGING_ORGANIZER_EMAIL || 'organizer@7notes.in';
  const organizerPasswordRaw = process.env.STAGING_ORGANIZER_PASSWORD || 'Organizer@2026';
  const organizerPassword = await bcrypt.hash(organizerPasswordRaw, 12);
  const organizer = await prisma.user.upsert({
    where: { email: organizerEmail },
    update: { name: 'Event Organizer', role: 'ORGANIZER' },
    create: {
      email: organizerEmail,
      name: 'Event Organizer',
      passwordHash: organizerPassword,
      role: 'ORGANIZER',
    },
  });
  results.push(`Organizer: ${organizer.email}`);

  // ── Scanner (Development) ───────────────────────────────
  const scannerEmail = process.env.STAGING_SCANNER_EMAIL || 'scanner@7notes.in';
  const scannerPasswordRaw = process.env.STAGING_SCANNER_PASSWORD || 'Scanner@2026';
  const scannerPassword = await bcrypt.hash(scannerPasswordRaw, 12);
  const scanner = await prisma.user.upsert({
    where: { email: scannerEmail },
    update: { name: 'Entry Scanner', role: 'SCANNER' },
    create: {
      email: scannerEmail,
      name: 'Entry Scanner',
      passwordHash: scannerPassword,
      role: 'SCANNER',
    },
  });
  results.push(`Scanner: ${scanner.email}`);

  // ── Date helpers ──────────────────────────────────────
  const futureDate = (daysFromNow: number) => new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  const pastDate = (daysAgo: number) => new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

  // ── 1. Published Event ────────────────────────────────
  const publishedEvent = await prisma.event.upsert({
    where: { slug: '7-notes-staging-jam-2026' },
    update: {},
    create: {
      title: '7 NOTES Staging Jamming Session',
      slug: '7-notes-staging-jam-2026',
      shortDescription: 'A live jamming session for staging acceptance testing.',
      description:
        'This is a staging test event used for end-to-end acceptance testing of the Evora platform. ' +
        'Feel free to register, book tickets, and test the full payment and check-in flow. ' +
        'All data will be periodically reset.',
      status: 'PUBLISHED',
      startAt: futureDate(14),
      endAt: futureDate(14.25),
      venueName: 'The Moonshine Project',
      venueAddress: 'Road No 36, Jubilee Hills, Hyderabad, Telangana 500033',
      mapUrl: 'https://maps.google.com/?q=The+Moonshine+Project+Hyderabad',
      timezone: 'Asia/Kolkata',
      totalCapacity: 100,
      salesStartAt: pastDate(1),
      salesEndAt: futureDate(13),
      contactEmail: adminEmail,
      contactPhone: '+91-9876543210',
      terms: 'Staging test tickets are non-refundable. This is a staging environment for testing purposes only.',
      ticketNumberPrefix: 'EVO-2026-',
      organizerId: admin.id,
    },
  });
  results.push(`Published event: ${publishedEvent.title} (/${publishedEvent.slug})`);

  // General Pass (Paid — ₹299)
  await prisma.ticketType.upsert({
    where: { id: 'seed-staging-ga' },
    update: {},
    create: {
      id: 'seed-staging-ga',
      eventId: publishedEvent.id,
      name: 'General Pass',
      description: 'Standard entry to the jamming session.',
      price: 29900, // ₹299
      currency: 'INR',
      capacity: 80,
      soldCount: 0,
      maxPerOrder: 5,
      active: true,
      saleStartAt: pastDate(1),
      saleEndAt: futureDate(13),
    },
  });

  // Couple Pass
  await prisma.ticketType.upsert({
    where: { id: 'seed-staging-couple' },
    update: {},
    create: {
      id: 'seed-staging-couple',
      eventId: publishedEvent.id,
      name: 'Couple Pass',
      description: 'Entry for two — perfect for a date night.',
      price: 49900, // ₹499
      currency: 'INR',
      capacity: 20,
      soldCount: 0,
      maxPerOrder: 2,
      active: true,
      saleStartAt: pastDate(1),
      saleEndAt: futureDate(13),
    },
  });
  results.push(`  Ticket types: General Pass (₹299), Couple Pass (₹499)`);

  // FAQs
  await prisma.eventFAQ.upsert({
    where: { id: 'seed-staging-faq-1' },
    update: {},
    create: {
      id: 'seed-staging-faq-1',
      eventId: publishedEvent.id,
      authorId: admin.id,
      question: 'What time should I arrive?',
      answer: 'Doors open 30 minutes before the start time. We recommend arriving early for the best seats.',
      sortOrder: 0,
      isPublished: true,
    },
  });
  await prisma.eventFAQ.upsert({
    where: { id: 'seed-staging-faq-2' },
    update: {},
    create: {
      id: 'seed-staging-faq-2',
      eventId: publishedEvent.id,
      authorId: admin.id,
      question: 'Is parking available?',
      answer: 'Yes, ample parking is available at the venue.',
      sortOrder: 1,
      isPublished: true,
    },
  });

  // Performer
  await prisma.eventPerformer.upsert({
    where: { id: 'seed-staging-performer-1' },
    update: {},
    create: {
      id: 'seed-staging-performer-1',
      eventId: publishedEvent.id,
      name: '7 NOTES Band',
      bio: 'Hyderabad-based band playing original rock and blues.',
      instrument: 'Full Band',
      role: 'PERFORMER',
      sortOrder: 0,
      isPublished: true,
    },
  });

  // Branding
  await prisma.eventBranding.upsert({
    where: { eventId: publishedEvent.id },
    update: {},
    create: {
      eventId: publishedEvent.id,
      contentPartnerHeading: 'Supported by',
    },
  });

  // Template
  await prisma.ticketTemplate.upsert({
    where: { id: 'seed-staging-template-1' },
    update: {},
    create: {
      id: 'seed-staging-template-1',
      eventId: publishedEvent.id,
      version: 1,
      sourceObjectKey: 'events/staging-template/v1/template.png',
      width: 1200,
      height: 600,
      outputFormat: 'PNG',
      active: true,
    },
  });

  // ── 2. Draft Event ────────────────────────────────────
  await prisma.event.upsert({
    where: { slug: '7-notes-staging-draft' },
    update: {},
    create: {
      title: 'Upcoming Secret Show (Draft)',
      slug: '7-notes-staging-draft',
      shortDescription: 'A secret show still in planning — visible only to admin.',
      description: 'This event is in draft mode and should not appear on the public events list.',
      status: 'DRAFT',
      startAt: futureDate(45),
      endAt: futureDate(45.25),
      venueName: 'TBD',
      venueAddress: '',
      timezone: 'Asia/Kolkata',
      totalCapacity: 50,
      contactEmail: adminEmail,
      ticketNumberPrefix: 'EVO-DRAFT-',
      organizerId: admin.id,
    },
  });
  results.push(`Draft event: Upcoming Secret Show (Draft)`);

  // ── 3. Paused-Sales Event ─────────────────────────────
  const pausedEvent = await prisma.event.upsert({
    where: { slug: '7-notes-staging-paused' },
    update: {},
    create: {
      title: '7 NOTES Weekend Special (Sales Paused)',
      slug: '7-notes-staging-paused',
      shortDescription: 'Sales are temporarily paused for this event.',
      description: 'This event is published but sales are paused.',
      status: 'PUBLISHED',
      startAt: futureDate(30),
      endAt: futureDate(30.25),
      venueName: 'The Moonshine Project',
      venueAddress: 'Jubilee Hills, Hyderabad',
      timezone: 'Asia/Kolkata',
      totalCapacity: 50,
      salesPaused: true,
      salesStartAt: pastDate(1),
      salesEndAt: futureDate(29),
      contactEmail: adminEmail,
      bookingClosed: false,
      terms: 'Test event — sales paused for staging.',
      ticketNumberPrefix: 'EVO-PAUSED-',
      organizerId: admin.id,
    },
  });

  await prisma.ticketType.upsert({
    where: { id: 'seed-staging-paused-ga' },
    update: {},
    create: {
      id: 'seed-staging-paused-ga',
      eventId: pausedEvent.id,
      name: 'General Pass',
      description: 'Standard entry.',
      price: 29900, // ₹299
      currency: 'INR',
      capacity: 50,
      soldCount: 0,
      maxPerOrder: 5,
      active: true,
      saleStartAt: pastDate(1),
      saleEndAt: futureDate(29),
    },
  });
  results.push(`Paused event: 7 NOTES Weekend Special (Sales Paused)`);

  // ── 4. Sold-Out Event ─────────────────────────────────
  const soldOutEvent = await prisma.event.upsert({
    where: { slug: '7-notes-staging-soldout' },
    update: {},
    create: {
      title: '7 NOTES Exclusive (Sold Out)',
      slug: '7-notes-staging-soldout',
      shortDescription: 'This event is completely sold out — no tickets available.',
      description: 'A sold-out event used to test overselling prevention and sold-out UI states.',
      status: 'PUBLISHED',
      startAt: futureDate(7),
      endAt: futureDate(7.25),
      venueName: 'Secret Location',
      venueAddress: 'Hyderabad',
      timezone: 'Asia/Kolkata',
      totalCapacity: 10,
      salesStartAt: pastDate(10),
      salesEndAt: futureDate(6),
      contactEmail: adminEmail,
      terms: 'Sold-out test event.',
      ticketNumberPrefix: 'EVO-SOLD-',
      organizerId: admin.id,
    },
  });

  const soldOutType = await prisma.ticketType.upsert({
    where: { id: 'seed-staging-soldout-ga' },
    update: {},
    create: {
      id: 'seed-staging-soldout-ga',
      eventId: soldOutEvent.id,
      name: 'General Pass',
      description: 'Sold out.',
      price: 29900,
      currency: 'INR',
      capacity: 10,
      soldCount: 10,
      maxPerOrder: 1,
      active: true,
      saleStartAt: pastDate(10),
      saleEndAt: futureDate(6),
    },
  });

  // Create Ticket records to reflect sold-out state via _count.tickets
  for (let i = 0; i < 10; i++) {
    const order = await prisma.order.upsert({
      where: { orderNumber: `SEED-SOLDOUT-${i}` },
      update: {},
      create: {
        orderNumber: `SEED-SOLDOUT-${i}`,
        eventId: soldOutEvent.id,
        userId: admin.id,
        status: 'CONFIRMED',
        subtotal: 0,
        fees: 0,
        total: 0,
        currency: 'INR',
        paymentProvider: 'test',
        paidAt: pastDate(5),
      },
    });

    const attendeeRecord = await prisma.orderAttendee.upsert({
      where: { id: `seed-soldout-attendee-${i}` },
      update: {},
      create: {
        id: `seed-soldout-attendee-${i}`,
        orderId: order.id,
        ticketTypeId: soldOutType.id,
        attendeeName: `Test Attendee ${i + 1}`,
        attendeeEmail: `attendee${i}@test.in`,
      },
    });

    await prisma.ticket.upsert({
      where: { ticketNumber: `EVO-SOLD-${i}` },
      update: {},
      create: {
        ticketNumber: `EVO-SOLD-${i}`,
        eventId: soldOutEvent.id,
        userId: admin.id,
        orderId: order.id,
        orderAttendeeId: attendeeRecord.id,
        ticketTypeId: soldOutType.id,
        status: 'CONFIRMED',
        templateVersion: 1,
      },
    });
  }
  results.push(`Sold-out event: 7 NOTES Exclusive — 10 tickets created`);

  return results;
}
