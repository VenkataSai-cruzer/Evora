# Testing Strategy — Jamming Events Platform

## 1. Testing Philosophy

1. **Shift left** — Test early, test often
2. **Automate everything** — Manual testing only for exploratory
3. **Test behavior, not implementation** — Focus on user-facing outcomes
4. **Fast feedback** — Unit tests in < 1 min, integration < 5 min, E2E < 15 min
5. **Realistic** — Test against real (or realistic) environments

---

## 2. Test Pyramid

```
          ╱╲
         ╱  ╲
        ╱ E2E╲           ← ~5% of tests
       ╱──────╲
      ╱Integration╲      ← ~15% of tests
     ╱────────────╲
    ╱   Unit Tests  ╲    ← ~80% of tests
   ╱────────────────╲
```

---

## 3. Unit Testing

### Framework
- **Runner:** Vitest (fast, compatible with Vite)
- **Assertion:** Vitest built-in
- **Mocking:** `vitest.mock` or `@syntax.fm/testdouble`

### Coverage Targets

| Category | Target |
|----------|--------|
| Services | 90% |
| Components | 80% |
| Utils/helpers | 95% |
| API handlers | 85% |
| **Overall** | **80%** |

### What to Unit Test

- Services (ticket creation, check-in logic, payment logic)
- Utility functions (QR generation, hash calculation, formatting)
- Validation schemas (Zod)
- Components (rendering, props, states, interactions)
- Hooks (state changes, side effects)

### What NOT to Unit Test

- Database queries (integration test)
- Third-party API calls (integration test)
- UI layout/visuals (E2E test)
- Framework features (Next.js routing)

---

## 4. Integration Testing

### Framework
- **Tool:** Vitest + Supertest (API routes)
- **Database:** Testcontainers (PostgreSQL) or in-memory SQLite
- **Auth:** Mock NextAuth session

### Integration Test Targets

| Test | Description |
|------|-------------|
| Auth flows | Register, login, logout, password reset |
| Event CRUD | Create, read, update, cancel events |
| Ticket flow | RSVP, purchase (mock Stripe), cancel, refund |
| Check-in flow | Valid scan, used ticket, invalid ticket, wrong event |
| Waitlist flow | Join, auto-promote, leave |
| Notification flow | Create, read, mark read |

### API Integration Test Example

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { createTestUser, createTestEvent } from './test-utils';

describe('POST /api/events/[id]/tickets', () => {
  it('should create a free ticket for authenticated user', async () => {
    const user = await createTestUser();
    const event = await createTestEvent({ capacity: 10, ticketType: 'FREE' });
    
    const response = await request(app)
      .post(`/api/events/${event.id}/tickets`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ type: 'FREE' });
    
    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe('ACTIVE');
    expect(response.body.data.ticketNumber).toMatch(/^JAM-\d{4}-\d{5}$/);
  });
  
  it('should return 409 when event is full', async () => {
    const user = await createTestUser();
    const event = await createTestEvent({ capacity: 1, ticketType: 'FREE' });
    
    // Fill the event
    await createTestTicket(event.id, { status: 'ACTIVE' });
    
    const response = await request(app)
      .post(`/api/events/${event.id}/tickets`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ type: 'FREE' });
    
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('event_full');
  });
});
```

---

## 5. End-to-End Testing

### Framework
- **Tool:** Playwright
- **Browser:** Chromium (primary), Firefox + Safari (secondary)
- **Viewport:** 375x812 (mobile), 1280x720 (desktop)

### E2E Test Scenarios

| Scenario | Critical | Description |
|----------|----------|-------------|
| User registration + login | ✅ | Sign up, verify email, sign in |
| Event discovery + RSVP | ✅ | Browse, search, RSVP free event |
| Ticket view + download | ✅ | View ticket, download PDF |
| QR scan check-in | ✅ | Scan valid ticket, see success |
| Error handling | ✅ | Scan invalid/used/cancelled ticket |
| Event creation | ✅ | Create full event, verify it appears |
| Payment flow (Phase 2) | ✅ | Purchase paid ticket, receive QR |
| Mobile responsiveness | ✅ | All flows work on mobile viewport |

### E2E Test Example

```typescript
// /tests/e2e/checkin.spec.ts
import { test, expect } from '@playwright/test';

