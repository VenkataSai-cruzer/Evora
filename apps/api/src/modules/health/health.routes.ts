import { FastifyInstance } from 'fastify';

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
    // Basic readiness check — could add DB ping here
    return { status: 'ready' };
  });
}
