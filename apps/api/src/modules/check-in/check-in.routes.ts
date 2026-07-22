import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/authentication.js';
import { requireRole } from '../../middleware/authorization.js';
import { CheckInController } from './check-in.controller.js';

export async function checkInRoutes(app: FastifyInstance) {
  const controller = new CheckInController();

  // Verify QR code (SCANNER or ADMIN)
  app.post('/verify', {
    preHandler: [requireAuth, requireRole('ADMIN', 'SCANNER')],
    handler: controller.verify.bind(controller),
  });

  // Manual check-in by ticket number (SCANNER or ADMIN)
  app.post('/manual', {
    preHandler: [requireAuth, requireRole('ADMIN', 'SCANNER')],
    handler: controller.manual.bind(controller),
  });

  // Scanner: get assigned events
  app.get('/scanner/events', {
    preHandler: [requireAuth, requireRole('ADMIN', 'SCANNER')],
    handler: controller.getScannerEvents.bind(controller),
  });
}
