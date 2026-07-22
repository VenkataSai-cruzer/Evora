-- Phase 4: Roles, Payments, Tickets, Scanner, Complimentary Tickets
-- ============================================================

-- ── User additions ────────────────────────────────────────────
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE';
-- Update role comment (role values: ATTENDEE | ORGANIZER | SCANNER | ADMIN)
-- CHECKIN_STAFF is superseded by SCANNER role
UPDATE "User" SET "role" = 'SCANNER' WHERE "role" = 'CHECKIN_STAFF';
CREATE INDEX IF NOT EXISTS "User_status_idx" ON "User"("status");

-- ── OrganizerAssignment ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "OrganizerAssignment" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "permissions" TEXT NOT NULL DEFAULT '{}',
    "assignedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizerAssignment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "OrganizerAssignment_organizerId_eventId_key" ON "OrganizerAssignment"("organizerId", "eventId");
CREATE INDEX IF NOT EXISTS "OrganizerAssignment_eventId_idx" ON "OrganizerAssignment"("eventId");
CREATE INDEX IF NOT EXISTS "OrganizerAssignment_organizerId_idx" ON "OrganizerAssignment"("organizerId");
ALTER TABLE "OrganizerAssignment" DROP CONSTRAINT IF EXISTS "OrganizerAssignment_organizerId_fkey";
ALTER TABLE "OrganizerAssignment" ADD CONSTRAINT "OrganizerAssignment_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrganizerAssignment" DROP CONSTRAINT IF EXISTS "OrganizerAssignment_eventId_fkey";
ALTER TABLE "OrganizerAssignment" ADD CONSTRAINT "OrganizerAssignment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrganizerAssignment" DROP CONSTRAINT IF EXISTS "OrganizerAssignment_assignedById_fkey";
ALTER TABLE "OrganizerAssignment" ADD CONSTRAINT "OrganizerAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── ScannerAssignment ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ScannerAssignment" (
    "id" TEXT NOT NULL,
    "scannerId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "gateName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScannerAssignment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ScannerAssignment_scannerId_eventId_key" ON "ScannerAssignment"("scannerId", "eventId");
CREATE INDEX IF NOT EXISTS "ScannerAssignment_eventId_idx" ON "ScannerAssignment"("eventId");
CREATE INDEX IF NOT EXISTS "ScannerAssignment_scannerId_idx" ON "ScannerAssignment"("scannerId");
ALTER TABLE "ScannerAssignment" DROP CONSTRAINT IF EXISTS "ScannerAssignment_scannerId_fkey";
ALTER TABLE "ScannerAssignment" ADD CONSTRAINT "ScannerAssignment_scannerId_fkey" FOREIGN KEY ("scannerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScannerAssignment" DROP CONSTRAINT IF EXISTS "ScannerAssignment_eventId_fkey";
ALTER TABLE "ScannerAssignment" ADD CONSTRAINT "ScannerAssignment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScannerAssignment" DROP CONSTRAINT IF EXISTS "ScannerAssignment_assignedById_fkey";
ALTER TABLE "ScannerAssignment" ADD CONSTRAINT "ScannerAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── PaymentProof ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PaymentProof" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "utrNumber" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "storedFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "googleDriveFileId" TEXT,
    "googleDriveViewUrl" TEXT,
    "storageProvider" TEXT NOT NULL DEFAULT 'GOOGLE_DRIVE',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentProof_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentProof_orderId_key" ON "PaymentProof"("orderId");
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentProof_utrNumber_key" ON "PaymentProof"("utrNumber");
CREATE INDEX IF NOT EXISTS "PaymentProof_status_idx" ON "PaymentProof"("status");
CREATE INDEX IF NOT EXISTS "PaymentProof_eventId_idx" ON "PaymentProof"("eventId");
CREATE INDEX IF NOT EXISTS "PaymentProof_submittedById_idx" ON "PaymentProof"("submittedById");
ALTER TABLE "PaymentProof" DROP CONSTRAINT IF EXISTS "PaymentProof_orderId_fkey";
ALTER TABLE "PaymentProof" ADD CONSTRAINT "PaymentProof_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentProof" DROP CONSTRAINT IF EXISTS "PaymentProof_submittedById_fkey";
ALTER TABLE "PaymentProof" ADD CONSTRAINT "PaymentProof_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentProof" DROP CONSTRAINT IF EXISTS "PaymentProof_eventId_fkey";
ALTER TABLE "PaymentProof" ADD CONSTRAINT "PaymentProof_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentProof" DROP CONSTRAINT IF EXISTS "PaymentProof_reviewedById_fkey";
ALTER TABLE "PaymentProof" ADD CONSTRAINT "PaymentProof_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Ticket additions ───────────────────────────────────────────
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "attendeeName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "attendeeEmail" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "attendeePhone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "ticketCategory" TEXT NOT NULL DEFAULT 'PAID';
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'PAYMENT_APPROVAL';
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "visibility" TEXT NOT NULL DEFAULT 'STANDARD';
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "issuedById" TEXT;
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "issuedByRole" TEXT;
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "pricePaid" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "qrToken" TEXT;
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "checkedInById" TEXT;
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "gateName" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Ticket_qrToken_key" ON "Ticket"("qrToken");
CREATE INDEX IF NOT EXISTS "Ticket_ticketCategory_idx" ON "Ticket"("ticketCategory");
CREATE INDEX IF NOT EXISTS "Ticket_visibility_idx" ON "Ticket"("visibility");
CREATE INDEX IF NOT EXISTS "Ticket_source_idx" ON "Ticket"("source");
ALTER TABLE "Ticket" DROP CONSTRAINT IF EXISTS "Ticket_issuedById_fkey";
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── CheckIn additions ──────────────────────────────────────────
ALTER TABLE "CheckIn" ADD COLUMN IF NOT EXISTS "scannerAssignmentId" TEXT;
ALTER TABLE "CheckIn" ADD COLUMN IF NOT EXISTS "gateName" TEXT;
ALTER TABLE "CheckIn" ADD COLUMN IF NOT EXISTS "scannerDevice" TEXT;
ALTER TABLE "CheckIn" ADD COLUMN IF NOT EXISTS "metadata" TEXT NOT NULL DEFAULT '{}';
-- Rename result column default from VALID to SUCCESS (keep old values compatible)
UPDATE "CheckIn" SET "result" = 'SUCCESS' WHERE "result" = 'VALID';
CREATE INDEX IF NOT EXISTS "CheckIn_checkedInAt_idx" ON "CheckIn"("checkedInAt");

-- ── CheckInAttempt (new immutable per-scan log) ──────────────
CREATE TABLE IF NOT EXISTS "CheckInAttempt" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "scannerId" TEXT NOT NULL,
    "gateName" TEXT,
    "scannerDevice" TEXT,
    "result" TEXT NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT NOT NULL DEFAULT '{}',

    CONSTRAINT "CheckInAttempt_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CheckInAttempt_ticketId_idx" ON "CheckInAttempt"("ticketId");
CREATE INDEX IF NOT EXISTS "CheckInAttempt_eventId_idx" ON "CheckInAttempt"("eventId");
CREATE INDEX IF NOT EXISTS "CheckInAttempt_scannerId_idx" ON "CheckInAttempt"("scannerId");
CREATE INDEX IF NOT EXISTS "CheckInAttempt_result_idx" ON "CheckInAttempt"("result");
CREATE INDEX IF NOT EXISTS "CheckInAttempt_scannedAt_idx" ON "CheckInAttempt"("scannedAt");
ALTER TABLE "CheckInAttempt" DROP CONSTRAINT IF EXISTS "CheckInAttempt_ticketId_fkey";
ALTER TABLE "CheckInAttempt" ADD CONSTRAINT "CheckInAttempt_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CheckInAttempt" DROP CONSTRAINT IF EXISTS "CheckInAttempt_eventId_fkey";
ALTER TABLE "CheckInAttempt" ADD CONSTRAINT "CheckInAttempt_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CheckInAttempt" DROP CONSTRAINT IF EXISTS "CheckInAttempt_scannerId_fkey";
ALTER TABLE "CheckInAttempt" ADD CONSTRAINT "CheckInAttempt_scannerId_fkey" FOREIGN KEY ("scannerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── AuditLog additions ─────────────────────────────────────────
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "actorRole" TEXT;
CREATE INDEX IF NOT EXISTS "AuditLog_actorId_idx" ON "AuditLog"("actorId");
CREATE INDEX IF NOT EXISTS "AuditLog_eventId_idx" ON "AuditLog"("eventId");

-- ── NotificationLog ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "NotificationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "channel" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttempt" TIMESTAMP(3),
    "error" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "NotificationLog_status_idx" ON "NotificationLog"("status");
CREATE INDEX IF NOT EXISTS "NotificationLog_type_idx" ON "NotificationLog"("type");
CREATE INDEX IF NOT EXISTS "NotificationLog_userId_idx" ON "NotificationLog"("userId");
CREATE INDEX IF NOT EXISTS "NotificationLog_createdAt_idx" ON "NotificationLog"("createdAt");
ALTER TABLE "NotificationLog" DROP CONSTRAINT IF EXISTS "NotificationLog_userId_fkey";
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
