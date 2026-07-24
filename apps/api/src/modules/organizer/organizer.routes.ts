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
  app.post('/events/:eventId/mark-sold-out', controller.markSoldOut.bind(controller));
  app.post('/events/:eventId/reopen-booking', controller.reopenBooking.bind(controller));

  // Attendees — ALWAYS excludes ADMIN_ONLY
  app.get('/events/:eventId/attendees', controller.listAttendees.bind(controller));
  app.get('/events/:eventId/attendees/export', controller.exportAttendees.bind(controller));

  // Analytics — safe aggregated view only
  app.get('/events/:eventId/analytics', controller.getAnalytics.bind(controller));

  // ── Organizer Stats (event-scoped, no global data) ───────
  app.get('/stats', controller.getStats.bind(controller));

  // ── Orders (event-scoped) ───────────────────────────────
  // Organizer can VIEW, APPROVE, and REJECT orders for assigned events.
  app.get('/orders', controller.listVerifications.bind(controller));
  app.get('/orders/:orderNumber', controller.getVerificationOrder.bind(controller));
  app.post('/orders/:orderNumber/approve', controller.approveOrder.bind(controller));
  app.post('/orders/:orderNumber/reject', controller.rejectOrder.bind(controller));
  app.post('/orders/:orderNumber/request-resubmission', controller.requestVerificationResubmission.bind(controller));
}
