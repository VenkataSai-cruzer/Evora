/**
 * Database reset script.
 * Deletes ALL application data while preserving the schema.
 *
 * Tables are deleted in dependency order (children before parents)
 * to avoid foreign-key constraint violations.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx ts-node --esm scripts/reset-db.ts
 * Or with dotenv:
 *   set DATABASE_URL=postgresql://...
 *   npx tsx scripts/reset-db.ts
 *
 * SAFETY: Aborts if NODE_ENV=production (unless ALLOW_PRODUCTION_RESET=true).
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetDatabase() {
  const env = process.env.NODE_ENV;
  const allowProd = process.env.ALLOW_PRODUCTION_RESET === 'true';

  if (env === 'production' && !allowProd) {
    console.error('❌ Refusing to reset a production database.');
    console.error('   Set ALLOW_PRODUCTION_RESET=true to override.');
    process.exit(1);
  }

  console.log('🗑️  Resetting database — deleting all data...\n');

  // ── Delete in dependency order (leaf → root) ──────────────

  // Check-in records
  const checkInAttempts = await prisma.checkInAttempt.deleteMany();
  console.log(`  ✓ CheckInAttempt:         ${checkInAttempts.count} deleted`);

  const checkIns = await prisma.checkIn.deleteMany();
  console.log(`  ✓ CheckIn:                ${checkIns.count} deleted`);

  // Audit logs
  const auditLogs = await prisma.auditLog.deleteMany();
  console.log(`  ✓ AuditLog:               ${auditLogs.count} deleted`);

  // Notification logs
  const notificationLogs = await prisma.notificationLog.deleteMany();
  console.log(`  ✓ NotificationLog:        ${notificationLogs.count} deleted`);

  // Payment webhook idempotency
  const webhookEvents = await prisma.paymentWebhookEvent.deleteMany();
  console.log(`  ✓ PaymentWebhookEvent:    ${webhookEvents.count} deleted`);

  // Tickets (before orders)
  const tickets = await prisma.ticket.deleteMany();
  console.log(`  ✓ Ticket:                 ${tickets.count} deleted`);

  // Payment proof history (before orders)
  const proofHistory = await prisma.paymentProofHistory.deleteMany();
  console.log(`  ✓ PaymentProofHistory:    ${proofHistory.count} deleted`);

  // Payment proof (before orders)
  const paymentProofs = await prisma.paymentProof.deleteMany();
  console.log(`  ✓ PaymentProof:           ${paymentProofs.count} deleted`);

  // Payments (before orders)
  const payments = await prisma.payment.deleteMany();
  console.log(`  ✓ Payment:                ${payments.count} deleted`);

  // Order attendees (before orders)
  const orderAttendees = await prisma.orderAttendee.deleteMany();
  console.log(`  ✓ OrderAttendee:          ${orderAttendees.count} deleted`);

  // Orders
  const orders = await prisma.order.deleteMany();
  console.log(`  ✓ Order:                  ${orders.count} deleted`);

  // Scanner assignments
  const scannerAssignments = await prisma.scannerAssignment.deleteMany();
  console.log(`  ✓ ScannerAssignment:      ${scannerAssignments.count} deleted`);

  // Organizer assignments
  const organizerAssignments = await prisma.organizerAssignment.deleteMany();
  console.log(`  ✓ OrganizerAssignment:    ${organizerAssignments.count} deleted`);

  // Ticket template fields (before ticket templates)
  const templateFields = await prisma.ticketTemplateField.deleteMany();
  console.log(`  ✓ TicketTemplateField:    ${templateFields.count} deleted`);

  // Ticket templates (before events)
  const ticketTemplates = await prisma.ticketTemplate.deleteMany();
  console.log(`  ✓ TicketTemplate:         ${ticketTemplates.count} deleted`);

  // Ticket types (before events)
  const ticketTypes = await prisma.ticketType.deleteMany();
  console.log(`  ✓ TicketType:             ${ticketTypes.count} deleted`);

  // Event content modules
  const eventUpdates = await prisma.eventUpdate.deleteMany();
  console.log(`  ✓ EventUpdate:            ${eventUpdates.count} deleted`);

  const scheduleItems = await prisma.eventScheduleItem.deleteMany();
  console.log(`  ✓ EventScheduleItem:      ${scheduleItems.count} deleted`);

  const performers = await prisma.eventPerformer.deleteMany();
  console.log(`  ✓ EventPerformer:         ${performers.count} deleted`);

  const faqs = await prisma.eventFAQ.deleteMany();
  console.log(`  ✓ EventFAQ:               ${faqs.count} deleted`);

  const partners = await prisma.eventPartner.deleteMany();
  console.log(`  ✓ EventPartner:           ${partners.count} deleted`);

  const branding = await prisma.eventBranding.deleteMany();
  console.log(`  ✓ EventBranding:          ${branding.count} deleted`);

  // Events
  const events = await prisma.event.deleteMany();
  console.log(`  ✓ Event:                  ${events.count} deleted`);

  // Contact messages
  const contactMessages = await prisma.contactMessage.deleteMany();
  console.log(`  ✓ ContactMessage:         ${contactMessages.count} deleted`);

  // Password reset tokens (before users)
  const passwordResets = await prisma.passwordResetToken.deleteMany();
  console.log(`  ✓ PasswordResetToken:     ${passwordResets.count} deleted`);

  // Sessions (before users)
  const sessions = await prisma.session.deleteMany();
  console.log(`  ✓ Session:                ${sessions.count} deleted`);

  // Users — keep any accounts you want to preserve by filtering here
  // Currently deletes ALL users. Add a where clause to keep admins if needed.
  const users = await prisma.user.deleteMany();
  console.log(`  ✓ User:                   ${users.count} deleted`);

  console.log('\n✅ Database reset complete. All data removed.');
  console.log('   Run the seed script to recreate admin accounts if needed.\n');
}

resetDatabase()
  .catch((e) => {
    console.error('❌ Reset failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
