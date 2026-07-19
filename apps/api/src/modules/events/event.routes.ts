import { FastifyInstance } from 'fastify';
import { EventController } from './event.controller.js';

export async function eventRoutes(app: FastifyInstance) {
  const controller = new EventController();

  app.get('/', controller.list.bind(controller));
  app.get('/:slug', controller.getBySlug.bind(controller));
}
