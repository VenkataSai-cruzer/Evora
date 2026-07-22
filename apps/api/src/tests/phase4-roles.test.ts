/**
 * Phase A — Role and permission tests
 * Tests that authorization middleware correctly enforces role boundaries.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock FastifyRequest / FastifyReply helpers ─────────────────
function makeRequest(role: string, body = {}, params = {}) {
  return {
    user: { id: 'user-1', name: 'Test', email: 'test@test.com', role },
    body,
    params,
    ip: '127.0.0.1',
    headers: {},
  } as any;
}

function makeReply() {
  const reply = {
    statusCode: 200,
    body: null as any,
    status(code: number) { this.statusCode = code; return this; },
    send(body: unknown) { this.body = body; return this; },
  };
  // Wrap methods as vi.fn() so we can assert calls
  const statusSpy = vi.fn((code: number) => { reply.statusCode = code; return reply; });
  const sendSpy = vi.fn((body: unknown) => { reply.body = body; return reply; });
  return {
    status: statusSpy,
    send: sendSpy,
    _reply: reply,
  } as any;
}

// ── Import after mocks defined ─────────────────────────────────
import '../tests/setup.js';
import { requireRole } from '../middleware/authorization.js';

describe('Phase A — requireRole middleware', () => {
  it('allows request when user has correct role', async () => {
    const req = makeRequest('ADMIN');
    const reply = makeReply();
    const middleware = requireRole('ADMIN');
    await middleware(req, reply);
    expect(reply.status).not.toHaveBeenCalled();
    expect(reply.send).not.toHaveBeenCalled();
  });

  it('blocks ATTENDEE from ADMIN route', async () => {
    const req = makeRequest('ATTENDEE');
    const reply = makeReply();
    // Make status() return the same reply object so .send() works on it
    reply.status.mockReturnValue(reply);
    const middleware = requireRole('ADMIN');
    await middleware(req, reply);
    expect(reply.status).toHaveBeenCalledWith(403);
  });

  it('blocks SCANNER from ORGANIZER route', async () => {
    const req = makeRequest('SCANNER');
    const reply = makeReply();
    const middleware = requireRole('ORGANIZER', 'ADMIN');
    await middleware(req, reply);
    expect(reply.status).toHaveBeenCalledWith(403);
  });

  it('blocks ORGANIZER from ADMIN route', async () => {
    const req = makeRequest('ORGANIZER');
    const reply = makeReply();
    const middleware = requireRole('ADMIN');
    await middleware(req, reply);
    expect(reply.status).toHaveBeenCalledWith(403);
  });

  it('allows SCANNER to access SCANNER route', async () => {
    const req = makeRequest('SCANNER');
    const reply = makeReply();
    const middleware = requireRole('ADMIN', 'SCANNER');
    await middleware(req, reply);
    expect(reply.status).not.toHaveBeenCalled();
  });

  it('returns 401 when user is not authenticated', async () => {
    const req = { user: undefined, body: {}, params: {}, ip: '127.0.0.1', headers: {} } as any;
    const reply = makeReply();
    const middleware = requireRole('ADMIN');
    await middleware(req, reply);
    expect(reply.status).toHaveBeenCalledWith(401);
  });
});
