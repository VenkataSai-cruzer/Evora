# Logging & Audit — Jamming Events Platform

## 1. Logging Strategy

### Principles
1. **Structured logging** — All logs in JSON format
2. **Correlation IDs** — Every request traceable across services
3. **Log levels** — Consistent severity classification
4. **No PII in logs** — Personal data excluded from log output
5. **Centralized** — All logs shipped to central platform

---

## 2. Log Levels

| Level | Usage | Example |
|-------|-------|---------|
| `DEBUG` | Development troubleshooting | SQL queries, function parameters |
| `INFO` | Normal operations | User registered, ticket created |
| `WARN` | Unexpected but handled | Rate limit exceeded, retry occurred |
| `ERROR` | Failure requiring attention | Payment failed, DB connection lost |
| `FATAL` | System cannot continue | Server crash, unrecoverable error |

---

## 3. Log Format

```json
{
  "timestamp": "2026-04-15T19:30:00.000Z",
  "level": "INFO",
  "correlationId": "req_abc123",
  "service": "checkin-service",
  "action": "checkin.processed",
  "message": "Ticket check-in processed successfully",
  "metadata": {
    "ticketId": "uuid",
    "eventId": "uuid",
    "scannerId": "uuid",
    "result": "VALID",
    "duration": 45
  },
  "environment": "production",
  "version": "1.0.0"
}
```

---

## 4. Audit Log System

### Purpose
Audit logs provide an immutable record of security-relevant events for:
- Incident investigation
- Compliance verification
- Fraud detection
- Operational analysis

### Events That Must Be Audited

| Category | Events |
|----------|--------|
| Authentication | Login, logout, failed login, password reset, email verification |
| Account | Registration, profile change, account deletion |
| Events | Creation, update, cancellation |
| Tickets | Purchase, cancellation, refund (Phase 2) |
| Check-In | Successful scan, failed scan, manual entry, suspicious activity |
| Blockchain | Hash storage, verification request, failure |
| Payments | Intent created, succeeded, failed, refunded (Phase 2) |
| Admin | Role change, user suspension, data access |

### Audit Log Schema

```prisma
model AuditLog {
  id          String   @id @default(uuid()) @db.Uuid
  action      String   // e.g., "ticket.created", "checkin.valid", "event.cancelled"
  entityType  String   // e.g., "ticket", "event", "user"
  entityId    String   // UUID of affected entity
  actorId     String?  // UUID of user who performed action (null for system actions)
  metadata    Json?    // Action-specific data (see below)
  ipAddress   String?
  userAgent   String?
  timestamp   DateTime @default(now())

  @@index([entityType, entityId])
  @@index([action])
  @@index([actorId])
  @@index([timestamp])
}
```

### Metadata Examples

**Ticket creation:**
```json
{
  "eventId": "uuid",
  "ticketNumber": "JAM-2026-0042",
  "ticketType": "FREE",
  "method": "RSVP"
}
```

**Check-in failure:**
```json
{
  "ticketId": "uuid",
  "eventId": "uuid",
  "reason": "ALREADY_USED",
  "previousCheckInTime": "2026-04-15T19:30:00Z"
}
```

**Event cancellation:**
```json
{
  "eventId": "uuid",
  "affectedTickets": 42,
  "reason": "Venue unavailable"
}
```

---

## 5. Audit Log Implementation

### Audit Service

```typescript
// /src/lib/services/audit.service.ts
import prisma from '@/lib/prisma';

interface AuditEvent {
  action: string;
  entityType: string;
  entityId: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAuditEvent(event: AuditEvent): Promise<void> {
  // Fire and forget — never block the main flow
  try {
    await prisma.auditLog.create({ data: event });
  } catch (error) {
    console.error('Failed to write audit log:', error);
    // Don't crash the app for audit logging failure
  }
}

// Convenience wrappers
export const audit = {
  ticketCreated: (ticketId: string, userId: string, metadata: any) =>
    logAuditEvent({ action: 'ticket.created', entityType: 'ticket', entityId: ticketId, actorId: userId, metadata }),
  
  checkinValid: (ticketId: string, scannerId: string, metadata: any) =>
    logAuditEvent({ action: 'checkin.valid', entityType: 'ticket', entityId: ticketId, actorId: scannerId, metadata }),
  
  checkinFailed: (ticketId: string, scannerId: string, metadata: any) =>
    logAuditEvent({ action: 'checkin.failed', entityType: 'ticket', entityId: ticketId, actorId: scannerId, metadata }),
  
  eventCancelled: (eventId: string, organizerId: string, metadata: any) =>
    logAuditEvent({ action: 'event.cancelled', entityType: 'event', entityId: eventId, actorId: organizerId, metadata }),
};
```

