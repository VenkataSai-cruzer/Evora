# Architecture 27: Security Checklist

## Purpose
Pre-flight security checklist that must be passed before any production deployment.

## Authentication & Authorization

- [ ] All API endpoints have authentication checks (except public ones)
- [ ] Password hashing uses bcrypt with cost factor ≥ 12
- [ ] Session tokens are HTTP-only, secure, SameSite cookies
- [ ] JWT tokens expire within 15 minutes (access) / 7 days (refresh)
- [ ] Rate limiting is configured for all auth endpoints (10 req/15min)
- [ ] Failed login attempts are tracked and locked after 10 failures
- [ ] Google OAuth uses state parameter (CSRF protection)
- [ ] Role-based access control enforced in API layer (not just UI)
- [ ] Co-organizer permissions are event-scoped (not global)

## Data Protection

- [ ] All API responses over HTTPS (TLS 1.3)
- [ ] Database connection string uses SSL mode
- [ ] Passwords never returned in API responses
- [ ] PII redacted from all logs
- [ ] File uploads validate MIME type server-side
- [ ] File size limits enforced (5MB images, 10MB exports)
- [ ] Database encryption at rest (AES-256 via provider)
- [ ] Backup encryption enabled

## Input Validation

- [ ] Every mutation endpoint has Zod validation
- [ ] SQL injection prevented via Prisma (parameterized queries)
- [ ] XSS prevented via React escaping + CSP headers
- [ ] No eval() or dangerouslySetInnerHTML (unless sanitized)
- [ ] Server-side validation independent of client-side validation

## Network Security

- [ ] CORS restricted to allowed origins
- [ ] CSP headers configured
- [ ] HSTS enabled (Strict-Transport-Security)
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY
- [ ] Referrer-Policy: strict-origin-when-cross-origin
- [ ] No sensitive data in URL parameters

## Blockchain & Payments (Phase 2)

- [ ] ETH private key stored in hardware wallet (production)
- [ ] Stripe webhook signature verified on every request
- [ ] Payment idempotency keys prevent double charges
- [ ] Smart contract audited before mainnet deployment
- [ ] Contract has pause mechanism for emergency stop
- [ ] Contract ownership transferable

## Infrastructure

- [ ] All secrets in environment variables, never in code
- [ ] `.env` files are gitignored
- [ ] No secrets committed to git history
- [ ] Dependencies scanned weekly (npm audit / Snyk)
- [ ] Production database has automated daily backups
- [ ] Monitoring alerts configured for error rate > 1%
- [ ] Rate limiting enabled on all API endpoints
- [ ] DDoS protection via Vercel edge network

## Testing & Monitoring

- [ ] Penetration test completed (external firm)
- [ ] All OWASP Top 10 risks addressed
- [ ] Audit logging active for all security events
- [ ] Sentry error tracking configured
- [ ] Uptime monitoring active
- [ ] Incident response plan documented

## GDPR / Privacy Compliance

- [ ] Privacy policy published
- [ ] Cookie consent banner implemented
- [ ] User data deletion mechanism in place
- [ ] Data retention policy documented
- [ ] Right to data portability (export user data)
