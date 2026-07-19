import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/authentication.js';
import { OrderController } from './order.controller.js';

export async function orderRoutes(app: FastifyInstance) {
  const controller = new OrderController();

  app.post('/', {
    preHandler: [requireAuth],
    handler: controller.create.bind(controller),
  });

  app.get('/:orderNumber', {
    preHandler: [requireAuth],
    handler: controller.getByNumber.bind(controller),
  });
}
