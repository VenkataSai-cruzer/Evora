import { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { prisma } from '../infrastructure/database/prisma.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

/**
 * Require an authenticated session. Sets request.user if valid.
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const sessionToken = request.cookies?.session_token;
  if (!sessionToken) {
    return reply.status(401).send({ error: 'Authentication required' });
  }

  const tokenHash = hashToken(sessionToken);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    return reply.status(401).send({ error: 'Invalid or expired session' });
  }

  request.user = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
  };
}

/**
 * Optional authentication — sets request.user if valid, continues regardless.
 */
export async function optionalAuth(
  request: FastifyRequest,
  _reply: FastifyReply,
) {
  const sessionToken = request.cookies?.session_token;
  if (!sessionToken) return;

  const tokenHash = hashToken(sessionToken);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (session && !session.revokedAt && session.expiresAt > new Date()) {
    request.user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
    };
  }
}

/**
 * Hash a session token for secure database storage.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a cryptographically random session token.
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(48).toString('hex');
}
