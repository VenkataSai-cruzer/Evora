import bcrypt from 'bcryptjs';
import { prisma } from '../../infrastructure/database/prisma.js';

/**
 * Production seed — creates only the accounts and the ONE real production event.
 * Safe to call multiple times (uses upsert).
 *
 * This replaces the old staging/demo seed. No demo data is created.
 */
export async function seedStagingData() {
  const results: string[] = [];

  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
    throw new Error('Seed refused: NODE_ENV is production. Set ALLOW_PRODUCTION_SEED=true to override.');
  }

  // ── Accounts ──────────────────────────────────────────
  const adminEmail = process.env.STAGING_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'admin@7notes.in';
  const adminPassword = await bcrypt.hash(process.env.STAGING_ADMIN_PASSWORD || 'Admin@7notes2026', 12);

  const organizerEmail = process.env.STAGING_ORGANIZER_EMAIL || process.env.ORGANIZER_EMAIL || 'organizer@7notes.in';
  const organizerPassword = await bcrypt.hash(process.env.STAGING_ORGANIZER_PASSWORD || 'Organizer@2026', 12);

  const scannerEmail = process.env.STAGING_SCANNER_EMAIL || process.env.SCANNER_EMAIL || 'scanner@7notes.in';
  const scannerPassword = await bcrypt.hash(process.env.STAGING_SCANNER_PASSWORD || 'Scanner@2026', 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { name: '7 NOTES Admin', role: 'ADMIN' },
    create: { email: adminEmail, name: '7 NOTES Admin', passwordHash: adminPassword, role: 'ADMIN' },
  });
  results.push(`Admin: ${admin.email}`);

  const organizer = await prisma.user.upsert({
    where: { email: organizerEmail },
    update: { name: '7 NOTES Organizer', role: 'ORGANIZER' },
    create: { email: organizerEmail, name: '7 NOTES Organizer', passwordHash: organizerPassword, role: 'ORGANIZER' },
  });
  results.push(`Organizer: ${organizer.email}`);

  const scanner = await prisma.user.upsert({
    where: { email: scannerEmail },
    update: { name: 'Entry Scanner', role: 'SCANNER' },
    create: { email: scannerEmail, name: 'Entry Scanner', passwordHash: scannerPassword, role: 'SCANNER' },
  });
  results.push(`Scanner: ${scanner.email}`);

  // ── Production Event ────────────────────────────────────
  // 8 August 2026, 5:30 PM IST = 12:00 UTC
  const eventStart = new Date('2026-08-08T12:00:00.000Z');
  const eventEnd   = new Date('2026-08-08T15:30:00.000Z');

  const productionEvent = await prisma.event.upsert({
    where: { slug: '7-notes-live-jamming-session-2026' },
    update: {},
    create: {
      title: '7 NOTES – Live Jamming Session',
      slug: '7-notes-live-jamming-session-2026',
      shortDescription: 'Telugu Trending Hits · 90\'s Evergreen Classics · Live Band Acoustic Vibes',
      description:
        'Join us for an unforgettable evening of live music at CAFOZE!\n\n' +
        '🎵 Telugu Trending Hits\n🎶 90\'s Evergreen Classics\n🎸 Live Band Acoustic Vibes\n' +
        '☕ Open-Air Café\n📸 Instagram-worthy Experience\n\n' +
        'Venue: CAFOZE, Plot No. 7, Engineers Enclave, Y Junction, VT Agraharam, Vizianagaram\n\n' +
        'Doors open at 5:00 PM. Show starts at 5:30 PM.',
      status: 'PUBLISHED',
      startAt: eventStart,
      endAt: eventEnd,
      venueName: 'CAFOZE',
      venueAddress: 'Plot No. 7, Engineers Enclave, Y Junction, VT Agraharam, Vizianagaram',
      timezone: 'Asia/Kolkata',
      totalCapacity: 150,
      salesPaused: false,
      bookingClosed: false,
      contactEmail: adminEmail,
      terms: 'All tickets are non-refundable. Entry subject to capacity. Valid ID required at the gate.',
      ticketNumberPrefix: '7N-2026-VZM-',
      organizerId: admin.id,
    },
  });
  results.push(`Event: ${productionEvent.title}`);

  // General Pass — single ticket type
  await prisma.ticketType.upsert({
    where: { id: 'prod-7notes-2026-general' },
    update: {},
    create: {
      id: 'prod-7notes-2026-general',
      eventId: productionEvent.id,
      name: 'General Pass',
      description: 'Standard entry to 7 NOTES Live Jamming Session.',
      price: 20000, // ₹200 in paise
      currency: 'INR',
      capacity: 150,
      soldCount: 0,
      maxPerOrder: 5,
      active: true,
    },
  });
  results.push(`Ticket type: General Pass ₹200 (capacity 150)`);

  // Branding
  await prisma.eventBranding.upsert({
    where: { eventId: productionEvent.id },
    update: {},
    create: { eventId: productionEvent.id, contentPartnerHeading: 'Experience' },
  });

  // Organizer assignment
  await prisma.organizerAssignment.upsert({
    where: { organizerId_eventId: { organizerId: organizer.id, eventId: productionEvent.id } },
    update: {},
    create: {
      organizerId: organizer.id,
      eventId: productionEvent.id,
      permissions: JSON.stringify({ canApprovePayments: true, canExport: true, canSendAnnouncements: true }),
      assignedById: admin.id,
    },
  });
  results.push(`Organizer assigned to event`);

  // Scanner assignment
  await prisma.scannerAssignment.upsert({
    where: { scannerId_eventId: { scannerId: scanner.id, eventId: productionEvent.id } },
    update: {},
    create: {
      scannerId: scanner.id,
      eventId: productionEvent.id,
      gateName: 'Main Gate',
      isActive: true,
      assignedById: admin.id,
    },
  });
  results.push(`Scanner assigned to Main Gate`);

  return results;
}
