# Deployment Architecture — Jamming Events Platform

## 1. Hosting Strategy

| Component | Provider | Plan |
|-----------|----------|------|
| Frontend + API | Vercel | Pro (or Hobby for MVP) |
| Database | Neon (Serverless PostgreSQL) | Scale plan |
| File Storage | Cloudflare R2 | Pay-as-you-go |
| Cache | Upstash Redis | Serverless |
| Email (Phase 2) | Resend | Growth plan |
| Monitoring | Sentry + Vercel Analytics | Free tier |
| CI/CD | GitHub Actions | Free |

---

## 2. Deployment Pipeline

```
[Developer Push to main]
    ↓
[GitHub Actions Triggered]
    ├── Lint (ESLint)
    ├── Type check (tsc --noEmit)
    ├── Unit tests (vitest)
    ├── Build (next build)
    ├── Integration tests
    └── E2E tests (Playwright)
          ↓ (all pass)
[Automatic Deploy to Vercel Preview]
    ├── Generates preview URL
    ├── Runs against preview database
    └── Notifies PR author
          ↓ (PR merged to main)
[Automatic Deploy to Production]
    ├── Build with production env
    ├── Run database migrations (prisma migrate deploy)
    ├── Deploy to Vercel production
    └── Health check verification
          ↓ (success)
[Slack Notification]
    └── "Deployed v1.2.3 to production"
```

---

## 3. Environment Configuration

### Environments

| Environment | URL | Database | Purpose |
|-------------|-----|----------|---------|
| `development` | `localhost:3000` | Local PostgreSQL | Local development |
| `staging` | `staging.jamming.com` | Staging Neon DB | QA + testing |
| `production` | `jamming.com` | Production Neon DB | Live users |

### Environment Variables Strategy

```
Local:    .env.local (gitignored)
Staging:  Vercel Environment Variables (Staging)
Production: Vercel Environment Variables (Production)

All environments share .env.example for structure.
```

---

## 4. Database Migration Strategy

```bash
# Development (local)
npx prisma migrate dev --name <migration_name>  # Creates migration + applies

# Staging (CI/CD)
npx prisma migrate deploy  # Applies pending migrations

# Production (CI/CD)
npx prisma migrate deploy  # Applies pending migrations

# Rollback (if needed)
npx prisma migrate resolve --rolled-back <migration_name>
```

### Migration Safety Rules

1. Never delete columns without a deprecation period
2. Add nullable columns first, then backfill, then make required
3. Run migrations during low-traffic hours
4. Always have a rollback plan
5. Test migration on staging before production

---

## 5. Database Backups

| Backup Type | Frequency | Retention | Storage |
|-------------|-----------|-----------|---------|
| Automated snapshot | Daily | 30 days | Neon built-in |
| Point-in-time recovery | Continuous | 7 days | Neon built-in |
| Manual export | Before each deployment | 7 days | R2/S3 |

---

## 6. Domain & DNS

```
Primary domain:    jamming.com
                    ├── A/AAAA → Vercel edge IPs
                    └── CNAME www → cname.vercel-dns.com

Staging domain:    staging.jamming.com
                    └── CNAME → cname.vercel-dns.com

SSL/TLS:           Automatic via Vercel (Let's Encrypt)
```

---

## 7. Monitoring & Alerting

### Health Check Endpoints

| Endpoint | Check | Frequency |
|----------|-------|-----------|
| `/api/health` | App server status | Every 1 min |
| `/api/health/db` | Database connectivity | Every 1 min |
| `/api/health/redis` | Redis connectivity | Every 5 min |
| `/api/health/blockchain` | RPC connectivity (Phase 2) | Every 5 min |

### Monitoring Stack

| Tool | Purpose | Integration |
|------|---------|-------------|
| Vercel Analytics | Web Vitals, traffic | Built-in |
| Sentry | Error tracking | `@sentry/nextjs` |
| Better Stack / Pingdom | Uptime monitoring | HTTP monitoring |
| Neon Dashboard | Database performance | Built-in |
| GitHub Status | CI/CD health | Built-in |

### Runbook

| Scenario | Action | Expected RTO |
|----------|--------|-------------|
| App server down | Vercel auto-recovers | < 5 min |
| Database down | Neon failover | < 2 min |
| Database corrupted | Restore from snapshot | < 30 min |
| Security incident | Revoke keys, rollback | < 1 hour |
| Smart contract issue | Pause contract, deploy fix | < 1 hour |

---

## 8. Performance Optimization

### Frontend

| Optimization | Implementation |
|-------------|---------------|
| Image optimization | Next.js `<Image>` component + WebP |
| Font loading | `next/font` with `display: swap` |
| Code splitting | Automatic via Next.js App Router |
| Bundle analysis | `@next/bundle-analyzer` |
| Caching | `stale-while-revalidate` for API responses |
| CDN | Vercel Edge Network |

### Backend

| Optimization | Implementation |
|-------------|---------------|
| API caching | Redis cache for event listings |
| Database pooling | Neon connection pooling |
| Query optimization | Prisma query logging + indexing |
| Edge functions | Vercel Edge for rate limiting |
| Batch processing | Async queue for blockchain operations |

---

## 9. Scaling Plan

### Traffic Levels

| Level | Daily Users | Events | Tickets | Infrastructure |
|-------|-------------|--------|---------|---------------|
| Launch | < 100 | < 5 | < 200 | Hobby/Pro plan |
| Growth | 100-1000 | 5-50 | 200-5000 | Pro plan |
| Scale | 1000+ | 50+ | 5000+ | Enterprise plan |

### Scaling Actions

| Trigger | Action |
|---------|--------|
| API latency > 500ms p95 | Add Redis caching |
| DB CPU > 80% | Upgrade Neon plan, add read replica |
| Image load times > 2s | Add CDN, optimize images |
| Concurrent users > 500 | Vercel auto-scales |
| Email volume > 100/day | Upgrade Resend plan |
