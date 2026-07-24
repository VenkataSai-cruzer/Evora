# Ticket E2E Test Suites

## API ticket flow (Vitest)

Run focused API ticket flow coverage (auth, authorization, lifecycle checks, render/download):

```bash
npm run test --workspace=apps/api -- src/tests/ticket-flow.e2e.test.ts
```

## Web `/tickets` UX (Playwright)

Run the focused web E2E suite:

```bash
npx playwright test tests/e2e/ticket-flow.spec.ts
```

These Playwright tests stub `/api/v1/tickets` responses to keep runs deterministic and CI-safe (no seed accounts required).
