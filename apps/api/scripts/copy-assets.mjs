/**
 * Cross-platform asset copy script.
 * Copies apps/api/assets/ into apps/api/dist/assets/ after TypeScript compilation.
 * Works on Windows, Linux, and macOS — no Unix-only cp command needed.
 */
import { cp, mkdir, access, stat, constants } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const apiRoot = path.resolve(currentDir, '..');

const sourceDir = path.join(apiRoot, 'assets');
const destDir = path.join(apiRoot, 'dist', 'assets');

async function copyAssets() {
  // Verify source asset exists
  const ticketPng = path.join(sourceDir, 'Ticket.png');
  try {
    await access(ticketPng, constants.R_OK);
    const stats = await stat(ticketPng);
    console.log(`[copy-assets] Found source: ${ticketPng} (${stats.size} bytes)`);
  } catch {
    console.error(`[copy-assets] ERROR: Source asset not found at ${ticketPng}`);
    console.error('[copy-assets] HINT: Place Ticket.png in apps/api/assets/');
    process.exit(1);
  }

  // Create destination and copy recursively
  await mkdir(destDir, { recursive: true });
  await cp(sourceDir, destDir, { recursive: true, force: true });

  // Verify destination
  const destTicket = path.join(destDir, 'Ticket.png');
  try {
    await access(destTicket, constants.R_OK);
    const stats = await stat(destTicket);
    console.log(`[copy-assets] Copied to: ${destTicket} (${stats.size} bytes)`);
    console.log('[copy-assets] ✅ Asset copy complete');
  } catch {
    console.error(`[copy-assets] ERROR: Failed to verify copied asset at ${destTicket}`);
    process.exit(1);
  }
}

copyAssets().catch((err) => {
  console.error('[copy-assets] Fatal error:', err);
  process.exit(1);
});
