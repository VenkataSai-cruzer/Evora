import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../infrastructure/database/prisma.js';
import { GoogleDriveService } from '../../infrastructure/storage/google-drive.service.js';
import { writeAuditLog } from '../../infrastructure/audit/audit.service.js';
import {
  sendPaymentReceivedEmail,
  sendTelegramAdminAlert,
} from '../../infrastructure/email/email.service.js';
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

function normalizeUtr(utr: string): string {
  return utr.trim().toUpperCase();
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

    if (order.status !== 'PENDING_PAYMENT' && order.status !== 'CANCELLED') {
      return reply.status(400).send({
        error: `Order status is "${order.status}" — cannot submit payment proof`,
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

    // Upload to Google Drive
    let driveFileId: string | undefined;
    let driveViewUrl: string | undefined;
    let storageProvider = 'GOOGLE_DRIVE';

    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON) {
      const driveService = new GoogleDriveService();
      try {
        const uploadResult = await driveService.uploadPaymentProof(
          order.event.slug,
          order.orderNumber,
          storedFileName,
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
      console.log(`[Dev] Payment proof would be stored for order ${orderNumber}, UTR ${normalized}`);
    }

    // Save metadata to PostgreSQL in a transaction
    let proof;
    try {
      proof = await prisma.$transaction(async (tx) => {
        // If resubmitting after cancellation, reset order
        if (order.status === 'CANCELLED') {
          await tx.order.update({
            where: { id: order.id },
            data: { status: 'PENDING_PAYMENT' },
          });
          // Restore capacity
          const groups = await tx.orderAttendee.groupBy({
            by: ['ticketTypeId'],
            where: { orderId: order.id },
            _count: { id: true },
          });
          for (const g of groups) {
            await tx.ticketType.update({
              where: { id: g.ticketTypeId },
              data: { soldCount: { increment: g._count.id } },
            });
          }
        }

        // Delete any previous PaymentProof for this order (history kept in AuditLog)
        const existing = await tx.paymentProof.findUnique({ where: { orderId: order.id } });
        if (existing) {
          await tx.paymentProof.delete({ where: { orderId: order.id } });
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
      if (driveFileId && process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON) {
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
    await writeAuditLog(
      order.status === 'CANCELLED' ? 'PAYMENT_PROOF_RESUBMITTED' : 'PAYMENT_PROOF_SUBMITTED',
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

    // Notifications
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      sendPaymentReceivedEmail({
        to: user.email,
        attendeeName: user.name,
        orderNumber: order.orderNumber,
        eventTitle: order.event.title,
        amount: order.total,
        utrNumber: normalized,
        userId,
      }).catch(console.error);
    }

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
}
