import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Production safety: Never run seeds in production
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
    console.error('❌ Seed script refused: NODE_ENV is production. Set ALLOW_PRODUCTION_SEED=true to override.');
    process.exit(1);
  }

  console.log('🌱 Seeding database for 7 NOTES platform...');
  console.log('');

  // ── Admin User ──────────────────────────────────────────
  const adminEmail = process.env.STAGING_ADMIN_EMAIL || 'admin@7notes.in';
  const adminPasswordRaw = process.env.STAGING_ADMIN_PASSWORD || 'admin123';
  const adminPassword = await bcrypt.hash(adminPasswordRaw, 12);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: '7 NOTES Admin',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  });
  console.log(`  ✓ Admin: ${admin.email} / ${adminPasswordRaw}`);

  // ── Demo Attendee ───────────────────────────────────────
  const attendeeEmail = process.env.STAGING_ATTENDEE_EMAIL || 'attendee@7notes.in';
  const attendeePasswordRaw = process.env.STAGING_ATTENDEE_PASSWORD || 'attendee123';
  const attendeePassword = await bcrypt.hash(attendeePasswordRaw, 12);
  const attendee = await prisma.user.upsert({
    where: { email: attendeeEmail },
    update: {},
    create: {
      email: attendeeEmail,
      name: 'Jam Fan',
      passwordHash: attendeePassword,
      role: 'ATTENDEE',
    },
  });
  console.log(`  ✓ Attendee: ${attendee.email} / ${attendeePasswordRaw}`);

  // ── Draft Event (for testing admin setup) ───────────────
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const twoMonthsLater = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

  const draftEvent = await prisma.event.upsert({
    where: { slug: '7-notes-hyd-2026-draft' },
    update: {},
    create: {
      title: '7 NOTES Hyderabad (Draft)',
      slug: '7-notes-hyd-2026-draft',
      shortDescription: 'A night of live music — draft setup for testing.',
      description: 'This is a draft event for testing the admin event setup wizard.',
      status: 'DRAFT',
      startAt: nextWeek,
      endAt: new Date(nextWeek.getTime() + 4 * 60 * 60 * 1000),
      venueName: 'The Moonshine Project',
      venueAddress: 'Road No 36, Jubilee Hills, Hyderabad',
      timezone: 'Asia/Kolkata',
      totalCapacity: 100,
      contactEmail: 'admin@7notes.in',
      terms: 'Tickets are non-refundable and non-transferable.',
      ticketNumberPrefix: '7N-2026-HYD-',
      organizerId: admin.id,
      // Draft — no ticket types, no template, no branding yet
    },
  });
  console.log(`  ✓ Draft event: ${draftEvent.title}`);

  // ── Published Event (for testing bookings) ──────────────
  const publishedEvent = await prisma.event.upsert({
    where: { slug: '7-notes-hyd-2026' },
    update: {},
    create: {
      title: '7 NOTES Live @ Moonshine',
      slug: '7-notes-hyd-2026',
      shortDescription: 'An evening of originals and covers by 7 NOTES.',
      description: 'Join us for a memorable night of live music at The Moonshine Project. Featuring original compositions and classic covers.',
      posterObjectKey: 'events/sample/poster/sample.jpg',
      status: 'PUBLISHED',
      startAt: twoMonthsLater,
      endAt: new Date(twoMonthsLater.getTime() + 4 * 60 * 60 * 1000),
      venueName: 'The Moonshine Project',
      venueAddress: 'Road No 36, Jubilee Hills, Hyderabad, Telangana',
      mapUrl: 'https://maps.google.com/?q=The+Moonshine+Project+Hyderabad',
      timezone: 'Asia/Kolkata',
      totalCapacity: 100,
      salesStartAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // started yesterday
      salesEndAt: twoMonthsLater,
      contactEmail: 'admin@7notes.in',
      contactPhone: '+91-9876543210',
      terms: 'Tickets are non-refundable and non-transferable. Entry subject to venue rules.',
      ticketNumberPrefix: '7N-2026-HYD-',
      organizerId: admin.id,
    },
  });

  // Ticket types for published event
  const gaType = await prisma.ticketType.upsert({
    where: { id: 'seed-ga-type' },
    update: {},
    create: {
      id: 'seed-ga-type',
      eventId: publishedEvent.id,
      name: 'General Admission',
      description: 'Standard entry to the event.',
      price: 0, // free
      currency: 'INR',
      capacity: 80,
      soldCount: 0,
      maxPerOrder: 5,
      active: true,
      saleStartAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      saleEndAt: twoMonthsLater,
    },
  });

  await prisma.ticketType.upsert({
    where: { id: 'seed-vip-type' },
    update: {},
    create: {
      id: 'seed-vip-type',
      eventId: publishedEvent.id,
      name: 'VIP Pass',
      description: 'VIP access with reserved seating and merchandise.',
      price: 99900, // ₹999 in paise
      currency: 'INR',
      capacity: 20,
      soldCount: 0,
      maxPerOrder: 2,
      active: true,
      saleStartAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      saleEndAt: twoMonthsLater,
    },
  });

  console.log(`  ✓ Published event: ${publishedEvent.title}`);
  console.log(`    - ${gaType.name}: Free (${gaType.capacity} capacity)`);

  // ── Sample FAQ ──────────────────────────────────────────
  await prisma.eventFAQ.upsert({
    where: { id: 'seed-faq-1' },
    update: {},
    create: {
      id: 'seed-faq-1',
      eventId: publishedEvent.id,
      authorId: admin.id,
      question: 'What time should I arrive?',
      answer: 'Doors open 30 minutes before the start time. We recommend arriving early for the best seats.',
      sortOrder: 0,
      isPublished: true,
    },
  });

  await prisma.eventFAQ.upsert({
    where: { id: 'seed-faq-2' },
    update: {},
    create: {
      id: 'seed-faq-2',
      eventId: publishedEvent.id,
      authorId: admin.id,
      question: 'Is parking available?',
      answer: 'Yes, there is ample parking available at the venue.',
      sortOrder: 1,
      isPublished: true,
    },
  });

  // ── Sample Performer ────────────────────────────────────
  await prisma.eventPerformer.upsert({
    where: { id: 'seed-performer-1' },
    update: {},
    create: {
      id: 'seed-performer-1',
      eventId: publishedEvent.id,
      name: '7 NOTES Band',
      bio: 'Hyderabad-based band playing original rock and blues.',
      instrument: 'Full Band',
      role: 'PERFORMER',
      sortOrder: 0,
      isPublished: true,
    },
  });

  // ── Sample Branding ─────────────────────────────────────
  await prisma.eventBranding.upsert({
    where: { eventId: publishedEvent.id },
    update: {},
    create: {
      eventId: publishedEvent.id,
      contentPartnerHeading: 'Supported by',
    },
  });

  // ── Ticket Template (placeholder) ───────────────────────
  await prisma.ticketTemplate.upsert({
    where: { id: 'seed-template-1' },
    update: {},
    create: {
      id: 'seed-template-1',
      eventId: publishedEvent.id,
      version: 1,
      sourceObjectKey: 'events/sample/template/v1/template.png',
      width: 1200,
      height: 600,
      outputFormat: 'PNG',
      active: true,
    },
  });

  console.log('');
  console.log('✅ Seeding complete!');
  console.log('');
  console.log('📋 Demo accounts:');
  console.log('  Admin:     admin@7notes.in / admin123');
  console.log('  Attendee:  attendee@7notes.in / attendee123');
  console.log('');
  console.log('📅 Events:');
  console.log(`  Draft:      ${draftEvent.slug}`);
  console.log(`  Published:  ${publishedEvent.slug}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
