# API Specification — Jamming Events Platform

## 1. API Base

Base URL: `/api/v1` (development)
Content-Type: `application/json`
Auth: Bearer token in HTTP-only cookie (via NextAuth)

---

## 2. Standard Response Format

```typescript
// Success
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "pageSize": 20, "total": 42 }
}

// Error
{
  "success": false,
  "error": {
    "code": "validation_error",
    "message": "Invalid input",
    "details": { "email": ["Invalid email format"] }
  }
}
```

---

## 3. Endpoints

### 3.1 Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login |
| POST | `/api/auth/logout` | Yes | Logout |
| GET | `/api/auth/session` | Optional | Get session |
| POST | `/api/auth/verify-email` | Yes | Verify email |
| POST | `/api/auth/forgot-password` | No | Request reset |
| POST | `/api/auth/reset-password` | No | Reset password |

### 3.2 Events

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/events` | No | List events (paginated, filterable) |
| GET | `/api/events/[id]` | No | Get event by ID |
| POST | `/api/events` | Yes (Org) | Create event |
| PATCH | `/api/events/[id]` | Yes (Owner) | Update event |
| DELETE | `/api/events/[id]` | Yes (Owner) | Delete/cancel event |
| GET | `/api/events/[id]/attendees` | Yes (Owner) | Get attendee list |
| GET | `/api/events/[id]/stats` | Yes (Owner) | Get event stats |

### 3.3 Tickets

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/events/[id]/tickets` | Yes | RSVP / purchase ticket |
| GET | `/api/tickets` | Yes | Get user's tickets |
| GET | `/api/tickets/[id]` | Yes | Get ticket details |
| DELETE | `/api/tickets/[id]` | Yes | Cancel ticket |
| GET | `/api/tickets/[id]/qr` | Yes | Get QR data URL |

### 3.4 Check-In

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/checkin` | Yes (Org) | Verify and process check-in |
| GET | `/api/events/[id]/checkins` | Yes (Owner) | Get check-in records |
| GET | `/api/events/[id]/checkins/stats` | Yes (Owner) | Get real-time stats |

### 3.5 Waitlist

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/events/[id]/waitlist` | Yes | Join waitlist |
| DELETE | `/api/events/[id]/waitlist` | Yes | Leave waitlist |
| GET | `/api/events/[id]/waitlist` | Yes (Org) | View waitlist |
| POST | `/api/events/[id]/waitlist/promote` | Yes (Org) | Manually promote from waitlist |

### 3.6 Users / Profile

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users/me` | Yes | Get current user profile |
| PATCH | `/api/users/me` | Yes | Update profile |
| DELETE | `/api/users/me` | Yes | Delete account |
| POST | `/api/users/me/organizer` | Yes | Request organizer role |

### 3.7 Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/notifications` | Yes | Get user's notifications |
| PATCH | `/api/notifications/[id]` | Yes | Mark as read |
| POST | `/api/notifications/read-all` | Yes | Mark all as read |

### 3.8 Blockchain (Phase 2)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/tickets/[id]/verify` | Yes (Org) | Verify ticket against blockchain |
| GET | `/api/tickets/[id]/blockchain` | Yes | Get blockchain record |

### 3.9 Payments (Phase 2)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/payments/create-intent` | Yes | Create Stripe payment intent |
| POST | `/api/payments/webhook` | No (Stripe) | Stripe webhook handler |
| GET | `/api/payments/history` | Yes | Get payment history |

---

## 4. Detailed Endpoint Specifications

