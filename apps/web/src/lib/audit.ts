import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';

const log = createLogger('audit');

export interface AuditEntry {
  action: string;
  entityType: string;
  entityId: string;
  actorId?: string | null;
  eventId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        actorId: entry.actorId || null,
        eventId: entry.eventId || null,
        ipAddress: entry.ipAddress || null,
        userAgent: entry.userAgent || null,
        metadata: JSON.stringify(entry.metadata || {}),
      },
    });
  } catch (error) {
    // Audit failure must never crash the primary operation
    log.error({ error, entry }, 'Failed to write audit log');
  }
}

export function getRequestMetadata(request: Request): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  return {
    ipAddress:
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      null,
    userAgent: request.headers.get('user-agent') || null,
  };
}