### Middleware for Automatic Logging

```typescript
// API route wrapper
export function withAudit<T>(
  handler: (req: Request, context: any) => Promise<Response>,
  auditAction: string,
  entityType: string
) {
  return async (req: Request, context: any) => {
    const response = await handler(req, context);
    
    // Log non-GET requests
    if (req.method !== 'GET') {
      const url = new URL(req.url);
      logAuditEvent({
        action: `${auditAction}.${req.method.toLowerCase()}`,
        entityType,
        entityId: context.params?.id || url.pathname,
        ipAddress: req.headers.get('x-forwarded-for') || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
        metadata: { statusCode: response.status },
      });
    }
    
    return response;
  };
}
```

---

## 6. Application Logging

### Server-Side Logging

```typescript
// /src/lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
  serializers: {
    req: (req) => ({ method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
    err: pino.stdSerializers.err,
  },
});

// Usage
logger.info({ action: 'ticket.created', ticketId: '...' }, 'New ticket created');
logger.error({ err, ticketId: '...' }, 'Failed to create ticket');
```

### Client-Side Logging

```typescript
// /src/lib/client-logger.ts
// Only logs errors and warnings to avoid flooding
const loggers = {
  error: (message: string, metadata?: Record<string, unknown>) => {
    console.error(`[Jamming Error] ${message}`, metadata);
    // Optionally send to Sentry
    // Sentry.captureMessage(message, { extra: metadata });
  },
  warn: (message: string, metadata?: Record<string, unknown>) => {
    console.warn(`[Jamming Warn] ${message}`, metadata);
  },
  info: (message: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.info(`[Jamming] ${message}`);
    }
  },
};
```

---

## 7. Log Retention & Storage

| Log Type | Retention | Storage |
|----------|-----------|---------|
| Application logs | 30 days | Vercel Logs / Logtail |
| Audit logs | 1 year | PostgreSQL (audit_logs table) |
| Error logs | 90 days | Sentry |
| Access logs | 30 days | Vercel Edge Logs |
| Blockchain logs | Permanent | Ethereum blockchain |
| Stripe logs | Permanent | Stripe Dashboard |

### Audit Log Archival

```sql
-- Monthly archive job: move logs older than 90 days to archive table
CREATE TABLE audit_logs_archive (LIKE audit_logs INCLUDING ALL);

INSERT INTO audit_logs_archive 
SELECT * FROM audit_logs 
WHERE timestamp < NOW() - INTERVAL '90 days';

DELETE FROM audit_logs 
WHERE timestamp < NOW() - INTERVAL '90 days';
```

---

## 8. Monitoring & Alerting

### Alerts

| Condition | Severity | Channel |
|-----------|----------|---------|
| Error rate > 1% | Critical | PagerDuty / Slack |
| Check-in failure rate > 5% | Warning | Slack |
| Failed login spike > 20/hr | Warning | Slack |
| Database connection pool > 80% | Warning | Slack |
| Blockchain transaction failure | Warning | Slack |
| Stripe payment failure > 5% | Warning | Slack |

### Dashboards

| Dashboard | Metrics |
|-----------|---------|
| Operations | Error rate, latency, throughput, active users |
| Events | Events created, tickets sold, check-in rate |
| Security | Failed logins, blocked requests, audit anomalies |
| Blockchain | Transactions pending, confirmed, failed, gas costs |
