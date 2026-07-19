import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import formbody from '@fastify/formbody';

import { errorHandler } from './middleware/error-handler.js';
import { csrfProtection } from './middleware/csrf.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { eventRoutes } from './modules/events/event.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { orderRoutes } from './modules/orders/order.routes.js';
import { ticketRoutes } from './modules/tickets/ticket.routes.js';
import { checkInRoutes } from './modules/check-in/check-in.routes.js';
import { uploadRoutes } from './modules/uploads/upload.routes.js';
import { templateRoutes } from './modules/templates/template.routes.js';
import { ticketTypeRoutes } from './modules/ticket-types/ticket-type.routes.js';
import { userRoutes } from './modules/users/user.routes.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport:
        process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  });

  // ── Plugins ──────────────────────────────────────────

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  });

  await app.register(cookie, {
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (request) => {
      return request.ip;
    },
  });

  await app.register(formbody);

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

  return app;
}