test('successful QR check-in flow', async ({ page }) => {
  // Arrange: create event + ticket as organizer
  await page.goto('/auth/login');
  await page.fill('[name="email"]', 'organizer@test.com');
  await page.fill('[name="password"]', 'TestPass1');
  await page.click('button[type="submit"]');
  
  await page.goto('/dashboard/events/test-jazz-night/checkin');
  
  // Mock QR scan (inject QR data via dev tools)
  // This simulates scanning a real QR code
  await page.evaluate(() => {
    window.postMessage({
      type: 'QR_SCAN',
      data: JSON.stringify({
        ticketId: 'mock-ticket-uuid',
        ticketNumber: 'JAM-2026-0042',
        eventId: 'mock-event-uuid',
        sig: 'abc123signature',
      }),
    }, '*');
  });
  
  // Assert: success result screen
  await expect(page.locator('.scan-result-valid')).toBeVisible();
  await expect(page.locator('.attendee-name')).toHaveText('Alex Rivera');
});
```

---

## 6. Component Testing

### Framework
- **Tool:** Vitest + React Testing Library
- **Focus:** Component behavior, accessibility, state transitions

### Component Test Example

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { ScannerView } from '@/components/scanner/ScannerView';

describe('ScannerView', () => {
  it('should show camera viewfinder on mount', () => {
    render(<ScannerView eventId="test-event-id" />);
    
    expect(screen.getByTestId('qr-reader')).toBeInTheDocument();
    expect(screen.getByText('Manual Entry')).toBeInTheDocument();
  });
  
  it('should show scan count in footer', () => {
    render(
      <ScannerView
        eventId="test-event-id"
        recentScans={[
          { status: 'VALID', attendeeName: 'Alex', timestamp: '7:30 PM' },
        ]}
        totalScanned={1}
        totalTickets={42}
      />
    );
    
    expect(screen.getByText('Scanned: 1 / 42')).toBeInTheDocument();
  });
});
```

---

## 7. Accessibility Testing

### Automated
- **Tool:** `@axe-core/playwright` (accessibility assertions in E2E)
- **Standard:** WCAG 2.1 AA
- **Run:** CI pipeline

### Manual
- Keyboard navigation audit
- Screen reader testing (NVDA / VoiceOver)
- Color contrast verification
- Zoom testing (200%)

---

## 8. Performance Testing

### Metrics

| Metric | Target | Tool |
|--------|--------|------|
| Lighthouse performance | ≥ 90 | Lighthouse CI |
| LCP | < 2.5s | Web Vitals |
| TTI | < 3s | Lighthouse |
| API response time (p95) | < 300ms | k6 |
| Scan-to-result time | < 1s | Custom instrumentation |

### Load Testing

```bash
# k6 load test for check-in endpoint
k6 run --vus 50 --duration 60s tests/load/checkin-load.js
```

---

## 9. Security Testing

| Test | Frequency | Tool |
|------|-----------|------|
| Dependency vulnerability scan | Weekly | `npm audit` + Snyk |
| Static analysis | Every PR | ESLint security plugins |
| Secret scanning | Every push | `trufflehog` / GitHub secret scanning |
| Penetration test | Quarterly | External firm |
| Authentication testing | Every PR | OWASP ZAP / Burp Suite |

---

## 10. CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:unit -- --coverage
  
  integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: jamming_test
          POSTGRES_PASSWORD: test
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:integration
  
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e
  
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
```

---

## 11. Testing Commands

```bash
# Run all tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests (requires running app)
npm run test:e2e

# Watch mode (development)
npm run test:watch

# Coverage report
npm run test:coverage

# Specific file
npm run test -- -- src/lib/services/ticket.service.test.ts
```
