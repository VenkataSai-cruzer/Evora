-- Phase 4.1: Payment Lifecycle Refactor
-- Order state machine, PaymentProof history, resubmission support
-- ============================================================

-- ── Order additions ────────────────────────────────────────────
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "resubmissionCount" INTEGER NOT NULL DEFAULT 0;

-- ── PaymentProofHistory ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PaymentProofHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "originalProofId" TEXT,
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
    "status" TEXT NOT NULL,
    "rejectionReason" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentProofHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PaymentProofHistory_orderId_idx" ON "PaymentProofHistory"("orderId");
CREATE INDEX IF NOT EXISTS "PaymentProofHistory_eventId_idx" ON "PaymentProofHistory"("eventId");
CREATE INDEX IF NOT EXISTS "PaymentProofHistory_submittedById_idx" ON "PaymentProofHistory"("submittedById");
CREATE INDEX IF NOT EXISTS "PaymentProofHistory_utrNumber_idx" ON "PaymentProofHistory"("utrNumber");
CREATE INDEX IF NOT EXISTS "PaymentProofHistory_archivedAt_idx" ON "PaymentProofHistory"("archivedAt");

ALTER TABLE "PaymentProofHistory" DROP CONSTRAINT IF EXISTS "PaymentProofHistory_orderId_fkey";
ALTER TABLE "PaymentProofHistory" ADD CONSTRAINT "PaymentProofHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentProofHistory" DROP CONSTRAINT IF EXISTS "PaymentProofHistory_submittedById_fkey";
ALTER TABLE "PaymentProofHistory" ADD CONSTRAINT "PaymentProofHistory_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentProofHistory" DROP CONSTRAINT IF EXISTS "PaymentProofHistory_eventId_fkey";
ALTER TABLE "PaymentProofHistory" ADD CONSTRAINT "PaymentProofHistory_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentProofHistory" DROP CONSTRAINT IF EXISTS "PaymentProofHistory_reviewedById_fkey";
ALTER TABLE "PaymentProofHistory" ADD CONSTRAINT "PaymentProofHistory_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
