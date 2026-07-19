/**
 * PDF and PNG pass generator using Playwright for server-side rendering.
 *
 * Requires Playwright Chromium browser to be installed:
 *   npx playwright install chromium
 *
 * Falls back gracefully if the browser is not installed.
 */

import { createLogger } from '@/lib/logger';
import { generatePassHtml, generatePassFilename } from '@/lib/pass-generator';
import type { PassData } from '@/lib/pass-generator';

const log = createLogger('lib/pdf-generator');

let chromium: any = null;
let playwrightAvailable = false;

try {
  // Dynamic import — Playwright is a devDependency and may not be in the production build
  // eslint-disable-next-line
  chromium = require('@playwright/test').chromium;
  playwrightAvailable = true;
} catch {
  log.warn('Playwright not available. PDF/PNG generation will fall back to HTML.');
}

export interface GenerateResult {
  buffer: Buffer;
  contentType: string;
  filename: string;
  realFormat: boolean; // true = actual PDF/PNG, false = HTML fallback
}

/**
 * Generate a real PDF pass using Playwright.
 */
export async function generatePdfPass(
  passData: PassData,
): Promise<GenerateResult> {
  const html = generatePassHtml(passData);
  const filename = generatePassFilename(passData.eventTitle, passData.ticketNumber, 'pdf');

  if (!playwrightAvailable || !chromium) {
    log.warn({ ticketNumber: passData.ticketNumber }, 'Playwright unavailable — returning HTML instead of PDF');
    return {
      buffer: Buffer.from(html, 'utf-8'),
      contentType: 'text/html; charset=utf-8',
      filename,
      realFormat: false,
    };
  }

  let browser: any = null;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: 'networkidle' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      printBackground: true,
      displayHeaderFooter: false,
    });

    return {
      buffer: Buffer.from(pdfBuffer),
      contentType: 'application/pdf',
      filename,
      realFormat: true,
    };
  } catch (error) {
    log.error({ error, ticketNumber: passData.ticketNumber }, 'PDF generation failed — falling back to HTML');
    return {
      buffer: Buffer.from(html, 'utf-8'),
      contentType: 'text/html; charset=utf-8',
      filename: filename.replace('.pdf', '.html'),
      realFormat: false,
    };
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

/**
 * Generate a real PNG pass image using Playwright.
 */
export async function generatePngPass(
  passData: PassData,
): Promise<GenerateResult> {
  const html = generatePassHtml(passData);
  const filename = generatePassFilename(passData.eventTitle, passData.ticketNumber, 'png');

  if (!playwrightAvailable || !chromium) {
    log.warn({ ticketNumber: passData.ticketNumber }, 'Playwright unavailable — returning HTML instead of PNG');
    return {
      buffer: Buffer.from(html, 'utf-8'),
      contentType: 'text/html; charset=utf-8',
      filename,
      realFormat: false,
    };
  }

  let browser: any = null;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 600, height: 900 },
    });

    await page.setContent(html, { waitUntil: 'networkidle' });

    const screenshotBuffer = await page.screenshot({
      type: 'png',
      fullPage: true,
    });

    return {
      buffer: screenshotBuffer,
      contentType: 'image/png',
      filename,
      realFormat: true,
    };
  } catch (error) {
    log.error({ error, ticketNumber: passData.ticketNumber }, 'PNG generation failed — falling back to HTML');
    return {
      buffer: Buffer.from(html, 'utf-8'),
      contentType: 'text/html; charset=utf-8',
      filename: filename.replace('.png', '.html'),
      realFormat: false,
    };
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
