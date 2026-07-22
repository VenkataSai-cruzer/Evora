import { buildApp } from './app.js';
import { validateStartup } from './config/startup-validation.js';

const PORT = parseInt(process.env.PORT || '10000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  // ── Run startup validation before accepting traffic ──
  try {
    const result = await validateStartup();
    if (result.valid) {
      console.log('[Startup] All checks passed');
    }
  } catch (err) {
    console.error('[Startup] Validation failed — aborting startup');
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }

  const app = await buildApp();

  // Graceful shutdown
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      app.log.info(`Received ${signal}, shutting down...`);
      await app.close();
      await prismaDisconnect();
      process.exit(0);
    });
  }

  try {
    await app.listen({ host: HOST, port: PORT });
    app.log.info(`Server running at http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err, 'Failed to start server');
    process.exit(1);
  }
}

// Critical: ensure Prisma disconnects on shutdown
async function prismaDisconnect() {
  try {
    const { prisma } = await import('./infrastructure/database/prisma.js');
    await prisma.$disconnect();
  } catch {
    // ok
  }
}

start();
