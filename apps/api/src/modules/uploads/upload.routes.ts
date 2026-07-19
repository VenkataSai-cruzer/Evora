import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/authentication.js';
import { requireRole } from '../../middleware/authorization.js';
import { UploadController } from './upload.controller.js';

export async function uploadRoutes(app: FastifyInstance) {
  const controller = new UploadController();

  app.post('/event/:eventId/poster', {
    preHandler: [requireAuth, requireRole('ADMIN')],
    handler: controller.uploadPoster.bind(controller),
  });

  app.post('/event/:eventId/branding', {
    preHandler: [requireAuth, requireRole('ADMIN')],
    handler: controller.uploadBranding.bind(controller),
  });

  app.post('/event/:eventId/template', {
    preHandler: [requireAuth, requireRole('ADMIN')],
    handler: controller.uploadTemplate.bind(controller),
  });
}
