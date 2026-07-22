import { FastifyInstance } from 'fastify';
import { prisma } from '../../infrastructure/database/prisma.js';
import { access, constants } from 'node:fs/promises';
import { resolve } from 'node:path';

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
    // Readiness check with database connectivity and template availability
    let dbOk = false;
    let dbLatency = 0;
    let templateOk = false;
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - start;
      dbOk = true;
    } catch {
      dbOk = false;
    }

    try {
      await access(resolve(process.cwd(), 'assets', 'Ticket.png'), constants.R_OK);
      templateOk = true;
    } catch {
      templateOk = false;
    }

    const allOk = dbOk && templateOk;
    const status = allOk ? 'ready' : 'degraded';
    const statusCode = allOk ? 200 : 503;

    _reply.code(statusCode);

    return {
      status,
      timestamp: new Date().toISOString(),
      checks: {
        database: { ok: dbOk, latency: dbLatency },
        ticketTemplate: { ok: templateOk },
      },
      environment: process.env.NODE_ENV || 'development',
    };
  });
}
