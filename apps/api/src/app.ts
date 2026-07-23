import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import formbody from '@fastify/formbody';
import multipart from '@fastify/multipart';

import { errorHandler } from './middleware/error-handler.js';
import { csrfProtection } from './middleware/csrf.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { eventRoutes } from './modules/events/event.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { organizerRoutes } from './modules/organizer/organizer.routes.js';
import { orderRoutes } from './modules/orders/order.routes.js';
import { ticketRoutes } from './modules/tickets/ticket.routes.js';
import { checkInRoutes } from './modules/check-in/check-in.routes.js';
import { uploadRoutes } from './modules/uploads/upload.routes.js';
import { templateRoutes } from './modules/templates/template.routes.js';
import { ticketTypeRoutes } from './modules/ticket-types/ticket-type.routes.js';
import { userRoutes } from './modules/users/user.routes.js';
import { paymentRoutes } from './modules/payments/payment.routes.js';
import { testPaymentRoutes } from './modules/payments/payment.test.routes.js';
import { contactRoutes } from './modules/contact/contact.routes.js';
import { seedStagingData } from './modules/admin/seed.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport:
        process.env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
    // Trust proxy — required when behind Railway load balancer
    trustProxy: true,
  });

  // ── Plugins ──────────────────────────────────────────

  const ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://evora.7notes.workers.dev',
    ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()) : []),
  ];

  await app.register(cors, {
    origin: (origin: string | undefined, cb: (err: Error | null, allow: boolean) => void) => {
      // Allow requests with no origin (server-to-server, curl, etc.)
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        return cb(null, true);
      }
      return cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  });

  await app.register(cookie, {
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  });

  await app.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
    keyGenerator: (request) => request.ip,
  });

  await app.register(formbody);

  // Register multipart for payment proof uploads (max 8MB to allow validation before rejection)
  await app.register(multipart, {
    limits: {
      fileSize: 8 * 1024 * 1024, // 8MB hard limit (validation enforces 5MB soft limit)
      files: 1,
      fields: 10,
    },
  });

  // ── Security Headers (applied to all responses) ───────
  app.addHook('onSend', async (_request, reply, payload) => {
    reply
      .header('X-Content-Type-Options', 'nosniff')
      .header('X-Frame-Options', 'DENY')
      .header('Referrer-Policy', 'strict-origin-when-cross-origin')
      .header('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()')
      .header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
      .header(
        'Content-Security-Policy',
        [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob:",
          "font-src 'self' data:",
          "connect-src 'self' https://*.7notes.workers.dev https://*.railway.app",
          "frame-ancestors 'none'",
        ].join('; '),
      );
    return payload;
  });

  // ── Custom error handler ─────────────────────────────
  app.setErrorHandler(errorHandler);

  // ── CSRF Protection (for mutation requests) ──────────
  app.addHook('preHandler', csrfProtection);

  // ── API Routes ───────────────────────────────────────

  await app.register(healthRoutes, { prefix: '/api/v1' });
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(eventRoutes, { prefix: '/api/v1/events' });
  await app.register(orderRoutes, { prefix: '/api/v1/orders' });
  await app.register(ticketRoutes, { prefix: '/api/v1/tickets' });
  await app.register(checkInRoutes, { prefix: '/api/v1/check-in' });
  await app.register(uploadRoutes, { prefix: '/api/v1/uploads' });
  await app.register(templateRoutes, { prefix: '/api/v1/templates' });
  await app.register(ticketTypeRoutes, { prefix: '/api/v1/ticket-types' });
  await app.register(userRoutes, { prefix: '/api/v1/users' });
  await app.register(adminRoutes, { prefix: '/api/v1/admin' });
  await app.register(organizerRoutes, { prefix: '/api/v1/organizer' });
  await app.register(paymentRoutes, { prefix: '/api/v1/payments' });
  await app.register(contactRoutes, { prefix: '/api/v1/contact' });

  // ── Seed Endpoint (staging only) ────────────────────
  app.post('/api/v1/admin/seed', async (request, reply) => {
    const seedKey = (request.headers as Record<string, string>)['x-seed-key'];
    const expectedKey = process.env.SEED_API_KEY;
    if (expectedKey && seedKey !== expectedKey) {
      return reply.status(401).send({ error: 'Invalid seed key' });
    }
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
      return reply.status(403).send({ error: 'Seed endpoint is disabled in production' });
    }
    try {
      const results = await seedStagingData();
      return reply.send({ message: 'Staging data seeded successfully', records: results });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown seed error';
      return reply.status(500).send({ error: 'Seed failed', details: message });
    }
  });

  // ── Test Payment (staging only) ─────────────────────
  await app.register(testPaymentRoutes, { prefix: '/api/v1' });

  return app;
}
