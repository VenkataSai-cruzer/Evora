import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/authentication.js';
import { requireRole } from '../../middleware/authorization.js';
import { PaymentController } from './payment.controller.js';

export async function paymentRoutes(app: FastifyInstance) {
  const controller = new PaymentController();

  // Attendee: submit payment proof (multipart/form-data)
  app.post('/proof', {
    preHandler: [requireAuth, requireRole('ATTENDEE', 'ADMIN')],
    handler: controller.submitProof.bind(controller),
  });

  // Attendee: check own proof status
  app.get('/my-proof/:orderNumber', {
    preHandler: [requireAuth],
    handler: controller.getMyProofStatus.bind(controller),
  });

  // --- Phase 4.3: Verification endpoints ---

  /**
   * GET /payments/proofs/:proofId/image
   * Authenticated screenshot proxy.
   * Admin → any proof. Organizer → assigned events only. Attendee → own proof only.
   */
  app.get('/proofs/:proofId/image', {
    preHandler: [requireAuth],
    handler: controller.getProofImage.bind(controller),
  });

  /**
   * GET /payments/check-utr/:utr
   * Advisory duplicate UTR check.
   * Admin/Organizer can check any UTR.
   */
  app.get('/check-utr/:utr', {
    preHandler: [requireAuth, requireRole('ADMIN', 'ORGANIZER')],
    handler: controller.checkUtr.bind(controller),
  });
}
