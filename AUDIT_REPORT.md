# Full Audit Report — Jamming

Audit date: 2026-07-21  
Revision: `550677f85b6694e68bdd3194afb08c87ac7bf949`

## Scope and limitation

Reviewed the repository's Next.js frontend, Fastify API, Prisma schema/migration, deployment configuration, tests, and security-sensitive integrations. Type checks, builds, lint, unit tests, and a current production dependency audit were run.

The supplied ChatGPT share URL opened an empty ChatGPT landing page in both the web fetch and in-app browser. No shared-conversation text was accessible, so the repository documentation and implementation were used as requirements evidence. This is an explicit audit limitation.

Generated `.next` artifacts and `node_modules` were excluded as derived/vendor content. The tracked Prisma backup was identified but its data was not reproduced in this report. An untracked `apps/api/.env.staging` exists; its contents were deliberately not exposed.

## Executive summary

The code compiles, the production builds succeed, and the small frontend component test suite passes. It is not production-ready. The API has several exploitable business-logic and authorization failures, the deployed staging payment simulator can mint tickets without authentication, public event routes disclose drafts, and multiple core frontend/backend contracts disagree. The API has no tests. Current production dependencies include nine vulnerable package nodes (six high, three moderate in npm's aggregate report).

Recommended release decision: **do not promote this build to production or use staging tickets for real admission until the P1 findings and broken order/QR/CSRF integrations are fixed and regression-tested.**

## Security findings

### P1 — Public staging payment endpoint confirms arbitrary orders and issues tickets

- Evidence: `apps/api/src/modules/payments/payment.test.routes.ts:25-110`, registered by `apps/api/src/app.ts:76-77`; enabled by `render.yaml:41-45,98-100`.
- Attack path: an anonymous caller posts an attacker-selected `orderId`; there is no authentication, ownership check, or test credential. The handler creates a successful payment, confirms the order, and creates confirmed tickets.
- Impact: payment and admission integrity are bypassed on the checked-in public staging deployment. An attacker can create a pending order normally, then confirm it without payment.
- Fix: require authentication and exact order ownership, require an isolated test authorization secret, reject production-derived data, bind the confirmation to expected amount/currency, and keep the route entirely unregistered outside disposable test environments.

### P1 — Quantity/attendee mismatch permits underpriced mass ticket issuance

- Evidence: `apps/api/src/modules/orders/order.controller.ts:7-12,35-39,60-81`; issuance loops all stored attendees at `apps/api/src/modules/payments/payment.test.routes.ts:89-110`.
- Attack path: submit `quantity=1` with many attendee objects. Price, capacity, and `maxPerOrder` use `quantity`, while persistence and ticket issuance use `attendees.length`.
- Impact: one paid/reserved unit can produce many valid tickets and amplify database/rendering work.
- Fix: require `attendees.length === quantity`, bound both values with runtime schemas, and derive quantity from the validated attendee array in one place.

### P1 — Login callback URL can reach executable client navigation

- Evidence: `apps/web/src/app/auth/login/page.tsx:28,60` reads `callbackUrl` from the query string and passes it directly to `router.push` after login.
- Attack path: a victim follows a crafted login link and authenticates; an untrusted `javascript:` or external destination is then navigated. Next.js explicitly warns that unsanitized URLs passed to `router.push` can execute in the page context.
- Impact: post-login XSS/open redirect with realistic phishing and privileged-action potential.
- Fix: accept only same-origin relative paths beginning with a single `/`, reject schemes, backslashes and protocol-relative values, and fall back to `/`.

### P2 — Check-in staff can consume tickets for any event

- Evidence: `apps/api/src/modules/check-in/check-in.routes.ts:9-11` grants global `CHECKIN_STAFF`; `check-in.controller.ts:14-19,52-65` looks up only by token and mutates without event assignment/scope.
- Impact: staff intended for one event can invalidate another event's captured ticket and corrupt audit/check-in state.
- Fix: model staff-to-event assignments and require the scanned ticket's `eventId` to be authorized for the authenticated scanner inside the transaction.

### P2 — Concurrent order creation can oversell capacity

- Evidence: `apps/api/src/modules/orders/order.controller.ts:43-49,78-81` reads/checks `soldCount`, then separately increments it; there is no conditional predicate, serializable isolation, or database constraint.
- Impact: concurrent requests can both pass the stale capacity check and commit `soldCount > capacity`.
- Fix: use a conditional update (`soldCount + quantity <= capacity`) checked by affected-row count, or serializable isolation/row locking plus a database invariant; add a parallel PostgreSQL integration test.

### P2 — Unpaid orders permanently exhaust inventory

- Evidence: `apps/api/src/modules/orders/order.controller.ts:63-81` sets `expiresAt` and immediately increments `soldCount`; no API job, route, or decrement path consumes expired reservations.
- Impact: any authenticated user can reserve all inventory without paying and keep it unavailable indefinitely.
- Fix: use expiring reservations with an idempotent release job/transaction, exclude expired holds from availability, and rate-limit reservations per account/event.

### P2 — Anonymous event list and detail endpoints disclose drafts

- Instances:
  - `apps/api/src/modules/events/event.controller.ts:11-15`: `?status=DRAFT` replaces the safe `PUBLISHED` default on the anonymous list route.
  - `apps/api/src/modules/events/event.controller.ts:68-103`: anonymous slug lookup has no parent publication predicate and returns nested ticket, branding, template, organizer, and count data.
- Impact: unpublished event plans, slugs, venue data, pricing, inventory, object keys, and ticket counts can be enumerated.
- Fix: public endpoints must hard-code published visibility. Put administrative filtering in a separately authenticated route.

### P3 — Expired tickets are accepted at check-in

- Evidence: `apps/api/src/modules/check-in/check-in.controller.ts:25-30,44-65` rejects `CANCELLED` and `CHECKED_IN` but not schema-supported `EXPIRED`.
- Impact: a retained expired QR preimage is converted to `CHECKED_IN` and returned as valid.
- Fix: allowlist exactly `CONFIRMED` for admission and repeat the same predicate in the transactional write.

### P3 — Stored CSV formula injection in attendee export

- Evidence: attendee-controlled name/email/phone values flow from order creation to direct comma concatenation at `apps/api/src/modules/admin/admin.controller.ts:295-312`.
- Impact: when an administrator opens the export in formula-capable spreadsheet software, leading `=`, `+`, `-`, or `@` cells may execute formulas, beacon data, or support social engineering.
- Fix: use an RFC 4180 CSV library, quote every cell, and neutralize formula prefixes according to the target spreadsheet policy.

### P3 / follow-up — Reverse-proxy rate limiting may use shared proxy IPs

- Evidence: Fastify is created without `trustProxy` at `apps/api/src/app.ts:22-31`, while the global limiter keys only on `request.ip` at `apps/api/src/app.ts:46-52`; deployment is behind Render.
- Risk: clients sharing a proxy peer may share one 100/minute bucket, enabling collateral denial of service at login or venue check-in.
- Status: static configuration is suspicious; validate by logging `request.ip` and forwarded headers from two external clients before final severity is assigned.

### Supply-chain findings

`npm audit --omit=dev` reported 9 vulnerable production package nodes: 6 high and 3 moderate. Direct affected packages include the locked Next.js 14.2.x, Fastify 4.x, `next-auth`, and `uuid` chains. Reported advisories include Fastify body-validation bypass, multiple Next.js Server Component denial-of-service issues, Next.js request smuggling/cache issues, and vulnerable `fast-uri` transitives.

Upgrade to currently supported patched releases, prioritizing Next.js and Fastify. Because major upgrades are indicated, do this on a dedicated branch with HTTP contract, authentication, RSC, and deployment regression tests. Re-run `npm audit --omit=dev` after lockfile regeneration.

## Critical correctness and integration defects

1. **CSRF cache is poisoned after unauthenticated login/register.** `apps/web/src/lib/api-client.ts:39-57` caches a resolved-null token forever. The successful auth response's CSRF token is ignored, so later authenticated mutations omit `X-CSRF-Token` and receive 403. Failed initial fetches also never retry.
2. **Order request contract is incompatible.** `RegistrationFlow.tsx:143-151` sends no `quantity`, while `order.controller.ts` requires and calculates with it.
3. **UTR is collected but not persisted or verified.** The UI promises a payment-reference workflow that the API ignores.
4. **Test-payment UI is permanently disabled/incompatible.** Submission state is not reset after order creation, and the frontend expects `{status}` while the backend returns nested `{success,data}`.
5. **Displayed QR cannot pass the scanner.** `TicketPassClient.tsx` encodes a ticket URL; the API expects the secret QR preimage. The client sends `{token}` while the server expects `{qrToken}`, and the client expects `status` while the server returns `result`.
6. **Manual check-in is nonfunctional.** `check-in.controller.ts:94-96` hashes `manual:<ticketNumber>` and looks for that unrelated hash rather than checking in the ticket already found by number.
7. **Generated passes contain no QR.** `pass-generator.ts:219-223` renders a square glyph placeholder.
8. **PDF/PNG fallback lies about format.** When Playwright is unavailable, `pdf-generator.ts:44-51,98-105` returns HTML using `.pdf`/`.png` filenames.
9. **Dashboard/contact client routes do not exist.** Numerous pages call same-origin `/api/dashboard/...` and `/api/contact`, but there are no App Router `route.ts` handlers or rewrites. The Fastify route shapes also differ.
10. **Server component API calls do not forward cookies.** `credentials:'include'` in Node/Next server fetch does not automatically forward the incoming browser cookie to the external Fastify origin, so authenticated server pages can redirect users as logged out.
11. **Contact fallback does not catch rejected requests.** The `try` in `listContactRequests` returns an un-awaited Promise, so asynchronous rejection bypasses its catch.
12. **Dashboard statistics use only the first page.** Status/order counts are calculated from the first default page while only total events uses backend `total`.
13. **Password reset is a placeholder.** The linked flow explicitly says it is unavailable and no reset API exists.
14. **Admin search is built but ignored.** The attendee controller constructs a search filter, then does not apply it to the query.
15. **Admin event/ticket-type updates are unrestricted mass assignment.** Global admins can overwrite lifecycle, ownership, `soldCount`, capacity, and re-parenting fields. This is not a lower-privilege security finding under the current global-admin model, but it bypasses business invariants and should be replaced by allowlisted DTOs and dedicated lifecycle operations.
16. **Tracked database backup.** `prisma/dev.db.backup` is committed and `.gitignore` excludes `dev.db` but not backups. Verify it contains synthetic data only, remove it from version control if unnecessary, and ignore backup variants.

## Verification results

| Check | Result |
|---|---|
| Web TypeScript | Pass |
| API TypeScript | Pass |
| Web production build | Pass |
| API build | Pass |
| Web unit tests | 14/14 pass across 3 files |
| API tests | Fail: no test files found |
| Web lint | Pass with 6 `no-img-element` warnings |
| Production dependency audit | Fail: 9 vulnerable nodes (6 high, 3 moderate) |

The web test runner also warns that `vitest.setup.ts` should be externalized and that the CJS Vite Node API is deprecated.

## Requirements and architecture drift

- Documentation promises email verification, password reset, endpoint-specific throttling, platform/organizer RBAC, CSP/security headers, audit logging, validated uploads, real QR signatures, payment verification, and broad integration/E2E coverage. Much of this is absent or only described in markdown.
- The Prisma role model (`ATTENDEE | ADMIN | CHECKIN_STAFF`) does not match the documented organizer/co-organizer/scanner hierarchy.
- Deployment sets `NODE_ENV=staging`; cookie code only marks cookies Secure when `NODE_ENV === 'production'` and ignores the configured `COOKIE_SECURE`/`COOKIE_SAME_SITE` variables. With a cross-site Cloudflare frontend and Render API, this is likely to break authenticated cookies and weakens intended transport settings.
- Security headers/CSP described in documentation are not present in `apps/web/next.config.js`.

## Remediation order

1. Disable/unregister public test payment; fix attendee cardinality validation.
2. Upgrade vulnerable Next.js/Fastify dependency chains.
3. Fix CSRF lifecycle, cross-origin cookie configuration, and server-side cookie forwarding.
4. Make order reservation/capacity operations concurrency-safe and expiring.
5. Enforce published visibility and event-scoped check-in authorization.
6. Define one shared typed API contract and repair order/payment/QR/dashboard/contact flows.
7. Add API integration tests and PostgreSQL concurrency tests before further feature work.
8. Add security regression tests for every finding above, then run E2E against the deployed topology.

