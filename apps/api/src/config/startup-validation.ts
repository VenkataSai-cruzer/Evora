import { access, constants } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { prisma } from '../infrastructure/database/prisma.js';

export interface ValidationResult {
  valid: boolean;
  checks: Array<{ name: string; status: 'pass' | 'fail'; message?: string }>;
}

/**
 * Validate that the Ticket.png template exists and is readable.
 */
async function validateTicketTemplate(): Promise<{ name: string; status: 'pass' | 'fail'; message?: string }> {
  const templatePath = resolve(process.cwd(), 'assets', 'Ticket.png');
  try {
    await access(templatePath, constants.R_OK);
    const metadata = await sharp(templatePath).metadata();
    if (!metadata.width || !metadata.height) {
      return { name: 'ticket_template', status: 'fail', message: 'Ticket template has invalid dimensions' };
    }
    return { name: 'ticket_template', status: 'pass' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { name: 'ticket_template', status: 'fail', message: `Ticket template missing or unreadable: ${msg}` };
  }
}

/**
 * Validate critical environment variables.
 */
function validateEnvironment(): { name: string; status: 'pass' | 'fail'; message?: string } {
  const criticalVars = ['DATABASE_URL', 'SESSION_SECRET', 'CSRF_SECRET', 'QR_SECRET'];
  const warnings: string[] = [];

  for (const v of criticalVars) {
    const value = process.env[v];
    if (!value) {
      return { name: 'environment', status: 'fail', message: `Missing required env var: ${v}` };
    }
    if (v === 'SESSION_SECRET' && value === 'dev-secret-change-in-production') {
      warnings.push(`${v} is using default dev value`);
    }
    if (v === 'QR_SECRET' && value === 'dev-qr-secret-change-in-production') {
      warnings.push(`${v} is using default dev value`);
    }
  }

  // EMAIL_DEV_REDIRECT must never be enabled in production
  if (process.env.EMAIL_DEV_REDIRECT === 'true' && process.env.NODE_ENV === 'production') {
    return { name: 'environment', status: 'fail', message: 'EMAIL_DEV_REDIRECT=true is forbidden when NODE_ENV=production' };
  }

  if (warnings.length > 0) {
    return { name: 'environment', status: 'pass', message: `Warnings: ${warnings.join('; ')}` };
  }
  return { name: 'environment', status: 'pass' };
}

/**
 * Validate database connectivity.
 */
async function validateDatabase(): Promise<{ name: string; status: 'pass' | 'fail'; message?: string }> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { name: 'database', status: 'pass' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { name: 'database', status: 'fail', message: `Database unreachable: ${msg}` };
  }
}

/**
 * Run all startup validations.
 * Throws if critical checks fail — deployment must abort.
 */
export async function validateStartup(): Promise<ValidationResult> {
  const checks: ValidationResult['checks'] = [];

  // Run all checks
  const [template, env, db] = await Promise.all([
    validateTicketTemplate(),
    Promise.resolve(validateEnvironment()),
    validateDatabase(),
  ]);

  checks.push(template, env, db);

  const valid = checks.every((c) => c.status === 'pass');

  if (!valid) {
    const failures = checks.filter((c) => c.status === 'fail');
    for (const f of failures) {
      console.error(`[Startup] FAIL: ${f.name} — ${f.message}`);
    }
    // Critical failures must prevent deployment
    throw new Error(
      `Startup validation failed:\n${failures.map((f) => `  - ${f.name}: ${f.message}`).join('\n')}`,
    );
  }

  return { valid, checks };
}
