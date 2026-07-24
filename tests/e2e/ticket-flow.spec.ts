import { test, expect, type Page } from '@playwright/test';

async function mockAuthenticatedUser(page: Page) {
  await page.route('**/api/v1/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 'user-1',
          name: 'Playwright User',
          email: 'user@example.com',
          role: 'ATTENDEE',
        },
      }),
    });
  });
}

test.describe('/tickets page', () => {
  test('shows issued tickets to the user', async ({ page }) => {
    await mockAuthenticatedUser(page);
    await page.route('**/api/v1/tickets', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tickets: [
            {
              id: 'ticket-1',
              ticketNumber: 'TKT-2026-001',
              status: 'CONFIRMED',
              event: {
                id: 'event-1',
                title: 'Evora Fest',
                slug: 'evora-fest',
                startAt: '2026-12-25T18:00:00.000Z',
                venueName: 'Main Arena',
                venueAddress: 'Hyderabad',
                posterObjectKey: null,
              },
              ticketType: { name: 'General', price: 1000 },
              checkIn: null,
              order: { orderNumber: 'ORD-001', status: 'CONFIRMED' },
              attendee: { attendeeName: 'Owner' },
            },
          ],
        }),
      });
    });

    await page.goto('/tickets');

    await expect(page.getByRole('heading', { name: 'My Tickets' })).toBeVisible();
    await expect(page.getByText('Evora Fest')).toBeVisible();
    await expect(page.getByText('Active (1)')).toBeVisible();
    await expect(page.getByText('TKT-2026-001')).toBeVisible();
  });

  test('shows pending-order contextual message when no issued tickets exist', async ({ page }) => {
    await mockAuthenticatedUser(page);
    await page.route('**/api/v1/tickets', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tickets: [
            {
              id: 'ticket-2',
              ticketNumber: 'TKT-2026-002',
              status: 'CANCELLED',
              event: {
                id: 'event-1',
                title: 'Evora Fest',
                slug: 'evora-fest',
                startAt: '2026-12-25T18:00:00.000Z',
                venueName: 'Main Arena',
                venueAddress: 'Hyderabad',
                posterObjectKey: null,
              },
              ticketType: { name: 'General', price: 1000 },
              checkIn: null,
              order: { orderNumber: 'ORD-002', status: 'PENDING_VERIFICATION' },
              attendee: { attendeeName: 'Owner' },
            },
          ],
        }),
      });
    });

    await page.goto('/tickets');

    await expect(page.getByText('Tickets pending')).toBeVisible();
    await expect(page.getByText('View My Bookings')).toBeVisible();
  });

  test('shows error state and supports retry', async ({ page }) => {
    await mockAuthenticatedUser(page);
    let calls = 0;
    await page.route('**/api/v1/tickets', async (route) => {
      calls += 1;

      if (calls === 1) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'backend unavailable' }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ tickets: [] }),
      });
    });

    await page.goto('/tickets');

    await expect(page.getByText('Failed to load tickets')).toBeVisible();
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByText('No tickets yet')).toBeVisible();
  });
});
