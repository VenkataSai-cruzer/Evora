import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/authentication.js';
import { requireRole } from '../../middleware/authorization.js';
import { CheckInController } from './check-in.controller.js';

export async function checkInRoutes(app: FastifyInstance) {
  const controller = new CheckInController();

  app.post('/verify', {
    preHandler: [requireAuth, requireRole('ADMIN', 'CHECKIN_STAFF')],
    handler: controller.verify.bind(controller),
  });

  app.post('/manual', {
    preHandler: [requireAuth, requireRole('ADMIN', 'CHECKIN_STAFF')],
    handler: controller.manual.bind(controller),
  });
}
