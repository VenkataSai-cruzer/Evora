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
 * Resolve the session token from cookie OR X-Session-Token header.
 *
 * Cookie-based auth works on desktop (third-party cookies allowed).
 * Header-based auth (X-Session-Token) works on mobile (third-party cookies blocked).
 */
function resolveSessionToken(request: FastifyRequest): string | null {
  // 1. Try cookie first (desktop path)
  const cookieToken = request.cookies?.session_token;
  if (cookieToken) return cookieToken;

  // 2. Try X-Session-Token header (mobile path, see api-client.ts)
  const headerToken = request.headers['x-session-token'] as string | undefined;
  if (headerToken) return headerToken;

  return null;
}

/**
 * Look up a session by token hash and return the user if valid.
 */
async function resolveSession(token: string) {
  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
  };
}

/**
 * Require an authenticated session. Sets request.user if valid.
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const sessionToken = resolveSessionToken(request);
  if (!sessionToken) {
    return reply.status(401).send({ error: 'Authentication required' });
  }

  const user = await resolveSession(sessionToken);
  if (!user) {
    return reply.status(401).send({ error: 'Invalid or expired session' });
  }

  request.user = user;
}

/**
 * Optional authentication — sets request.user if valid, continues regardless.
 */
export async function optionalAuth(
  request: FastifyRequest,
  _reply: FastifyReply,
) {
  const sessionToken = resolveSessionToken(request);
  if (!sessionToken) return;

  const user = await resolveSession(sessionToken);
  if (user) {
    request.user = user;
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
