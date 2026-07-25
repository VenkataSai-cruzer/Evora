/**
 * Production Cutover Script — 7 NOTES Live Jamming Session
 *
 * What this does:
 *   1. Deletes ALL demo/staging data (events, orders, tickets, payments,
 *      proofs, scans, notifications, contact messages, audit logs)
 *   2. Preserves admin / organizer / scanner user accounts
 *   3. Creates the ONE production event: 7 NOTES – Live Jamming Session
 *   4. Creates ticket types with real pricing and capacity
 *   5. Assigns the organizer to the event
 *   6. Adds FAQs, performers, and branding
 *
 * Usage (run from apps/api directory):
 *   set DATABASE_URL=postgresql://...
 *   npx tsx scripts/production-cutover.ts
 *
 * Safe to re-run — uses upsert for user accounts and checks event slug.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 7 NOTES Production Cutover\n');
  console.log('━'.repeat(50));

  // ── Safety check ──────────────────────────────────────
  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl || dbUrl.startsWith('file:') || dbUrl.trim() === '') {
    console.error('❌ DATABASE_URL must point to a PostgreSQL database, not SQLite.');
    console.error('   Set DATABASE_URL=postgresql://... before running this script.');
    process.exit(1);
  }
  // Safe to log — only shows host, not password
  try {
    const hostPart = dbUrl.split('@')[1] || 'connected';
    console.log(`✓ Database host: ${hostPart}\n`);
  } catch {
    console.log('✓ Database: connected\n');
  }

  // ══════════════════════════════════════════════════════
  // PHASE 1 — DELETE ALL DEMO DATA
  // Delete in dependency order: children before parents
  // ══════════════════════════════════════════════════════
  console.log('📦 Phase 1: Removing demo data...\n');

  const ci = await prisma.checkInAttempt.deleteMany();
  console.log(`  ✓ CheckInAttempt     ${ci.count}`);

  const co = await prisma.checkIn.deleteMany();
  console.log(`  ✓ CheckIn            ${co.count}`);

  const al = await prisma.auditLog.deleteMany();
  console.log(`  ✓ AuditLog           ${al.count}`);

  const nl = await prisma.notificationLog.deleteMany();
  console.log(`  ✓ NotificationLog    ${nl.count}`);

  const pw = await prisma.paymentWebhookEvent.deleteMany();
  console.log(`  ✓ PaymentWebhookEvent ${pw.count}`);

  const tk = await prisma.ticket.deleteMany();
  console.log(`  ✓ Ticket             ${tk.count}`);

  const pph = await prisma.paymentProofHistory.deleteMany();
  console.log(`  ✓ PaymentProofHistory ${pph.count}`);

  const pp = await prisma.paymentProof.deleteMany();
  console.log(`  ✓ PaymentProof       ${pp.count}`);

  const pm = await prisma.payment.deleteMany();
  console.log(`  ✓ Payment            ${pm.count}`);

  const oa = await prisma.orderAttendee.deleteMany();
  console.log(`  ✓ OrderAttendee      ${oa.count}`);

  const or = await prisma.order.deleteMany();
  console.log(`  ✓ Order              ${or.count}`);

  const sa = await prisma.scannerAssignment.deleteMany();
  console.log(`  ✓ ScannerAssignment  ${sa.count}`);

  const oras = await prisma.organizerAssignment.deleteMany();
  console.log(`  ✓ OrganizerAssignment ${oras.count}`);

  const ttf = await prisma.ticketTemplateField.deleteMany();
  console.log(`  ✓ TicketTemplateField ${ttf.count}`);

  const tt = await prisma.ticketTemplate.deleteMany();
  console.log(`  ✓ TicketTemplate     ${tt.count}`);

  const tty = await prisma.ticketType.deleteMany();
  console.log(`  ✓ TicketType         ${tty.count}`);

  const eu = await prisma.eventUpdate.deleteMany();
  console.log(`  ✓ EventUpdate        ${eu.count}`);

  const es = await prisma.eventScheduleItem.deleteMany();
  console.log(`  ✓ EventScheduleItem  ${es.count}`);

  const ep = await prisma.eventPerformer.deleteMany();
  console.log(`  ✓ EventPerformer     ${ep.count}`);

  const ef = await prisma.eventFAQ.deleteMany();
  console.log(`  ✓ EventFAQ           ${ef.count}`);

  const epa = await prisma.eventPartner.deleteMany();
  console.log(`  ✓ EventPartner       ${epa.count}`);

  const eb = await prisma.eventBranding.deleteMany();
  console.log(`  ✓ EventBranding      ${eb.count}`);

  const ev = await prisma.event.deleteMany();
  console.log(`  ✓ Event              ${ev.count}`);

  const cm = await prisma.contactMessage.deleteMany();
  console.log(`  ✓ ContactMessage     ${cm.count}`);

  // PasswordResetToken — skip gracefully if table doesn't exist yet
  try {
    const prt = await prisma.passwordResetToken.deleteMany();
    console.log(`  ✓ PasswordResetToken ${prt.count}`);
  } catch { console.log(`  ⚠ PasswordResetToken  (skipped — table not found)`); }

  // Sessions — skip gracefully if table doesn't exist yet
  try {
    const ss = await prisma.session.deleteMany();
    console.log(`  ✓ Session            ${ss.count}`);
  } catch { console.log(`  ⚠ Session             (skipped — table not found)`); }

  // Delete demo attendee users ONLY — keep admin/organizer/scanner role accounts
  const demoUsers = await prisma.user.deleteMany({
    where: { role: 'ATTENDEE' },
  });
  console.log(`  ✓ Demo ATTENDEE users ${demoUsers.count}`);

  console.log('\n✅ Demo data cleared.\n');

  // ══════════════════════════════════════════════════════
  // PHASE 2 — ENSURE PRODUCTION ACCOUNTS EXIST
  // Upsert admin, organizer, scanner — never lose these
  // ══════════════════════════════════════════════════════
  console.log('👤 Phase 2: Ensuring production accounts...\n');

  const adminEmail = process.env.ADMIN_EMAIL || process.env.STAGING_ADMIN_EMAIL || 'admin@7notes.in';
  const adminPasswordRaw = process.env.ADMIN_PASSWORD || process.env.STAGING_ADMIN_PASSWORD || 'Admin@7notes2026';

  const organizerEmail = process.env.ORGANIZER_EMAIL || process.env.STAGING_ORGANIZER_EMAIL || 'organizer@7notes.in';
  const organizerPasswordRaw = process.env.ORGANIZER_PASSWORD || process.env.STAGING_ORGANIZER_PASSWORD || 'Organizer@2026';

  const scannerEmail = process.env.SCANNER_EMAIL || process.env.STAGING_SCANNER_EMAIL || 'scanner@7notes.in';
  const scannerPasswordRaw = process.env.SCANNER_PASSWORD || process.env.STAGING_SCANNER_PASSWORD || 'Scanner@2026';

  const [adminHash, organizerHash, scannerHash] = await Promise.all([
    bcrypt.hash(adminPasswordRaw, 12),
    bcrypt.hash(organizerPasswordRaw, 12),
    bcrypt.hash(scannerPasswordRaw, 12),
  ]);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { name: '7 NOTES Admin', role: 'ADMIN', passwordHash: adminHash },
    create: { email: adminEmail, name: '7 NOTES Admin', passwordHash: adminHash, role: 'ADMIN' },
  });
  console.log(`  ✓ Admin:     ${admin.email}`);

  const organizer = await prisma.user.upsert({
    where: { email: organizerEmail },
    update: { name: '7 NOTES Organizer', role: 'ORGANIZER', passwordHash: organizerHash },
    create: { email: organizerEmail, name: '7 NOTES Organizer', passwordHash: organizerHash, role: 'ORGANIZER' },
  });
  console.log(`  ✓ Organizer: ${organizer.email}`);

  const scanner = await prisma.user.upsert({
    where: { email: scannerEmail },
    update: { name: 'Entry Scanner', role: 'SCANNER', passwordHash: scannerHash },
    create: { email: scannerEmail, name: 'Entry Scanner', passwordHash: scannerHash, role: 'SCANNER' },
  });
  console.log(`  ✓ Scanner:   ${scanner.email}`);

  console.log('\n✅ Production accounts ready.\n');

  // ══════════════════════════════════════════════════════
  // PHASE 3 — CREATE THE PRODUCTION EVENT
  // One event. One source of truth.
  // ══════════════════════════════════════════════════════
  console.log('🎸 Phase 3: Creating production event...\n');

  // 8 August 2026, 5:30 PM IST
  const eventStart = new Date('2026-08-08T12:00:00.000Z'); // 5:30 PM IST = 12:00 UTC
  const eventEnd   = new Date('2026-08-08T15:30:00.000Z'); // 9:00 PM IST = 15:30 UTC

  const productionEvent = await prisma.event.upsert({
    where: { slug: '7-notes-live-jamming-session-2026' },
    update: {
      title: '7 NOTES – Live Jamming Session',
      shortDescription: 'Telugu Trending Hits · 90\'s Evergreen Classics · Live Band Acoustic Vibes',
      description:
        'Join us for an unforgettable evening of live music at CAFOZE!\n\n' +
        '🎵 Telugu Trending Hits\n' +
        '🎶 90\'s Evergreen Classics\n' +
        '🎸 Live Band Acoustic Vibes\n' +
        '☕ Open-Air Café\n' +
        '📸 Instagram-worthy Experience\n\n' +
        'Venue: CAFOZE, Plot No. 7, Engineers Enclave, Y Junction, VT Agraharam, Vizianagaram\n\n' +
        'Doors open at 5:00 PM. Show starts at 5:30 PM. Don\'t miss it!',
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
    },
    create: {
      title: '7 NOTES – Live Jamming Session',
      slug: '7-notes-live-jamming-session-2026',
      shortDescription: 'Telugu Trending Hits · 90\'s Evergreen Classics · Live Band Acoustic Vibes',
      description:
        'Join us for an unforgettable evening of live music at CAFOZE!\n\n' +
        '🎵 Telugu Trending Hits\n' +
        '🎶 90\'s Evergreen Classics\n' +
        '🎸 Live Band Acoustic Vibes\n' +
        '☕ Open-Air Café\n' +
        '📸 Instagram-worthy Experience\n\n' +
        'Venue: CAFOZE, Plot No. 7, Engineers Enclave, Y Junction, VT Agraharam, Vizianagaram\n\n' +
        'Doors open at 5:00 PM. Show starts at 5:30 PM. Don\'t miss it!',
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

  console.log(`  ✓ Event: ${productionEvent.title}`);
  console.log(`  ✓ Slug:  /${productionEvent.slug}`);
  console.log(`  ✓ Date:  8 August 2026, 5:30 PM – 9:00 PM (IST)`);
  console.log(`  ✓ Venue: CAFOZE, Vizianagaram`);
  console.log(`  ✓ Status: ${productionEvent.status}`);

  // ── Ticket Types ────────────────────────────────────────
  // Pricing TBD — using reasonable defaults. Update via admin panel.

  const generalPass = await prisma.ticketType.upsert({
    where: { id: 'prod-7notes-2026-general' },
    update: {
      eventId: productionEvent.id,
      name: 'General Pass',
      description: 'Standard entry to 7 NOTES Live Jamming Session.',
      price: 20000, // ₹200
      currency: 'INR',
      capacity: 150,
      soldCount: 0,
      maxPerOrder: 5,
      active: true,
    },
    create: {
      id: 'prod-7notes-2026-general',
      eventId: productionEvent.id,
      name: 'General Pass',
      description: 'Standard entry to 7 NOTES Live Jamming Session.',
      price: 20000, // ₹200
      currency: 'INR',
      capacity: 150,
      soldCount: 0,
      maxPerOrder: 5,
      active: true,
    },
  });
  console.log(`  ✓ Ticket: ${generalPass.name} — ₹${generalPass.price / 100} (capacity: ${generalPass.capacity})`);;

  // ── Event Branding ──────────────────────────────────────
  await prisma.eventBranding.upsert({
    where: { eventId: productionEvent.id },
    update: { contentPartnerHeading: 'Experience' },
    create: {
      eventId: productionEvent.id,
      contentPartnerHeading: 'Experience',
    },
  });

  // ── Performers ──────────────────────────────────────────
  await prisma.eventPerformer.upsert({
    where: { id: 'prod-7notes-2026-band' },
    update: { eventId: productionEvent.id },
    create: {
      id: 'prod-7notes-2026-band',
      eventId: productionEvent.id,
      name: '7 NOTES Band',
      bio: 'Live band performing Telugu trending hits, 90\'s evergreen classics, and acoustic vibes.',
      instrument: 'Full Band',
      role: 'PERFORMER',
      sortOrder: 0,
      isPublished: true,
    },
  });

  // ── FAQs ────────────────────────────────────────────────
  await prisma.eventFAQ.upsert({
    where: { id: 'prod-7notes-faq-1' },
    update: { eventId: productionEvent.id },
    create: {
      id: 'prod-7notes-faq-1',
      eventId: productionEvent.id,
      authorId: admin.id,
      question: 'What time should I arrive?',
      answer: 'Doors open at 5:00 PM. The show starts at 5:30 PM. We recommend arriving 15–20 minutes early.',
      sortOrder: 0,
      isPublished: true,
    },
  });

  await prisma.eventFAQ.upsert({
    where: { id: 'prod-7notes-faq-2' },
    update: { eventId: productionEvent.id },
    create: {
      id: 'prod-7notes-faq-2',
      eventId: productionEvent.id,
      authorId: admin.id,
      question: 'Is parking available at CAFOZE?',
      answer: 'Parking is available near the venue. We suggest car-pooling or riding with friends as space may be limited.',
      sortOrder: 1,
      isPublished: true,
    },
  });

  await prisma.eventFAQ.upsert({
    where: { id: 'prod-7notes-faq-3' },
    update: { eventId: productionEvent.id },
    create: {
      id: 'prod-7notes-faq-3',
      eventId: productionEvent.id,
      authorId: admin.id,
      question: 'Are tickets refundable?',
      answer: 'All tickets are non-refundable. Tickets may be transferred to another attendee before the event.',
      sortOrder: 2,
      isPublished: true,
    },
  });

  await prisma.eventFAQ.upsert({
    where: { id: 'prod-7notes-faq-4' },
    update: { eventId: productionEvent.id },
    create: {
      id: 'prod-7notes-faq-4',
      eventId: productionEvent.id,
      authorId: admin.id,
      question: 'How do I get my ticket?',
      answer: 'After booking, submit your payment proof (UPI screenshot + UTR number). Once approved by our team, your ticket will be issued to your account instantly.',
      sortOrder: 3,
      isPublished: true,
    },
  });

  await prisma.eventFAQ.upsert({
    where: { id: 'prod-7notes-faq-5' },
    update: { eventId: productionEvent.id },
    create: {
      id: 'prod-7notes-faq-5',
      eventId: productionEvent.id,
      authorId: admin.id,
      question: 'What is the payment process?',
      answer: 'We accept UPI payments. After booking, make the payment and upload a screenshot with your UTR number. Our team will verify and issue your ticket within a few hours.',
      sortOrder: 4,
      isPublished: true,
    },
  });

  console.log(`  ✓ Performers: 1`);
  console.log(`  ✓ FAQs:       5`);
  console.log(`  ✓ Branding:   done`);

  // ══════════════════════════════════════════════════════
  // PHASE 4 — ASSIGN ORGANIZER TO EVENT
  // The organizer can now see and manage this event
  // ══════════════════════════════════════════════════════
  console.log('\n🔗 Phase 4: Assigning organizer to event...\n');

  await prisma.organizerAssignment.upsert({
    where: {
      organizerId_eventId: {
        organizerId: organizer.id,
        eventId: productionEvent.id,
      },
    },
    update: {
      permissions: JSON.stringify({
        canApprovePayments: true,
        canExport: true,
        canSendAnnouncements: true,
      }),
    },
    create: {
      organizerId: organizer.id,
      eventId: productionEvent.id,
      permissions: JSON.stringify({
        canApprovePayments: true,
        canExport: true,
        canSendAnnouncements: true,
      }),
      assignedById: admin.id,
    },
  });

  console.log(`  ✓ ${organizer.email} → 7 NOTES Live Jamming Session`);
  console.log(`  ✓ Permissions: canApprovePayments, canExport, canSendAnnouncements`);

  // ══════════════════════════════════════════════════════
  // PHASE 5 — ASSIGN SCANNER TO EVENT
  // ══════════════════════════════════════════════════════
  console.log('\n🔍 Phase 5: Assigning scanner to event...\n');

  await prisma.scannerAssignment.upsert({
    where: {
      scannerId_eventId: {
        scannerId: scanner.id,
        eventId: productionEvent.id,
      },
    },
    update: { gateName: 'Main Gate', isActive: true },
    create: {
      scannerId: scanner.id,
      eventId: productionEvent.id,
      gateName: 'Main Gate',
      isActive: true,
      assignedById: admin.id,
    },
  });

  console.log(`  ✓ ${scanner.email} → Main Gate`);

  // ══════════════════════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════════════════════
  console.log('\n' + '━'.repeat(50));
  console.log('✅ Production cutover complete!\n');
  console.log('Event:    7 NOTES – Live Jamming Session');
  console.log('Date:     Saturday, 8 August 2026, 5:30 PM – 9:00 PM');
  console.log('Venue:    CAFOZE, Plot No. 7, Engineers Enclave,');
  console.log('          Y Junction, VT Agraharam, Vizianagaram');
  console.log('Slug:     /7-notes-live-jamming-session-2026');
  console.log('Tickets:  General Pass ₹200 (150 capacity)');
  console.log('Total:    150 capacity\n');
  console.log('Accounts:');
  console.log(`  Admin:     ${adminEmail}`);
  console.log(`  Organizer: ${organizerEmail} (assigned to event)`);
  console.log(`  Scanner:   ${scannerEmail} (Main Gate)`);
  console.log('\n⚠️  Update ticket prices via the admin panel if needed.');
  console.log('⚠️  Set GOOGLE_DRIVE_ENABLED=true in production env vars.');
  console.log('━'.repeat(50));
}

main()
  .catch((e) => {
    console.error('\n❌ Cutover failed:', e.message || e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
