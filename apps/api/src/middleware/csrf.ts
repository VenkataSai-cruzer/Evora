import { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';

/**
 * Generate a CSRF token for the current session.
 */
export function generateCsrfToken(sessionToken: string): string {
  const secret = process.env.CSRF_SECRET || 'dev-csrf-secret';
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(sessionToken);
  return hmac.digest('hex');
}

/**
 * Validate CSRF token for mutation requests (POST, PUT, PATCH, DELETE).
 */
export async function csrfProtection(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;

  const sessionToken = request.cookies?.session_token;
  if (!sessionToken) return; // No session = no CSRF needed

  const headerToken = request.headers['x-csrf-token'] as string;
  if (!headerToken) {
    return reply.status(403).send({ error: 'CSRF token required' });
  }

  const expectedToken = generateCsrfToken(sessionToken);
  if (headerToken !== expectedToken) {
    return reply.status(403).send({ error: 'Invalid CSRF token' });
  }
}
