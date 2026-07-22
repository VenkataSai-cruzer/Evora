import { prisma } from '../database/prisma.js';

export type AuditAction =
  | 'PAYMENT_PROOF_SUBMITTED'
  | 'PAYMENT_PROOF_RESUBMITTED'
  | 'PAYMENT_APPROVED'
  | 'PAYMENT_REJECTED'
  | 'PAYMENT_RESUBMISSION_REQUESTED'
  | 'TICKET_GENERATED'
  | 'TICKET_RESENT'
  | 'TICKET_CANCELLED'
  | 'COMPLIMENTARY_TICKET_CREATED'
  | 'SCANNER_ASSIGNED'
  | 'ORGANIZER_ASSIGNED'
  | 'CHECK_IN_SUCCESS'
  | 'CHECK_IN_DUPLICATE'
  | 'CHECK_IN_INVALID'
  | 'CHECK_IN_OVERRIDE'
  | 'EVENT_PUBLISHED'
  | 'EVENT_PAUSED'
  | 'EVENT_RESUMED'
  | 'EVENT_CLOSED'
  | 'USER_ROLE_CHANGED'
  | 'USER_STATUS_CHANGED'
  | 'ORDER_CREATED'
  | 'ORDER_CONFIRMED'
  | 'ORDER_CANCELLED'
  | 'SCREENSHOT_VIEWED'
  | 'DUPLICATE_UTR_DETECTED';

interface AuditContext {
  actorId?: string;
  actorRole?: string;
  eventId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export async function writeAuditLog(
  action: AuditAction,
  entityType: string,
  entityId: string,
  ctx: AuditContext = {},
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId,
        actorId: ctx.actorId ?? null,
        actorRole: ctx.actorRole ?? null,
        eventId: ctx.eventId ?? null,
        ipAddress: ctx.ipAddress ?? null,
        userAgent: ctx.userAgent ?? null,
        metadata: JSON.stringify(ctx.metadata ?? {}),
      },
    });
  } catch (err) {
    // Audit log failures must never break business operations
    console.error('[AuditLog] Failed to write audit log:', err);
  }
}
