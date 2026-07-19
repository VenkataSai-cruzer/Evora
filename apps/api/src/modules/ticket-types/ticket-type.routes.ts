import { FastifyInstance } from 'fastify';
import { TicketTypeController } from './ticket-type.controller.js';

export async function ticketTypeRoutes(app: FastifyInstance) {
  const controller = new TicketTypeController();

  app.get('/:id', controller.getById.bind(controller));
}