### GET /api/events

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `pageSize` | number | 20 | Items per page (max 50) |
| `dateFrom` | ISO date | now | Filter events from this date |
| `dateTo` | ISO date | null | Filter events to this date |
| `instrument` | string | null | Filter by instrument |
| `skillLevel` | enum | null | Filter by skill level |
| `q` | string | null | Search query |
| `status` | enum | ACTIVE | Event status filter |
| `ticketType` | enum | null | Filter by ticket type (FREE / PAID) |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Jazz Night at The Bottleneck",
      "slug": "jazz-night-at-the-bottleneck",
      "coverImageUrl": "https://...",
      "startDate": "2026-04-15",
      "startTime": "20:00",
      "venueName": "The Bottleneck",
      "venueAddress": "123 Main St, Austin, TX",
      "capacity": 50,
      "ticketType": "FREE",
      "price": null,
      "instruments": ["Guitar", "Bass", "Drums"],
      "skillLevel": "ALL",
      "status": "ACTIVE",
      "organizerName": "Maya Chen",
      "_count": { "tickets": 42 }
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "total": 15 }
}
```

### POST /api/events/[id]/tickets

**Request Body:**
```json
{
  "type": "FREE"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "ticketNumber": "JAM-2026-0042",
    "status": "ACTIVE",
    "qrDataUrl": "data:image/png;base64,...",
    "purchasedAt": "2026-04-10T15:30:00Z"
  }
}
```

**Error (409 — Event Full):**
```json
{
  "success": false,
  "error": {
    "code": "event_full",
    "message": "This event has reached capacity. Join the waitlist.",
    "details": { "waitlistAvailable": true }
  }
}
```

### POST /api/checkin

**Request Body:**
```json
{
  "ticketId": "uuid",
  "eventId": "uuid",
  "method": "QR"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "VALID",
    "ticketNumber": "JAM-2026-0042",
    "attendeeName": "Alex Rivera",
    "message": "Check-in successful"
  }
}
```

**Error (400 — Already Used):**
```json
{
  "success": false,
  "data": {
    "status": "USED",
    "message": "This ticket was already used at 7:32 PM"
  }
}
```

### POST /api/auth/register

**Request Body:**
```json
{
  "email": "alex@example.com",
  "password": "SecurePass1",
  "displayName": "Alex Rivera",
  "instruments": ["Drums"],
  "skillLevel": "INTERMEDIATE"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "alex@example.com",
    "displayName": "Alex Rivera",
    "role": "USER",
    "emailVerified": false
  }
}
```

---

## 5. Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `validation_error` | 400 | Input validation failed |
| `unauthorized` | 401 | Not authenticated |
| `forbidden` | 403 | Insufficient permissions |
| `not_found` | 404 | Resource not found |
| `conflict` | 409 | Resource conflict (e.g., already RSVP'd) |
| `event_full` | 409 | Event at capacity |
| `rate_limited` | 429 | Too many requests |
| `internal_error` | 500 | Server error |
| `payment_required` | 402 | Payment needed (Phase 2) |
| `blockchain_error` | 502 | Blockchain verification failure (Phase 2) |

---

## 6. Pagination

All list endpoints support cursor-based pagination:

```json
{
  "data": [...],
  "meta": {
    "page": 2,
    "pageSize": 20,
    "total": 85,
    "hasNextPage": true,
    "hasPrevPage": true
  }
}
```

---

## 7. Rate Limiting

| Endpoint Group | Limit | Window |
|---------------|-------|--------|
| Auth (login, register) | 10 req | 15 minutes |
| Event creation | 20 req | 1 hour |
| Ticket purchase | 30 req | 1 hour |
| Check-in scans | 100 req | 1 minute |
| General API | 1000 req | 15 minutes |

---

## 8. Webhooks

### Stripe Webhook (Phase 2)

| Event | Action |
|-------|--------|
| `payment_intent.succeeded` | Mark ticket as paid |
| `payment_intent.payment_failed` | Notify user, retry |
| `charge.refunded` | Mark ticket as refunded |

---

## 9. API Versioning

- Current version: v1 (implicit, no prefix for simplicity)
- Breaking changes: new endpoint paths, old paths maintained for 90 days
- Deprecation header: `X-API-Deprecated: true` with sunset date
