# Security Architecture — Jamming Events Platform

## 1. Security Principles

1. **Defense in Depth** — Multiple layers of security controls
2. **Least Privilege** — Minimum access required for each role/function
3. **Secure by Default** — Secure configuration out of the box
4. **Fail Secure** — Failure defaults to denied/blocked
5. **Never Trust User Input** — Validate, sanitize, escape
6. **Security in the Open** — No security through obscurity

---

## 2. Threat Model

### Assets

| Asset | Sensitivity | Impact of Breach |
|-------|-------------|-----------------|
| User credentials | Critical | Account takeover |
| Ticket data | High | Fraud, unauthorized entry |
| Payment information | Critical | Financial fraud |
| Personal data (email, name) | High | Privacy violation |
| Blockchain private key | Critical | Signature forgery |

### Threat Actors

| Actor | Motivation | Capability |
|-------|-----------|-----------|
| Casual fraudster | Free entry to events | Low (screenshot sharing) |
| Sophisticated forger | Create fake tickets | Medium (QR generation) |
| Disgruntled user | Disrupt events | Low-medium |
| Competitor | Steal data/user base | Medium |
| Automated bot | Mass ticket grabbing | Medium |
| External hacker | Financial gain | High |

### Attack Vectors

| Vector | Risk | Mitigation |
|--------|------|-----------|
| QR code forgery | High | HMAC signature + blockchain verification |
| Session hijacking | High | HTTP-only cookies, secure flags, short expiry |
| SQL injection | High | Prisma parameterized queries |
| XSS (Cross-Site Scripting) | Medium | React's built-in escaping, CSP headers |
| CSRF (Cross-Site Request Forgery) | Medium | SameSite cookies, CSRF tokens |
| Brute force login | Medium | Rate limiting, progressive delay |
| API token leak | Medium | Environment variables, .gitignore |
| Race condition (double booking) | High | Database transactions, row-level locking |
| Stripe webhook spoofing | High | Signature verification |
| Man-in-the-middle | Medium | TLS 1.3, HSTS |

---

## 3. Security Controls by Layer

### Network Layer

| Control | Implementation |
|---------|---------------|
| TLS 1.3 | All traffic encrypted |
| HSTS | Strict-Transport-Security header |
| DDoS protection | Vercel's edge network |
| WAF | Vercel WAF rules |

### Application Layer

| Control | Implementation |
|---------|---------------|
| Input validation | Zod schemas on all API endpoints |
| Rate limiting | Upstash Redis rate limiter |
| Session management | NextAuth JWT with short expiry |
| CORS | Restricted to allowed origins |
| Content Security Policy | CSP headers blocking inline scripts |
| X-Content-Type-Options | `nosniff` header |
| X-Frame-Options | `DENY` header |
| Referrer-Policy | `strict-origin-when-cross-origin` |

### Data Layer

| Control | Implementation |
|---------|---------------|
| Database encryption | PostgreSQL TDE (at rest) |
| Password hashing | bcrypt (cost factor 12) |
| API keys | Environment variables, not in code |
| PII encryption | Sensitive fields encrypted at application level |
| Database access | Least-privilege database user |
| Backup encryption | Encrypted backups |

### Authentication Layer

| Control | Implementation |
|---------|---------------|
| Password policy | Min 8 chars, 1 uppercase, 1 number |
| Email verification | Required for organizers |
| Session expiry | 15 min JWT, 7 day refresh |
| OAuth 2.0 | Google OAuth with verified email |
| Failed login tracking | Rate limit + lockout after 10 attempts |
| Password reset tokens | 1 hour expiry, single use |

---

## 4. API Security

### Request Validation

```typescript
// All API routes use Zod for validation
import { z } from 'zod';

const createEventSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(10).max(5000),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  venueName: z.string().min(2).max(200),
  venueAddress: z.string().min(5).max(500),
  capacity: z.number().int().min(1).max(10000),
  ticketType: z.enum(['FREE', 'PAID']),
  price: z.number().positive().optional(),
  instruments: z.array(z.string()).optional(),
  skillLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL']),
  visibility: z.enum(['PUBLIC', 'PRIVATE']),
});

// Server-side validation only. Client validation is for UX only.
```

### Rate Limiting Configuration

```typescript
// /src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const rateLimiters = {
  auth: new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, '15 m'),
    prefix: 'rl:auth',
  }),
  api: new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(1000, '15 m'),
    prefix: 'rl:api',
  }),
  checkin: new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    prefix: 'rl:checkin',
  }),
  ticket: new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(30, '1 h'),
    prefix: 'rl:ticket',
  }),
};
```

---

## 5. Database Security

```prisma
// Example: Sensitive data handling
model User {
  // ...
  passwordHash String?  // bcrypt hashed, NOT plaintext
  
  // For future: application-level encryption
  // @@map("users")
}

// Audit log for all sensitive operations
model AuditLog {
  // All mutations on tickets, events, users are logged
}
```

### Database User Permissions

```sql
-- Application database user has limited permissions
CREATE USER jamming_app WITH PASSWORD '...';
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO jamming_app;
REVOKE CREATE, DROP, ALTER ON SCHEMA public FROM jamming_app;

-- Migration user has full access (CI/CD only)
CREATE USER jamming_migration WITH PASSWORD '...';
GRANT ALL PRIVILEGES ON DATABASE jamming TO jamming_migration;
```

---

## 6. Environment Variables

```env
# Required
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://jamming.com
QR_SECRET_KEY=...

# Authentication
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Optional (Phase 2)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
ETH_RPC_URL=https://sepolia.infura.io/v3/...
ETH_PRIVATE_KEY=0x...
TICKET_CONTRACT_ADDRESS=0x...
BLOCKCHAIN_SECRET=...

# Rate limiting
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# Email (Phase 2)
RESEND_API_KEY=re_...

# Object storage
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=jamming-uploads
```

### Secret Management Rules

- Never commit `.env` files
- Use `.env.example` with placeholder values
- Production secrets in Vercel Environment Variables
- Rotate keys every 90 days

---

## 7. CORS Configuration

```typescript
// next.config.js
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: process.env.FRONTEND_URL! },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PATCH, DELETE' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
        ],
      },
    ];
  },
};
```

---

## 8. Security Headers

```typescript
// next.config.js
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://api.stripe.com; frame-src 'self' https://js.stripe.com;" },
];
```

---

## 9. Security Checklist for Launch

- [ ] All API endpoints have input validation
- [ ] Rate limiting is enabled for auth and API endpoints
- [ ] HTTP-only cookies for session tokens
- [ ] TLS 1.3 enabled (via Vercel)
- [ ] All secrets are in environment variables
- [ ] Database uses parameterized queries (via Prisma)
- [ ] CORS is restricted to specific origins
- [ ] Security headers are set
- [ ] No sensitive data in client-side code
- [ ] Audit logging is active
- [ ] Failed login tracking is enabled
- [ ] Email verification is required for elevated roles
- [ ] Stripe webhook signature verification is enabled
- [ ] QR secrets are rotated or unique per batch
- [ ] Penetration test completed (external)
- [ ] Dependency audit (npm audit) shows no critical CVEs
