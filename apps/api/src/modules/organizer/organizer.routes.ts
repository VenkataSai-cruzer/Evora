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

  // ── Phase 4.3: Payment Verification (Organizer-scoped) ──
  // All endpoints only return orders for events this organizer is assigned to.
  // Backend enforces event-scoping via Prisma queries — not just frontend.

  // List pending verifications for assigned events
  app.get('/verifications', controller.listVerifications.bind(controller));

  // Single order detail with full proof and history
  app.get('/verifications/:orderNumber', controller.getVerificationOrder.bind(controller));

  // Approve payment (reuses finalizeApprovedOrder service)
  app.post('/verifications/:orderNumber/approve', controller.approveVerification.bind(controller));

  // Reject payment with reason
  app.post('/verifications/:orderNumber/reject', controller.rejectVerification.bind(controller));

  // Request resubmission from user
  app.post('/verifications/:orderNumber/request-resubmission', controller.requestVerificationResubmission.bind(controller));
}
