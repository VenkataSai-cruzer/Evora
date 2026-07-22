import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/authentication.js';
import { requireRole } from '../../middleware/authorization.js';
import { OrganizerController } from './organizer.controller.js';

export async function organizerRoutes(app: FastifyInstance) {
  const controller = new OrganizerController();

  // All organizer routes require ORGANIZER or ADMIN role
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireRole('ORGANIZER', 'ADMIN'));

  // My assigned events
  app.get('/events', controller.listMyEvents.bind(controller));
  app.get('/events/:eventId', controller.getEvent.bind(controller));

  // Attendees — ALWAYS excludes ADMIN_ONLY
  app.get('/events/:eventId/attendees', controller.listAttendees.bind(controller));
  app.get('/events/:eventId/attendees/export', controller.exportAttendees.bind(controller));

  // Analytics — safe aggregated view only
  app.get('/events/:eventId/analytics', controller.getAnalytics.bind(controller));
}
