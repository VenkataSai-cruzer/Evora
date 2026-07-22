import { FastifyInstance } from 'fastify';
import { ContactController } from './contact.controller.js';

export async function contactRoutes(app: FastifyInstance) {
  const controller = new ContactController();

  app.post('/', controller.submit.bind(controller));
}
