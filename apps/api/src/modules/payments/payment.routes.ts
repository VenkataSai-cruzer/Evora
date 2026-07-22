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
}
