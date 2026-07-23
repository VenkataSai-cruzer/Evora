import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../infrastructure/database/prisma.js';
import { GoogleDriveService } from '../../infrastructure/storage/google-drive.service.js';
import { writeAuditLog } from '../../infrastructure/audit/audit.service.js';
import {
  sendTelegramAdminAlert,
} from '../../infrastructure/email/email.service.js';
import { normalizeUtr } from '../../shared/utr.js';
import crypto from 'crypto';
import { randomUUID } from 'crypto';

const MAX_FILE_SIZE_BYTES = parseInt(process.env.PAYMENT_PROOF_MAX_SIZE_BYTES || String(5 * 1024 * 1024));
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// Magic byte signatures for allowed image types
const MAGIC_BYTES: Record<string, Buffer[]> = {
  'image/jpeg': [Buffer.from([0xff, 0xd8, 0xff])],
  'image/png': [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
  'image/webp': [Buffer.from('RIFF'), Buffer.from('WEBP')],
};

function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const signatures = MAGIC_BYTES[mimeType];
  if (!signatures) return false;

  if (mimeType === 'image/webp') {
    // RIFF????WEBP — offset 0 = RIFF, offset 8 = WEBP
    return (
      buffer.slice(0, 4).equals(MAGIC_BYTES['image/webp'][0]) &&
      buffer.slice(8, 12).equals(MAGIC_BYTES['image/webp'][1])
    );
  }

  return signatures.some((sig) => buffer.slice(0, sig.length).equals(sig));
}

