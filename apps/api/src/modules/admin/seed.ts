/**
 * Seed script — PRODUCTION SAFE
 *
 * ⚠️  DO NOT add data-deletion or event-creation logic here.
 * The production event already exists in the database.
 * This script only ensures admin/organizer/scanner accounts exist.
 *
 * Safe to call multiple times (uses upsert, never deletes).
 */
import bcrypt from 'bcryptjs';
import { prisma } from '../../infrastructure/database/prisma.js';

export async function seedStagingData() {
  const results: string[] = [];

  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
    throw new Error('Seed refused: NODE_ENV is production. Set ALLOW_PRODUCTION_SEED=true to override.');
  }

  const adminEmail = process.env.ADMIN_EMAIL || process.env.STAGING_ADMIN_EMAIL || 'admin@7notes.in';
  const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || process.env.STAGING_ADMIN_PASSWORD || 'Admin@7notes2026', 12);

  const organizerEmail = process.env.ORGANIZER_EMAIL || process.env.STAGING_ORGANIZER_EMAIL || 'organizer@7notes.in';
  const organizerPassword = await bcrypt.hash(process.env.ORGANIZER_PASSWORD || process.env.STAGING_ORGANIZER_PASSWORD || 'Organizer@2026', 12);

  const scannerEmail = process.env.SCANNER_EMAIL || process.env.STAGING_SCANNER_EMAIL || 'scanner@7notes.in';
  const scannerPassword = await bcrypt.hash(process.env.SCANNER_PASSWORD || process.env.STAGING_SCANNER_PASSWORD || 'Scanner@2026', 12);

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

  // NOTE: Event and ticket types already exist in production DB.
  // DO NOT create or delete events here.

  return results;
}
