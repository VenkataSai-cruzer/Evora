import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // ── Safety checks ──────────────────────────────────────
  // Refuse to run in production unless explicitly allowed
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
    console.error('❌ Seed refused: NODE_ENV is production. Set ALLOW_PRODUCTION_SEED=true to override.');
    process.exit(1);
  }

  // Refuse to run against the staging DB unless APP_ENV=staging or ALLOW is set
  if (process.env.APP_ENV !== 'staging' && process.env.APP_ENV !== 'development' && !process.env.ALLOW_PRODUCTION_SEED) {
    console.warn('⚠️  APP_ENV is not "staging". This script targets staging data.');
    console.warn('   Set APP_ENV=staging or use --env staging to proceed safely.');
    if (!process.env.ALLOW_PRODUCTION_SEED) process.exit(1);
  }

  console.log('🌱 Seeding staging database...');
  console.log('');

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
  console.log(`  ✓ Admin: ${admin.email}`);

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
  console.log(`  ✓ Attendee: ${attendee.email}`);

  // ── Date helpers ──────────────────────────────────────
  const futureDate = (daysFromNow: number) => new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  const pastDate = (daysAgo: number) => new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

  // ── 1. Published Event (available for booking) ────────
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
  console.log(`  ✓ Published event: ${publishedEvent.title}`);

  // General Pass (Free)
  const genPass = await prisma.ticketType.upsert({
    where: { id: 'seed-staging-ga' },
    update: {},
    create: {
      id: 'seed-staging-ga',
      eventId: publishedEvent.id,
      name: 'General Pass',
      description: 'Standard entry to the jamming session.',
      price: 0,
      currency: 'INR',
      capacity: 80,
      soldCount: 0,
      maxPerOrder: 5,
      active: true,
      saleStartAt: pastDate(1),
      saleEndAt: futureDate(13),
    },
  });

  // Couple Pass (Paid)
  const couplePass = await prisma.ticketType.upsert({
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

  console.log(`    - ${genPass.name}: Free (${genPass.capacity} capacity)`);
  console.log(`    - ${couplePass.name}: ₹${(couplePass.price / 100).toFixed(0)} (${couplePass.capacity} capacity)`);

  // Published event: FAQs
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

  // Published event: Performer
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

  // Published event: Branding
  await prisma.eventBranding.upsert({
    where: { eventId: publishedEvent.id },
    update: {},
    create: {
      eventId: publishedEvent.id,
      contentPartnerHeading: 'Supported by',
    },
  });

  // Published event: Template (placeholder for ticket rendering)
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

  // ── 2. Draft Event (admin only) ───────────────────────
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
      salesStartAt: null,
      salesEndAt: null,
      contactEmail: adminEmail,
      terms: '',
      ticketNumberPrefix: 'EVO-DRAFT-',
      organizerId: admin.id,
    },
  });
  console.log('  ✓ Draft event: Upcoming Secret Show (Draft)');

  // ── 3. Paused-Sales Event ─────────────────────────────
  const pausedEvent = await prisma.event.upsert({
    where: { slug: '7-notes-staging-paused' },
    update: {},
    create: {
      title: '7 NOTES Weekend Special (Sales Paused)',
      slug: '7-notes-staging-paused',
      shortDescription: 'Sales are temporarily paused for this event.',
      description: 'This event is published but sales are paused. The booking flow should show the correct paused state.',
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
      price: 0,
      currency: 'INR',
      capacity: 50,
      soldCount: 0,
      maxPerOrder: 5,
      active: true,
      saleStartAt: pastDate(1),
      saleEndAt: futureDate(29),
    },
  });
  console.log('  ✓ Paused event: 7 NOTES Weekend Special (Sales Paused)');

  // ── 4. Sold-Out Event ────────────────────────────────
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
      price: 0,
      currency: 'INR',
      capacity: 10,
      soldCount: 10,
      maxPerOrder: 1,
      active: true,
      saleStartAt: pastDate(10),
      saleEndAt: futureDate(6),
    },
  });

  // Create actual Ticket records so _count.tickets reflects sold-out state
  for (let i = 0; i < 10; i++) {
    // Create a unique order for each ticket
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
  console.log('  ✓ Sold-out event: 7 NOTES Exclusive (Sold Out) — 10 tickets created');

  console.log('');
  console.log('✅ Staging seed complete!');
  console.log('');
  console.log('📋 Accounts:');
  console.log(`  Admin:     ${adminEmail}`);
  console.log(`  Attendee:  ${attendeeEmail}`);
  console.log('');
  console.log('📅 Events (all under staging slug):');
  console.log('  Published:    /events/7-notes-staging-jam-2026');
  console.log('  Draft:        /events/7-notes-staging-draft       (hidden from public)');
  console.log('  Paused:       /events/7-notes-staging-paused      (sales paused)');
  console.log('  Sold out:     /events/7-notes-staging-soldout     (capacity = 0)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
