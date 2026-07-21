import { FastifyInstance } from 'fastify';
import { prisma } from '../../infrastructure/database/prisma.js';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async (_request, _reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '0.1.0',
    };
  });

  app.get('/ready', async (_request, _reply) => {
    // Readiness check with database connectivity
    let dbOk = false;
    let dbLatency = 0;
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - start;
      dbOk = true;
    } catch {
      dbOk = false;
    }

    const status = dbOk ? 'ready' : 'degraded';
    const statusCode = dbOk ? 200 : 503;

    _reply.code(statusCode);

    return {
      status,
      timestamp: new Date().toISOString(),
      checks: {
        database: { ok: dbOk, latency: dbLatency },
      },
      environment: process.env.NODE_ENV || 'development',
    };
  });
}
