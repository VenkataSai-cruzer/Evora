/**
 * Vitest test setup — mocks Prisma client so tests run without a real DB.
 */
import { vi } from 'vitest';

// Mock prisma module before any imports
vi.mock('../infrastructure/database/prisma.js', () => {
  const mockPrisma = {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    order: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    orderAttendee: { groupBy: vi.fn(), findMany: vi.fn() },
    ticket: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    payment: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    paymentProof: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    checkIn: { findUnique: vi.fn(), create: vi.fn(), findMany: vi.fn() },
    checkInAttempt: { create: vi.fn(), findMany: vi.fn() },
    auditLog: { create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    notificationLog: { create: vi.fn(), update: vi.fn() },
    ticketType: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    event: { findUnique: vi.fn(), findMany: vi.fn() },
    session: { findUnique: vi.fn() },
    organizerAssignment: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), upsert: vi.fn(), count: vi.fn() },
    scannerAssignment: { findUnique: vi.fn(), findMany: vi.fn(), upsert: vi.fn() },
    $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn(mockPrisma)),
  };
  return { prisma: mockPrisma };
});

// Mock email service
vi.mock('../infrastructure/email/email.service.js', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  sendPaymentReceivedEmail: vi.fn().mockResolvedValue(undefined),
  sendPaymentApprovedEmail: vi.fn().mockResolvedValue(undefined),
  sendPaymentRejectedEmail: vi.fn().mockResolvedValue(undefined),
  sendTicketIssuedEmail: vi.fn().mockResolvedValue(undefined),
  sendTelegramAdminAlert: vi.fn().mockResolvedValue(undefined),
}));

// Mock audit service
vi.mock('../infrastructure/audit/audit.service.js', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));