export class PaymentController {
  /**
   * POST /payments/proof
   *
   * Submit UPI payment proof: UTR number + screenshot (multipart form).
   * Stores file metadata in PostgreSQL; file itself in Google Drive.
   */
  async submitProof(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user!.id;

    // Parse multipart
    const parts = request.parts();
    let orderNumber: string | undefined;
    let utrNumber: string | undefined;
    let fileBuffer: Buffer | undefined;
    let originalFileName: string | undefined;
    let mimeType: string | undefined;
    let fileSize: number = 0;

    for await (const part of parts) {
      if (part.type === 'field') {
        if (part.fieldname === 'orderNumber') orderNumber = String(part.value);
        if (part.fieldname === 'utrNumber') utrNumber = String(part.value);
      } else if (part.type === 'file') {
        if (part.fieldname !== 'screenshot') continue;
        mimeType = part.mimetype;
        originalFileName = part.filename;
        const chunks: Buffer[] = [];
        for await (const chunk of part.file) {
          chunks.push(chunk);
          fileSize += chunk.length;
          if (fileSize > MAX_FILE_SIZE_BYTES) {
            // Drain remaining to prevent pipe issues
            part.file.resume();
            return reply.status(413).send({
              error: `Screenshot file too large. Maximum size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB`,
            });
          }
        }
        fileBuffer = Buffer.concat(chunks);
      }
    }

    if (!orderNumber || !utrNumber) {
      return reply.status(400).send({ error: 'orderNumber and utrNumber are required' });
    }

    if (!fileBuffer || !originalFileName || !mimeType) {
      return reply.status(400).send({ error: 'Screenshot is required' });
    }

    // Validate UTR format
    const normalized = normalizeUtr(utrNumber);
    if (!/^[A-Z0-9]{8,30}$/.test(normalized)) {
      return reply.status(400).send({ error: 'Invalid UTR number format (8–30 alphanumeric characters)' });
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return reply.status(415).send({
        error: `Unsupported file type "${mimeType}". Allowed: JPEG, PNG, WebP`,
      });
    }

    // Validate file extension
    const ext = '.' + (originalFileName.split('.').pop() || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return reply.status(415).send({ error: 'Invalid file extension' });
    }

    // Validate magic bytes
    if (!validateMagicBytes(fileBuffer, mimeType)) {
      return reply.status(415).send({ error: 'File content does not match declared type' });
    }

    // Check order ownership
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        event: { select: { id: true, slug: true, title: true } },
        user: { select: { name: true, email: true } },
      },
    });

    if (!order) return reply.status(404).send({ error: 'Order not found' });
    if (order.userId !== userId) return reply.status(403).send({ error: 'Access denied' });

    // Accept: PENDING_PAYMENT (first submission), REJECTED (resubmission)
    const validStates = ['PENDING_PAYMENT', 'REJECTED'];
    if (!validStates.includes(order.status)) {
      return reply.status(400).send({
        error: `Order status is "${order.status}" — cannot submit payment proof. Only PENDING_PAYMENT or REJECTED orders can submit.`,
      });
    }

    // Check for duplicate UTR across all orders
    const existingUtr = await prisma.paymentProof.findUnique({
      where: { utrNumber: normalized },
    });
    if (existingUtr) {
      return reply.status(409).send({ error: 'This UTR number has already been submitted' });
    }

    // Also check old Payment table for backwards compat
    const existingPayment = await prisma.payment.findUnique({
      where: { utrNumber: normalized },
    });
    if (existingPayment) {
      return reply.status(409).send({ error: 'This UTR number has already been used' });
    }

    // Calculate checksum
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Generate a randomized stored filename
    const storedFileName = `${randomUUID()}${ext}`;

    // Upload to Google Drive (if enabled)
    let driveFileId: string | undefined;
    let driveViewUrl: string | undefined;
    let storageProvider = 'GOOGLE_DRIVE';

    const driveEnabled = process.env.GOOGLE_DRIVE_ENABLED === 'true';
    const hasDriveCreds =
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON ||
      (process.env.GOOGLE_PROJECT_ID &&
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
        process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY);

    if (driveEnabled && hasDriveCreds) {
      try {
        const driveService = new GoogleDriveService();
        const uploadResult = await driveService.uploadPaymentProof(
          order.event.slug || order.event.title,
          order.orderNumber,
          normalized,
          fileBuffer,
          mimeType,
        );
        driveFileId = uploadResult.fileId;
        driveViewUrl = uploadResult.viewUrl;
      } catch (err) {
        console.error('[GoogleDrive] Upload failed:', err);
        return reply.status(502).send({
          error: 'Screenshot upload failed. Please try again.',
        });
      }
    } else {
      // Dev mode: store locally noted
      storageProvider = 'LOCAL';
      console.log(`[Dev] Payment proof stored locally for order ${orderNumber}, UTR ${normalized}`);
    }

    // Determine if this is a resubmission before the transaction to avoid stale reads
    const isResubmission = order.status === 'REJECTED';

    // Save metadata to PostgreSQL in a transaction
    let proof;
    try {
      proof = await prisma.$transaction(async (tx) => {
        // If resubmitting after rejection, archive old proof to history
        if (isResubmission) {
          const oldProof = await tx.paymentProof.findUnique({ where: { orderId: order.id } });
          if (oldProof) {
            // Archive to history before deleting
            await tx.paymentProofHistory.create({
              data: {
                orderId: order.id,
                originalProofId: oldProof.id,
                submittedById: oldProof.submittedById,
                eventId: oldProof.eventId,
                utrNumber: oldProof.utrNumber,
                amount: oldProof.amount,
                originalFileName: oldProof.originalFileName,
                storedFileName: oldProof.storedFileName,
                mimeType: oldProof.mimeType,
                fileSize: oldProof.fileSize,
                checksum: oldProof.checksum,
                googleDriveFileId: oldProof.googleDriveFileId,
                googleDriveViewUrl: oldProof.googleDriveViewUrl,
                storageProvider: oldProof.storageProvider,
                status: oldProof.status,
                rejectionReason: oldProof.rejectionReason,
                submittedAt: oldProof.submittedAt,
                reviewedAt: oldProof.reviewedAt,
                reviewedById: oldProof.reviewedById,
              },
            });
            // Delete old proof so new one can be created with unique orderId
            await tx.paymentProof.delete({ where: { orderId: order.id } });
          }
          // Increment resubmission count
          // (rejection reason lives on PaymentProof/PaymentProofHistory, not Order)
          await tx.order.update({
            where: { id: order.id },
            data: {
              status: 'PENDING_VERIFICATION',
              resubmissionCount: { increment: 1 },
            },
          });
        } else {
          // First submission: set order to PENDING_VERIFICATION
          await tx.order.update({
            where: { id: order.id },
            data: { status: 'PENDING_VERIFICATION' },
          });
        }

        // Also create a legacy Payment record for backwards compat
        await tx.payment.create({
          data: {
            orderId: order.id,
            amount: order.total,
            currency: order.currency,
            method: 'utr',
            status: 'PENDING',
            utrNumber: normalized,
          },
        });

        return tx.paymentProof.create({
          data: {
            orderId: order.id,
            submittedById: userId,
            eventId: order.eventId,
            utrNumber: normalized,
            amount: order.total,
            originalFileName,
            storedFileName,
            mimeType,
            fileSize,
            checksum,
            googleDriveFileId: driveFileId ?? null,
            googleDriveViewUrl: driveViewUrl ?? null,
            storageProvider,
            status: 'PENDING',
          },
        });
      });
    } catch (err) {
      // DB failed — attempt to clean up Drive upload
      if (driveFileId && (process.env.GOOGLE_DRIVE_ENABLED === 'true')) {
        try {
          const driveService = new GoogleDriveService();
          await driveService.deleteFile(driveFileId);
        } catch (cleanupErr) {
          console.error('[GoogleDrive] Cleanup failed:', cleanupErr);
        }
      }
      throw err;
    }

    // Audit log
    const auditAction = isResubmission ? 'PAYMENT_PROOF_RESUBMITTED' : 'PAYMENT_PROOF_SUBMITTED';
    await writeAuditLog(
      auditAction,
      'PaymentProof',
      proof.id,
      {
        actorId: userId,
        eventId: order.eventId,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        metadata: { orderNumber, utrNumber: normalized },
      },
    );

    // Email notifications disabled until verified domain is set up.
    // Users check payment status via their dashboard.
    sendTelegramAdminAlert(
      `💳 <b>New Payment Proof</b>\nOrder: <code>${order.orderNumber}</code>\nUTR: <code>${normalized}</code>\nEvent: ${order.event.title}\n<i>Awaiting review</i>`,
    ).catch(console.error);

    return reply.status(201).send({
      success: true,
      proof: {
        id: proof.id,
        orderNumber: order.orderNumber,
        utrNumber: proof.utrNumber,
        status: proof.status,
        submittedAt: proof.submittedAt,
      },
    });
  }

  /**
   * GET /payments/my-proof/:orderNumber
   * Attendee can check their own proof status.
   */
  async getMyProofStatus(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user!.id;
    const { orderNumber } = request.params as { orderNumber: string };

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { paymentProof: true },
    });

    if (!order) return reply.status(404).send({ error: 'Order not found' });
    if (order.userId !== userId) return reply.status(403).send({ error: 'Access denied' });

    return {
      orderNumber: order.orderNumber,
      orderStatus: order.status,
      proof: order.paymentProof
        ? {
            status: order.paymentProof.status,
            utrNumber: order.paymentProof.utrNumber,
            submittedAt: order.paymentProof.submittedAt,
            rejectionReason: order.paymentProof.rejectionReason,
          }
        : null,
    };
  }

  /**
   * GET /payments/proofs/:proofId/image
   * Authenticated screenshot proxy.
   * Streams the image from Google Drive without exposing the Drive URL.
   *
   * Authorization:
   *   - ADMIN: any proof
   *   - Organizer: only proofs for assigned events
   */
  async getProofImage(request: FastifyRequest, reply: FastifyReply) {
    const { proofId } = request.params as { proofId: string };
    const userId = request.user!.id;
    const userRole = request.user!.role;

    // Fetch proof with order and event for authorization
    const proof = await prisma.paymentProof.findUnique({
      where: { id: proofId },
      include: {
        order: {
          include: {
            event: { select: { id: true, title: true } },
          },
        },
      },
    });

    if (!proof) {
      return reply.status(404).send({ error: 'Payment proof not found' });
    }

    if (!proof.order) {
      return reply.status(404).send({ error: 'Associated order not found' });
    }

    // Authorize: ADMIN can view any proof
    if (userRole !== 'ADMIN') {
      // Organizer: must be assigned to the event
      if (userRole === 'ORGANIZER') {
        const assignment = await prisma.organizerAssignment.findUnique({
          where: {
            organizerId_eventId: {
              organizerId: userId,
              eventId: proof.order.eventId,
            },
          },
        });
        if (!assignment) {
          return reply.status(403).send({ error: 'Not assigned to this event' });
        }
      } else {
        // Other roles: only if they submitted the proof
        if (proof.submittedById !== userId) {
          return reply.status(403).send({ error: 'Access denied' });
        }
      }
    }

    // Get the file from Google Drive
    const fileId = proof.googleDriveFileId;
    if (!fileId) {
      return reply.status(404).send({ error: 'Screenshot file is not stored' });
    }

    try {
      const driveService = new GoogleDriveService();
      const { stream, mimeType } = await driveService.getFileStream(fileId);

      // Set cache control — sensitive data, prevent caching
      reply.header('Content-Type', mimeType);
      reply.header('Cache-Control', 'no-store, must-revalidate');
      reply.header('Pragma', 'no-cache');

      // Audit log: SCREENSHOT_VIEWED
      await writeAuditLog('SCREENSHOT_VIEWED', 'PaymentProof', proofId, {
        actorId: userId,
        actorRole: userRole,
        eventId: proof.order.eventId,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      }).catch(() => {});

      return reply.send(stream);
    } catch (err) {
      console.error('[ScreenshotProxy] Failed to stream file:', err);
      return reply.status(502).send({ error: 'Failed to load screenshot from storage' });
    }
  }

  /**
   * GET /payments/check-utr/:utr
   * Check if a UTR number has been used before.
   * Advisory only — does not auto-approve or reject.
   *
   * Returns:
   *   - duplicate: boolean
   *   - relatedOrder: { orderNumber, eventTitle, status } | null
   *   - submissionCount: number
   */
  async checkUtr(request: FastifyRequest, reply: FastifyReply) {
    const { utr } = request.params as { utr: string };

    // Normalize using shared utility
    const normalized = normalizeUtr(utr);

    if (!normalized || normalized.length < 3) {
      return reply.status(400).send({ error: 'UTR must be at least 3 characters' });
    }

    // Search both PaymentProof and legacy Payment tables
    const [proofMatch, paymentMatch] = await Promise.all([
      prisma.paymentProof.findUnique({
        where: { utrNumber: normalized },
        select: {
          id: true,
          utrNumber: true,
          status: true,
          order: {
            select: {
              orderNumber: true,
              event: { select: { title: true } },
            },
          },
        },
      }),
      prisma.payment.findUnique({
        where: { utrNumber: normalized },
        select: {
          id: true,
          status: true,
          order: {
            select: {
              orderNumber: true,
              event: { select: { title: true } },
            },
          },
        },
      }),
    ]);

    // Count total submissions of this UTR across all orders
    const totalSubmissions = await prisma.paymentProof.count({
      where: { utrNumber: normalized },
    });

    const match = proofMatch || paymentMatch;

    // Audit log: DUPLICATE_UTR_DETECTED (only if duplicate found)
    if (match) {
      // Use correct entity type: PaymentProof for current table, Payment for legacy
      const entityType = proofMatch ? 'PaymentProof' : 'Payment';
      await writeAuditLog('DUPLICATE_UTR_DETECTED', entityType, match.id, {
        actorId: request.user!.id,
        actorRole: request.user!.role,
        metadata: {
          utrNumber: normalized,
          relatedOrder: match.order?.orderNumber,
        },
      }).catch(() => {});
    }

    return {
      duplicate: !!match,
      relatedOrder: match?.order
        ? {
            orderNumber: match.order.orderNumber,
            eventTitle: match.order.event.title,
            status: (match as typeof proofMatch)?.status ||
                    (match as typeof paymentMatch)?.status || 'UNKNOWN',
          }
        : null,
      submissionCount: totalSubmissions,
    };
  }
}
