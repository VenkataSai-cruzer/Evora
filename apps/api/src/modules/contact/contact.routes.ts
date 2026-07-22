import { FastifyInstance } from 'fastify';
import { ContactController } from './contact.controller.js';

export async function contactRoutes(app: FastifyInstance) {
  const controller = new ContactController();

  app.post('/', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 hour',
      },
    },
    handler: controller.submit.bind(controller),
  });
}
