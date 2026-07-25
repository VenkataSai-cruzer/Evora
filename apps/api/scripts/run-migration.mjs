/**
 * Migration runner — wraps `prisma migrate deploy` with:
 *   1. Safely appends ?pgbouncer=true to DATABASE_URL (handles existing params)
 *   2. Runs the Prisma migration
 *
 * This avoids fragile shell piping that failed pre-deploy on Railway.
 */
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_DIR = resolve(__dirname, '..');
const SCHEMA = resolve(API_DIR, 'prisma', 'schema.prisma');

// ── 1. Build the PgBouncer-safe connection URL ────────────────
const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) {
  console.error('[run-migration] FATAL: DATABASE_URL is not set');
  process.exit(1);
}

// If URL already has query params, append with &, otherwise with ?
const separator = rawUrl.includes('?') ? '&' : '?';
const dbUrl = rawUrl.includes('pgbouncer=true')
  ? rawUrl
  : `${rawUrl}${separator}pgbouncer=true`;

console.log('[run-migration] DATABASE_URL ready for migration');

// ── 2. Run prisma migrate deploy ──────────────────────────────
console.log('[run-migration] Running prisma migrate deploy...');
try {
  execSync(
    `npx prisma migrate deploy --schema="${SCHEMA}"`,
    {
      cwd: API_DIR,
      stdio: 'inherit',
      timeout: 120_000,
      env: { ...process.env, DATABASE_URL: dbUrl },
    },
  );
  console.log('[run-migration] ✅ Migration complete');
} catch (err) {
  console.error('[run-migration] ❌ Migration failed');
  process.exit(1);
}
