# Architecture 28: Production Readiness Checklist

## Purpose
Complete checklist that must be passed before the platform can be deployed to production.

## Application

- [ ] Application builds without errors (`next build`)
- [ ] All pages render without errors (500)
- [ ] All API endpoints return correct responses
- [ ] 404 page exists for unknown routes
- [ ] Loading states (skeletons) exist for all data views
- [ ] Empty states exist for all list views
- [ ] Error states exist for all API-dependent views
- [ ] Mobile responsive: tested on 375px, 768px, 1024px, 1440px
- [ ] Dark mode renders correctly
- [ ] Fonts load correctly (no flash of unstyled text)

## Performance

- [ ] Lighthouse score ≥ 90 (mobile + desktop)
- [ ] Largest Contentful Paint (LCP) < 2.5s
- [ ] First Input Delay (FID) < 100ms
- [ ] Cumulative Layout Shift (CLS) < 0.1
- [ ] Time to Interactive (TTI) < 3s
- [ ] All images use Next.js Image component
- [ ] Bundle size analyzed (< 500KB initial JS)
- [ ] Fonts self-hosted (next/font)

## Testing

- [ ] Unit test coverage > 80%
- [ ] Integration tests pass for all API endpoints
- [ ] E2E tests pass for all critical user flows
- [ ] Accessibility audit passes (axe-core, WCAG 2.1 AA)
- [ ] Load test: 500 concurrent users with < 1% error rate
- [ ] QR scan test: 100 consecutive scans with 100% accuracy
- [ ] Stripe payment test: purchase, refund, failure flows (Phase 2)

## Security

- [ ] Security checklist (27-Security-Checklist.md) fully passed
- [ ] No critical or high CVEs in dependencies (npm audit)
- [ ] All secrets rotated just before production launch
- [ ] Penetration test completed (or at minimum OWASP Top 10 scan)
- [ ] Rate limiting verified on auth + API endpoints

## Monitoring

- [ ] Sentry configured for error tracking
- [ ] Vercel Analytics enabled for Web Vitals
- [ ] Uptime monitoring configured
- [ ] Alert thresholds configured (error rate, latency, uptime)
- [ ] Dashboard created for key metrics
- [ ] Logging level set to 'info' (not 'debug')

## Database

- [ ] Prisma migrations have been deployed to production
- [ ] Database backups configured (daily)
- [ ] Database connection pooling configured
- [ ] Database indexes optimized for query patterns
- [ ] Seed data (if any) has been reviewed for production safety
- [ ] Database user has least-privilege permissions

## Infrastructure

- [ ] Custom domain configured (jamming.com)
- [ ] SSL/TLS certificate active (Let's Encrypt via Vercel)
- [ ] DNS verified and propagated
- [ ] Email sending domain configured (SPF, DKIM, DMARC) — Phase 2
- [ ] Staging environment mirrors production configuration
- [ ] Environment variables verified in production

## Legal & Compliance

- [ ] Privacy policy published at /legal/privacy
- [ ] Terms of service published at /legal/terms
- [ ] Cookie policy published at /legal/cookies
- [ ] Cookie consent banner implemented
- [ ] GDPR compliance verified (data deletion, portability)

## Documentation

- [ ] API documentation is up to date
- [ ] README updated with production URLs
- [ ] Runbook documented for common scenarios
- [ ] Contact/support channel identified

## Go/No-Go Decision

| Gate | Status | Sign-off |
|------|--------|----------|
| All Critical and Major bugs fixed | ☐ | |
| Performance targets met | ☐ | |
| Security audit passed | ☐ | |
| Test coverage ≥ 80% | ☐ | |
| Legal compliance verified | ☐ | |
| Stakeholder approval | ☐ | |
| **Ready to launch** | ☐ | |
