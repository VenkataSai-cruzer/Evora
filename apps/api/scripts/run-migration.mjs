/**
 * Migration runner — wraps `prisma migrate deploy` with:
 *   1. Safely appends ?pgbouncer=true to DATABASE_URL (handles existing params)
 *   2. Kills idle connections first to free pooler slots
 *   3. Runs the Prisma migration
 *
 * This replaces complex shell-level URL manipulation in railway.toml.
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
const dbUrl = `${rawUrl}${separator}pgbouncer=true`;

console.log('[run-migration] DATABASE_URL set with ?pgbouncer=true');

// ── 2. Kill idle connections to free up pooler slots ──────────
// This runs in a subprocess that auto-exits, so any connection leak
// from this step is self-contained.
try {
  execSync(
    `echo "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND pid <> pg_backend_pid() AND usename = current_user;" | npx -y prisma db execute --schema="${SCHEMA}" --stdin`,
    {
      cwd: API_DIR,
      stdio: 'inherit',
      timeout: 10_000,
      env: { ...process.env, DATABASE_URL: dbUrl },
    },
  );
  console.log('[run-migration] Idle connections cleaned up');
} catch {
  // Non-fatal — the migration might still succeed if enough slots are free
  console.warn('[run-migration] Connection cleanup failed (pool may be full). Proceeding with migration...');
}

// ── 3. Run prisma migrate deploy ──────────────────────────────
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
