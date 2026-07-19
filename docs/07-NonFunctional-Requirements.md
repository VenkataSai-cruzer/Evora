# Non-Functional Requirements — Jamming Events Platform

## 1. Performance

| ID | Requirement | Target | Measurement |
|----|-------------|--------|-------------|
| NFR-PERF-01 | Page load time (initial) | < 2 seconds | Lighthouse, Web Vitals |
| NFR-PERF-02 | Page load time (subsequent) | < 500ms | Lighthouse, Web Vitals |
| NFR-PERF-03 | API response time (95th percentile) | < 300ms | APM tool |
| NFR-PERF-04 | QR code scan result | < 1 second | End-to-end timing |
| NFR-PERF-05 | Ticket generation time | < 3 seconds | Server timing |
| NFR-PERF-06 | Database query time (95th percentile) | < 100ms | Database profiling |
| NFR-PERF-07 | Time to Interactive (TTI) | < 3 seconds | Lighthouse |
| NFR-PERF-08 | Largest Contentful Paint (LCP) | < 2.5 seconds | Web Vitals |

## 2. Scalability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-SCAL-01 | Concurrent users | Support 500 concurrent users |
| NFR-SCAL-02 | Concurrent events | Support 50+ active events |
| NFR-SCAL-03 | Ticket throughput | Generate 100 tickets/minute |
| NFR-SCAL-04 | Scan throughput | Process 100 scans/minute |
| NFR-SCAL-05 | Database size | Handle 100K+ ticket records |
| NFR-SCAL-06 | Horizontal scaling | Stateless app servers enable horizontal scaling |

## 3. Availability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-AVAIL-01 | Uptime (MVP) | 99.5% |
| NFR-AVAIL-02 | Uptime (post-MVP) | 99.9% |
| NFR-AVAIL-03 | Planned downtime window | Off-peak hours only |
| NFR-AVAIL-04 | Degraded mode during outages | QR scanning works offline (cached tickets) |
| NFR-AVAIL-05 | Recovery time objective (RTO) | < 1 hour |

## 4. Security

| ID | Requirement | Standard |
|----|-------------|----------|
| NFR-SEC-01 | Password hashing | bcrypt (cost factor 12) |
| NFR-SEC-02 | Session management | HTTP-only, secure, same-site cookies |
| NFR-SEC-03 | API authentication | JWT with RS256, 15-min expiry |
| NFR-SEC-04 | HTTPS enforcement | TLS 1.3, redirect HTTP → HTTPS |
| NFR-SEC-05 | Database encryption | Encrypted at rest (AES-256) |
| NFR-SEC-06 | Secrets management | Environment variables, never in code |
| NFR-SEC-07 | Rate limiting | 100 req/min per IP for auth, 1000 for general |
| NFR-SEC-08 | SQL injection prevention | Parameterized queries via Prisma |
| NFR-SEC-09 | XSS prevention | CSP headers, React's built-in escaping |
| NFR-SEC-10 | CSRF protection | Same-site cookies, CSRF tokens |
| NFR-SEC-11 | Input validation | Server-side validation on all inputs |
| NFR-SEC-12 | Dependency scanning | Weekly using npm audit / Snyk |

## 5. Privacy & Compliance

| ID | Requirement | Standard |
|----|-------------|----------|
| NFR-PRIV-01 | Data minimization | Collect only necessary data |
| NFR-PRIV-02 | Data retention | User data retained for duration of account + 90 days |
| NFR-PRIV-03 | Data deletion | Full account deletion within 30 days of request |
| NFR-PRIV-04 | Cookie consent | Cookie banner with granular controls |
| NFR-PRIV-05 | GDPR compliance | Right to access, rectification, erasure, portability |
| NFR-PRIV-06 | Privacy policy | Published and accessible from all pages |

## 6. Usability

| ID | Requirement | Standard |
|----|-------------|----------|
| NFR-UX-01 | Mobile responsive | All pages functional on screens 320px+ |
| NFR-UX-02 | Touch targets | Minimum 44x44px for interactive elements |
| NFR-UX-03 | Loading states | Skeleton loaders for all data-bound views |
| NFR-UX-04 | Error states | User-friendly error messages with recovery actions |
| NFR-UX-05 | Empty states | Helpful messages when no data exists |
| NFR-UX-06 | Form feedback | Real-time validation with inline errors |
| NFR-UX-07 | Accessibility | WCAG 2.1 AA compliance |

## 7. Accessibility (WCAG 2.1 AA)

| ID | Requirement |
|----|-------------|
| NFR-A11Y-01 | All images have alt text |
| NFR-A11Y-02 | Color contrast ratio ≥ 4.5:1 for normal text |
| NFR-A11Y-03 | All form inputs have associated labels |
| NFR-A11Y-04 | Keyboard navigable (all interactive elements reachable via Tab) |
| NFR-A11Y-05 | Focus indicators visible on all interactive elements |
| NFR-A11Y-06 | ARIA landmarks used for page structure |
| NFR-A11Y-07 | Screen reader announcements for dynamic content |
| NFR-A11Y-08 | Error messages associated with inputs via aria-describedby |

## 8. Reliability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-REL-01 | Error rate (5xx) | < 0.1% of requests |
| NFR-REL-02 | Data integrity | No ticket double-claim (race condition prevention) |
| NFR-REL-03 | Database backup | Daily automated backups, 30-day retention |
| NFR-REL-04 | Graceful degradation | QR scanning works with stale data if API is down |
| NFR-REL-05 | Retry logic | Idempotent ticket generation with retry |

## 9. Maintainability

| ID | Requirement | Standard |
|----|-------------|----------|
| NFR-MAIN-01 | Code coverage | > 80% unit test coverage |
| NFR-MAIN-02 | Linting | ESLint + Prettier with consistent config |
| NFR-MAIN-03 | Documentation | All API endpoints documented |
| NFR-MAIN-04 | Logging | Structured logging (JSON) with correlation IDs |
| NFR-MAIN-05 | Code review | All PRs require review before merge |

## 10. Browser Support (MVP)

| Browser | Support Level |
|---------|--------------|
| Chrome (last 2 major versions) | ✅ Full |
| Firefox (last 2 major versions) | ✅ Full |
| Safari (last 2 major versions) | ✅ Full |
| Edge (last 2 major versions) | ✅ Full |
| Samsung Internet | ✅ Functional |
| Opera | ✅ Functional |
| IE11 | ❌ Not supported |

## 11. Mobile OS Support (for QR scanning via browser)

| OS | Browser | Support |
|----|---------|---------|
| iOS 15+ | Safari | ✅ Full camera access |
| iOS 15+ | Chrome | ✅ Camera access |
| Android 8+ | Chrome | ✅ Full camera access |
| Android 8+ | Samsung Internet | ✅ Camera access |

## 12. Environmental Requirements

| ID | Requirement | Specification |
|----|-------------|--------------|
| NFR-ENV-01 | Node.js version | 18.x LTS or 20.x LTS |
| NFR-ENV-02 | TypeScript version | 5.x |
| NFR-ENV-03 | Package manager | npm or pnpm |
| NFR-ENV-04 | Database | PostgreSQL 15+ |
| NFR-ENV-05 | CI/CD | GitHub Actions |
| NFR-ENV-06 | Containerization | Docker (development) |
