# Technical Architecture — Jamming Events Platform

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────┐    │
│  │ Next.js App  │  │ PWA Worker  │  │ Browser Scanner API   │    │
│  │ (React SPA)  │  │ (Offline)   │  │ (navigator.media)     │    │
│  └──────┬───────┘  └──────┬──────┘  └───────────┬───────────┘    │
│         │                  │                     │                │
└─────────┼──────────────────┼─────────────────────┼────────────────┘
          │                  │                     │
          ▼                  ▼                     ▼
┌──────────────────────────────────────────────────────────────────┐
│                       API LAYER (Next.js)                        │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Next.js API Routes (/api/*)                             │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │    │
│  │  │ Auth API │ │ Events   │ │ Tickets  │ │ Check-In │    │    │
│  │  │          │ │ API      │ │ API      │ │ API      │    │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                  │    │
│  │  │ Users    │ │ Payments │ │ Block-   │                  │    │
│  │  │ API      │ │ API      │ │ chain API│                  │    │
│  │  └──────────┘ └──────────┘ └──────────┘                  │    │
│  └──────────────────────────────────────────────────────────┘    │
│         │                                                         │
└─────────┼─────────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────────────┐
│                     SERVICE LAYER                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐    │
│  │ Auth     │ │ Event    │ │ Ticket   │ │ QR/Blockchain    │    │
│  │ Service  │ │ Service  │ │ Service  │ │ Service          │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                        │
│  │ Payment  │ │ Email    │ │ Audit    │                        │
│  │ Service  │ │ Service  │ │ Service  │                        │
│  └──────────┘ └──────────┘ └──────────┘                        │
│         │                                                         │
└─────────┼─────────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                   │
│  ┌────────────────┐ ┌────────────────┐ ┌──────────────────┐     │
│  │  PostgreSQL     │ │  Redis (Cache) │ │  Ethereum Sepolia │     │
│  │  (Primary DB)   │ │  (Session,     │ │  (Ticket Hashes)  │     │
│  │  + Prisma ORM   │ │   Rate Limits) │ │  (Phase 2)        │     │
│  └────────────────┘ └────────────────┘ └──────────────────┘     │
│  ┌────────────────┐ ┌────────────────┐                          │
│  │  S3/Blob Store  │ │  Stripe        │                          │
│  │  (Images)       │ │  (Payments)    │                          │
│  └────────────────┘ └────────────────┘                          │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 14+ (App Router) | Full-stack framework |
| React | 18+ | UI library |
| TypeScript | 5+ | Type safety |
| Tailwind CSS | 3+ | Utility-first styling |
| Framer Motion | Latest | Animations |
| React Query (TanStack Query) | 5+ | Server state management |
| Zustand | 4+ | Client state management |
| React Hook Form | Latest | Form handling |
| Zod | Latest | Schema validation |
| @yudiel/react-qr-scanner | Latest | QR scanning (replaces deprecated react-qr-reader) |
| qrcode | Latest | QR generation |

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js API Routes | 14+ | Backend API |
| Prisma ORM | 5+ | Database access |
| NextAuth.js / Auth.js | Latest | Authentication |
| Stripe SDK | Latest | Payment processing |
| ethers.js | 6+ | Blockchain interaction (Phase 2) |

### Database

| Technology | Purpose |
|-----------|---------|
| PostgreSQL 15+ | Primary database |
| Redis (Upstash/Vercel KV) | Caching, sessions, rate limiting |

### Infrastructure

| Service | Purpose |
|---------|---------|
| Vercel | Hosting + Serverless functions |
| Supabase / Neon | PostgreSQL hosting |
| S3 (AWS) / R2 (Cloudflare) | Image storage |
| GitHub Actions | CI/CD |

---

## 3. Architecture Principles

### 3.1 Modular Architecture

Each service is independently:
- **Testable** — Unit + integration tests
- **Replaceable** — Dependency injection, interface-based
- **Documented** — Clear API contracts

```
services/
├── auth.service.ts        # Authentication logic
├── event.service.ts       # Event CRUD
├── ticket.service.ts      # Ticket generation, validation
├── payment.service.ts     # Stripe interactions (Phase 2)
├── checkin.service.ts     # QR scan verification
├── blockchain.service.ts  # Ethereum interactions (Phase 2)
├── notification.service.ts# In-app + email notifications
└── audit.service.ts       # Audit logging
```

### 3.2 API Design

- **RESTful** endpoints under `/api/*`
- **Input validation** via Zod on every endpoint
- **Consistent error format**

```typescript
// API Response format
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>; // Field-level errors
  };
  meta?: {
    page: number;
    pageSize: number;
    total: number;
  };
}
```

### 3.3 Error Handling Strategy

```
API Route
  → Zod validation error → 400 (validation_error)
  → Auth error → 401 (unauthorized)
  → Permission error → 403 (forbidden)
  → Not found → 404 (not_found)
  → Rate limit → 429 (rate_limited)
  → Business logic error → 409 (conflict)
  → Server error → 500 (internal_error)
  → Success → 200 / 201
```

### 3.4 Authentication Flow

```
[Client] → Login → [NextAuth]
  → Session created → JWT stored in HTTP-only cookie
  → API requests → NextAuth middleware validates session
  → Protected routes → Redirect to login if unauthorized
  → API routes → getServerSession() for route protection
```

---

## 4. Folder Structure

```
jamming/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (public)/           # Public routes layout
│   │   │   ├── events/
│   │   │   ├── about/
│   │   │   └── legal/
│   │   ├── (auth)/             # Auth routes layout
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── forgot-password/
│   │   │   └── reset-password/
│   │   ├── (dashboard)/        # Dashboard routes layout
│   │   │   ├── dashboard/
│   │   │   └── scanner/
│   │   ├── api/                # API routes
│   │   │   ├── auth/
│   │   │   ├── events/
│   │   │   ├── tickets/
│   │   │   ├── checkin/
│   │   │   ├── users/
│   │   │   ├── payments/       # Phase 2
│   │   │   └── blockchain/     # Phase 2
│   │   └── layout.tsx
│   │
│   ├── components/             # React components
│   │   ├── ui/                 # Shared UI components
│   │   ├── events/             # Event-related components
│   │   ├── tickets/            # Ticket-related components
│   │   ├── scanner/            # QR scanner components
│   │   ├── dashboard/          # Dashboard components
│   │   └── layout/             # Layout components
│   │
│   ├── lib/                    # Core utilities
│   │   ├── services/           # Business logic services
│   │   ├── validations/        # Zod schemas
│   │   ├── utils/              # Helper functions
│   │   ├── constants.ts        # App constants
│   │   └── types.ts            # Shared TypeScript types
│   │
│   ├── hooks/                  # Custom React hooks
│   ├── providers/              # React context providers
│   ├── styles/                 # Global styles
│   └── middleware.ts           # Next.js middleware
│
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── migrations/             # Migration files
│   └── seed.ts                 # Seed data
│
├── contracts/                  # Smart contracts (Phase 2)
│   └── TicketVerification.sol
│
├── docs/                       # Project documentation
├── public/                     # Static assets
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .env.example
├── .eslintrc.js
├── .prettierrc
├── tailwind.config.ts
├── tsconfig.json
├── next.config.js
├── package.json
└── README.md
```

---

## 5. Key Design Decisions

### Why Next.js App Router?
- Full-stack in one codebase (simpler deployment)
- Server Components for performance
- API routes for backend
- Built-in image optimization

### Why Prisma ORM?
- Type-safe database access
- Auto-generated TypeScript types
- Migration management
- Great DX with autocomplete

### Why PostgreSQL?
- Reliable ACID compliance for ticket integrity
- Strong ecosystem
- JSON support for flexible metadata

### Why not Microservices?
- Simplicity for current scale
- Single codebase deploy
- Monolith-first, extract when needed

### Why Blockchain (Phase 2)?
- Tamper-proof ticket verification
- Decentralized audit trail
- NOT for user-facing crypto features

---

## 6. Scalability Strategy

| Component | Current Scale | Scaling Strategy |
|-----------|--------------|------------------|
| Web Server | Single Vercel deployment | Vercel auto-scales |
| Database | 1 instance | Read replicas, connection pooling |
| Image Storage | S3 bucket | CDN (CloudFront) |
| Cache | Redis single instance | Redis cluster |
| Blockchain | Sepolia (test) → Mainnet | Batch writes, async |

---

## 7. Monitoring & Observability

| Tool | Purpose |
|------|---------|
| Vercel Analytics | Web Vitals, page views |
| Sentry | Error tracking |
| LogRocket | Session replay |
| PostgreSQL logs | Database monitoring |
| Custom audit service | Business-level audit trail |
