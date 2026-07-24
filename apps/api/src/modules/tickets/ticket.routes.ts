import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/authentication.js';
import { requireRole } from '../../middleware/authorization.js';
import { TicketController } from './ticket.controller.js';

export async function ticketRoutes(app: FastifyInstance) {
  const controller = new TicketController();

  app.get('/', {
    preHandler: [requireAuth],
    handler: controller.list.bind(controller),
  });

  app.get('/:ticketNumber', {
    preHandler: [requireAuth],
    handler: controller.getByNumber.bind(controller),
  });

  // Admin: migrate missing QR tokens for backward compatibility
  app.post('/migrate-qr', {
    preHandler: [requireAuth, requireRole('ADMIN')],
    handler: controller.migrateQrTokens.bind(controller),
  });

  app.get('/:ticketNumber/qr', {
    preHandler: [requireAuth],
    handler: controller.getQrCode.bind(controller),
  });

  app.get('/:ticketNumber/html', {
    preHandler: [requireAuth],
    handler: controller.renderHtml.bind(controller),
  });

  app.get('/:ticketNumber/render', {
    preHandler: [requireAuth],
    handler: controller.renderPng.bind(controller),
  });

  app.get('/:ticketNumber/download', {
    preHandler: [requireAuth],
    handler: controller.downloadPdf.bind(controller),
  });
}

