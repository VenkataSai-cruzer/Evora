import { FastifyRequest, FastifyReply } from 'fastify';

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
