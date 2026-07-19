import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/authentication.js';
import { requireRole } from '../../middleware/authorization.js';
import { TemplateController } from './template.controller.js';

export async function templateRoutes(app: FastifyInstance) {
  const controller = new TemplateController();

  app.get('/:templateId', {
    preHandler: [requireAuth, requireRole('ADMIN')],
    handler: controller.getTemplate.bind(controller),
  });

  app.put('/:templateId/fields', {
    preHandler: [requireAuth, requireRole('ADMIN')],
    handler: controller.updateFields.bind(controller),
  });

  app.post('/:templateId/lock', {
    preHandler: [requireAuth, requireRole('ADMIN')],
    handler: controller.lockTemplate.bind(controller),
  });
}
