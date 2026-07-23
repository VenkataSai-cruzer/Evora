import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/authentication.js';
import { requireRole } from '../../middleware/authorization.js';
import { AdminController } from './admin.controller.js';

export async function adminRoutes(app: FastifyInstance) {
  const controller = new AdminController();

  // All admin routes require ADMIN role
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireRole('ADMIN'));

  // ── Events ──────────────────────────────────────────────
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

  // Attendees (admin sees ALL categories)
  app.get('/events/:id/attendees', controller.listAttendees.bind(controller));
  app.get('/events/:id/attendees/export', controller.exportAttendees.bind(controller));

  // Ticket types
  app.get('/events/:id/ticket-types', controller.listTicketTypes.bind(controller));
  app.post('/events/:id/ticket-types', controller.createTicketType.bind(controller));
  app.patch('/events/:id/ticket-types/:ticketTypeId', controller.updateTicketType.bind(controller));

  // Branding & partners
  app.post('/events/:id/branding', controller.upsertBranding.bind(controller));
  app.get('/events/:id/partners', controller.listPartners.bind(controller));
  app.post('/events/:id/partners', controller.createPartner.bind(controller));
  app.delete('/events/:id/partners/:partnerId', controller.deletePartner.bind(controller));

  // Check-ins
  app.get('/events/:id/check-ins', controller.listCheckIns.bind(controller));

  // Phase E: Complimentary tickets (ADMIN_ONLY)
  app.post('/events/:eventId/complimentary-tickets', controller.issueComplimentaryTickets.bind(controller));

  // Phase F: Assignments
  app.post('/events/:eventId/assign-organizer', controller.assignOrganizer.bind(controller));
  app.post('/events/:eventId/assign-scanner', controller.assignScanner.bind(controller));

  // ── Orders (Payment Verification) ───────────────────────
  app.get('/orders', controller.listOrders.bind(controller));
  app.get('/orders/:id', controller.getOrder.bind(controller));
  app.post('/orders/:id/approve', controller.approveOrder.bind(controller));
  app.post('/orders/:id/reject', controller.rejectOrder.bind(controller));
  app.post('/orders/:id/request-resubmission', controller.requestResubmission.bind(controller));

  // ── Users ────────────────────────────────────────────────
  app.get('/users', controller.listUsers.bind(controller));
  app.patch('/users/:userId/role', controller.updateUserRole.bind(controller));

  // ── Tickets ───────────────────────────────────────────────
  app.post('/tickets/:ticketNumber/cancel', controller.cancelTicket.bind(controller));

  // ── Audit Logs ───────────────────────────────────────────
  app.get('/audit-logs', controller.listAuditLogs.bind(controller));

  // ── Google Drive Test ─────────────────────────────────────
  app.get('/drive/test', controller.testDriveConnection.bind(controller));
}
