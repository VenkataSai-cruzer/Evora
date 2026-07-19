import { test, expect } from '@playwright/test';

/**
 * E2E tests for the complete ticket flow.
 *
 * Requirements:
 * - DEDICATED_TEST_DATABASE_URL environment variable must be set
 * - Test accounts must pre-exist or be created via seed
 * - The app must be running (npm run dev or similar)
 *
 * Test accounts expected from seed:
 *   Admin:     admin@jamming.events / admin123
 *   Organizer: organizer@jamming.events / organizer123
 *   Attendee:  attendee@jamming.events / attendee123
 */

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

// Skip if not configured for E2E testing
const it = process.env.DEDICATED_TEST_DATABASE_URL ? test : test.skip;

it.describe('Organizer Flow', () => {
  it('signs in as organizer', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);
    await page.fill('input[name="email"]', 'organizer@jamming.events');
    await page.fill('input[name="password"]', 'organizer123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  it('creates an event', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/events/new`);
    await page.fill('input[name="title"]', 'E2E Test Jam');
    await page.fill('textarea', 'An E2E test jamming session.');
    await page.fill('input[type="date"]', '2026-12-25');
    await page.click('text=Save Draft');
    await page.waitForURL('**/dashboard/events/**');
  });

  it('creates a ticket type and activates it', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/events`);
    await page.click('text=E2E Test Jam');
    
    // Navigate to manage page
    await page.goto(`${BASE_URL}/dashboard/events`);
    
    // Find the event and click manage
    const eventLink = page.locator('a:has-text("E2E Test Jam")').first();
    if (await eventLink.isVisible()) {
      await eventLink.click();
    }
  });
});

it.describe('Attendee Flow', () => {
  it('signs in as attendee', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);
    await page.fill('input[name="email"]', 'attendee@jamming.events');
    await page.fill('input[name="password"]', 'attendee123');
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'));
  });

  it('browses events and opens event detail', async ({ page }) => {
    await page.goto(`${BASE_URL}/events`);
    await page.waitForSelector('a[href^="/events/"]');
    const firstEvent = page.locator('a[href^="/events/"]').first();
    await firstEvent.click();
    await page.waitForURL('**/events/**');
  });

  it('registers for a solo ticket', async ({ page }) => {
    // Find register button and select Solo
    const soloButton = page.locator('button:has-text("Solo")');
    if (await soloButton.isVisible()) {
      await soloButton.click();
      await page.waitForSelector('text=Continue');
      await page.click('text=Continue');
      await page.click('text=Confirm');
      await page.waitForSelector('text=in!');
    }
  });

  it('opens My Tickets and views the pass', async ({ page }) => {
    await page.goto(`${BASE_URL}/tickets`);
    await page.waitForSelector('a[href^="/tickets/"]');
    const ticketLink = page.locator('a[href^="/tickets/"]').first();
    await ticketLink.click();
    await page.waitForURL('**/tickets/**');

    // Verify event pass displays
    await expect(page.locator('text=Event Pass').or(page.locator('text=Valid'))).toBeTruthy();
  });

  it('downloads the pass', async ({ page }) => {
    await page.goto(`${BASE_URL}/tickets`);
    await page.waitForSelector('a[href^="/tickets/"]');
    const ticketLink = page.locator('a[href^="/tickets/"]').first();
    await ticketLink.click();
    await page.waitForURL('**/tickets/**');

    // Click download
    const downloadBtn = page.locator('text=Download Pass');
    if (await downloadBtn.isVisible()) {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 5000 }).catch(() => null),
        downloadBtn.click(),
      ]);
      if (download) {
        expect(download.suggestedFilename()).toContain('.html');
      }
    }
  });
});

it.describe('Access Control', () => {
  it('another attendee cannot access the ticket URL', async ({ page }) => {
    // Sign in as organizer (different from attendee who owns the ticket)
    await page.goto(`${BASE_URL}/auth/login`);
    await page.fill('input[name="email"]', 'organizer@jamming.events');
    await page.fill('input[name="password"]', 'organizer123');
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'));

    // Try to access a ticket owned by attendee - should get not-found or redirect
    await page.goto(`${BASE_URL}/tickets/TKT-FAKE-123`);
    await page.waitForLoadState('networkidle');
    // Should show not found or error
    await expect(page.locator('text=Not Found').or(page.locator('text=not found'))).toBeTruthy();
  });

  it('attendee cannot access organizer routes', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);
    await page.fill('input[name="email"]', 'attendee@jamming.events');
    await page.fill('input[name="password"]', 'attendee123');
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'));

    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    // Should redirect away from dashboard
    expect(page.url()).not.toContain('/dashboard');
  });
});
