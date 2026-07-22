import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../infrastructure/database/prisma.js';

/**
 * Require the authenticated user to have one of the specified roles.
 * Must be used after requireAuth middleware.
 */
export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    if (!roles.includes(request.user.role)) {
      return reply.status(403).send({
        error: 'Insufficient permissions',
        requiredRoles: roles,
        userRole: request.user.role,
      });
    }
  };
}

/**
 * Require the authenticated user to be the owner of a resource
 * or have an admin role.
 */
export function requireOwnership(getOwnerId: (request: FastifyRequest) => string | undefined) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    if (request.user.role === 'ADMIN') return;

    const ownerId = getOwnerId(request);
    if (!ownerId || ownerId !== request.user.id) {
      return reply.status(403).send({ error: 'Access denied' });
    }
  };
}

/**
 * Require the authenticated user to be an ORGANIZER assigned to the event,
 * or an ADMIN.
 * Route must have :eventId or :id param that is the event ID.
 */
export function requireOrganizerForEvent(paramName: string = 'eventId') {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    if (request.user.role === 'ADMIN') return;

    if (request.user.role !== 'ORGANIZER') {
      return reply.status(403).send({ error: 'Organizer access required' });
    }

    const params = request.params as Record<string, string>;
    const eventId = params[paramName] || params['id'];

    if (!eventId) {
      return reply.status(400).send({ error: 'Event ID required' });
    }

    const assignment = await prisma.organizerAssignment.findUnique({
      where: { organizerId_eventId: { organizerId: request.user.id, eventId } },
    });

    if (!assignment) {
      return reply.status(403).send({ error: 'Not assigned to this event' });
    }
  };
}

/**
 * Require the authenticated user to be a SCANNER assigned to the event,
 * or an ADMIN.
 */
export function requireScannerForEvent() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    if (request.user.role === 'ADMIN') return;

    if (request.user.role !== 'SCANNER') {
      return reply.status(403).send({ error: 'Scanner access required' });
    }

    const body = request.body as Record<string, string> | undefined;
    const eventId = body?.eventId;

    if (!eventId) {
      // No event ID in body — allow the check-in controller to validate further
      return;
    }

    const assignment = await prisma.scannerAssignment.findUnique({
      where: { scannerId_eventId: { scannerId: request.user.id, eventId } },
      select: { isActive: true },
    });

    if (!assignment || !assignment.isActive) {
      return reply.status(403).send({ error: 'Not assigned to this event or assignment inactive' });
    }
  };
}
