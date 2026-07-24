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
 *
 * CSRF is enforced in ALL environments — production, staging, and local.
 * This ensures we test the same security in staging as in production.
 *
 * The ONLY exception is the test-payment endpoint, which validates
 * its own safety requirements internally.
 */
/**
 * Resolve session token from cookie or X-Session-Token header.
 * Must match the logic in authentication.ts.
 */
function resolveSessionToken(request: FastifyRequest): string | null {
  const cookieToken = request.cookies?.session_token;
  if (cookieToken) return cookieToken;
  const headerToken = request.headers['x-session-token'] as string | undefined;
  if (headerToken) return headerToken;
  return null;
}

export async function csrfProtection(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;

  // CSRF is enforced for ALL mutation endpoints, including test-payment.
  // The test-payment endpoint independently validates its own staging-only
  // feature gates (ENABLE_TEST_PAYMENT, NODE_ENV checks).

  const sessionToken = resolveSessionToken(request);
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
