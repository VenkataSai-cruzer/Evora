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
  // Verify font asset exists
  const fontFile = path.join(sourceDir, 'fonts', 'Inter-Regular.ttf');
  try {
    await access(fontFile, constants.R_OK);
    const stats = await stat(fontFile);
    console.log(`[copy-assets] Found font: ${fontFile} (${stats.size} bytes)`);
  } catch {
    console.error(`[copy-assets] ERROR: Bundled font not found at ${fontFile}`);
    console.error('[copy-assets] HINT: Place Inter-Regular.ttf in apps/api/assets/fonts/');
    process.exit(1);
  }

  // Create destination and copy recursively
  await mkdir(destDir, { recursive: true });
  await cp(sourceDir, destDir, { recursive: true, force: true });

  // Verify destination font
  const destFont = path.join(destDir, 'fonts', 'Inter-Regular.ttf');
  try {
    await access(destFont, constants.R_OK);
    const stats = await stat(destFont);
    console.log(`[copy-assets] Copied font to: ${destFont} (${stats.size} bytes)`);
    console.log('[copy-assets] ✅ Asset copy complete');
  } catch {
    console.error(`[copy-assets] ERROR: Failed to verify copied font at ${destFont}`);
    process.exit(1);
  }
}

copyAssets().catch((err) => {
  console.error('[copy-assets] Fatal error:', err);
  process.exit(1);
});
