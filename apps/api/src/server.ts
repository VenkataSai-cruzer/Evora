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
    const version = process.env.APP_VERSION || '0.1.0';
    const sha = process.env.RAILWAY_GIT_COMMIT_SHA || process.env.SOURCE_VERSION || 'unknown';
    const env = process.env.NODE_ENV || 'development';
    const prismaVersion = '5.22.0';
    // Dynamic version reading would use: import { prismaVersion } from '@prisma/client';
    // but the enum export requires a newer @prisma/client version.
    // Update this string when Prisma is upgraded.

    // Structured log entry for log aggregators
    app.log.info({ version, sha, env, prismaVersion, host: HOST, port: PORT }, 'Server started');

    // Visible startup banner for deployment verification in logs
    const border = '='.repeat(56);
    console.log(`\n${border}`);
    console.log(`  Evora API`);
    console.log(`  Version:    ${version} (${sha})`);
    console.log(`  Env:        ${env}`);
    console.log(`  Prisma:     ${prismaVersion}`);
    console.log(`  Listening:  ${HOST}:${PORT}`);
    console.log(`${border}\n`);
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
