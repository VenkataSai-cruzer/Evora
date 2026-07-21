import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/authentication.js';
import { requireRole } from '../../middleware/authorization.js';
import { AdminController } from './admin.controller.js';

export async function adminRoutes(app: FastifyInstance) {
  const controller = new AdminController();

  // All admin routes require ADMIN role
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireRole('ADMIN'));

  // Seed staging data
  app.post('/seed', controller.seed.bind(controller));

  // Events
  app.get('/events', controller.listEvents.bind(controller));
  app.post('/events', controller.createEvent.bind(controller));
  app.get('/events/:id', controller.getEvent.bind(controller));
  app.patch('/events/:id', controller.updateEvent.bind(controller));
  app.post('/events/:id/duplicate', controller.duplicateEvent.bind(controller));

  // Event lifecycle
  app.post('/events/:id/publish', controller.publishEvent.bind(controller));
  app.post('/events/:id/pause-sales', controller.pauseSales.bind(controller));
  app.post('/events/:id/resume-sales', controller.resumeSales.bind(controller));
  app.post('/events/:id/close-sales', controller.closeSales.bind(controller));

  // Attendees
  app.get('/events/:id/attendees', controller.listAttendees.bind(controller));
  app.get('/events/:id/attendees/export', controller.exportAttendees.bind(controller));

  // Ticket types
  app.get('/events/:id/ticket-types', controller.listTicketTypes.bind(controller));
  app.post('/events/:id/ticket-types', controller.createTicketType.bind(controller));
  app.patch('/events/:id/ticket-types/:ticketTypeId', controller.updateTicketType.bind(controller));

  // Branding
  app.post('/events/:id/branding', controller.upsertBranding.bind(controller));

  // Partners
  app.get('/events/:id/partners', controller.listPartners.bind(controller));
  app.post('/events/:id/partners', controller.createPartner.bind(controller));
  app.delete('/events/:id/partners/:partnerId', controller.deletePartner.bind(controller));

  // Check-ins
  app.get('/events/:id/check-ins', controller.listCheckIns.bind(controller));
}
