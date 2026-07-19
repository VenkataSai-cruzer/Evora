import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/authentication.js';
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

  app.get('/:ticketNumber/download', {
    preHandler: [requireAuth],
    handler: controller.download.bind(controller),
  });
}
