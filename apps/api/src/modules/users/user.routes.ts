import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/authentication.js';
import { UserController } from './user.controller.js';

export async function userRoutes(app: FastifyInstance) {
  const controller = new UserController();

  app.get('/me', {
    preHandler: [requireAuth],
    handler: controller.getProfile.bind(controller),
  });

  app.get('/me/overview', {
    preHandler: [requireAuth],
    handler: controller.getOverview.bind(controller),
  });

  app.get('/me/dashboard', {
    preHandler: [requireAuth],
    handler: controller.getDashboard.bind(controller),
  });

  app.get('/me/orders', {
    preHandler: [requireAuth],
    handler: controller.getOrders.bind(controller),
  });

  app.get('/me/orders/:orderNumber', {
    preHandler: [requireAuth],
    handler: controller.getOrderByNumber.bind(controller),
  });

  app.get('/me/tickets', {
    preHandler: [requireAuth],
    handler: controller.getTickets.bind(controller),
  });

  app.get('/me/payments', {
    preHandler: [requireAuth],
    handler: controller.getPayments.bind(controller),
  });
}
