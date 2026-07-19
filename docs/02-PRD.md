# Product Requirements Document (PRD) — Jamming Events Platform

## 1. Overview

| Field | Value |
|-------|-------|
| **Product Name** | Jamming |
| **Version** | 1.0.0 |
| **Status** | Final (v1.0.0) |
| **Frozen At** | July 15, 2026 |
| **Product Type** | Web Application |
| **Target Platform** | Modern browsers (Chrome, Firefox, Safari, Edge) |
| **Primary Language** | English |

## 2. Problem Statement

Our music community currently manages jamming sessions through fragmented tools — WhatsApp groups, spreadsheets, manual payments, paper check-ins. This leads to:

- Double bookings and overcapacity
- No-show attendees with no consequence
- Manual ticketing with zero fraud protection
- Painful attendee check-in at venues
- No analytics on event performance
- Organizer burnout from administrative overhead

## 3. Product Goals

1. **Simplify Event Creation** — Organizers can create a fully-configured event in under 30 seconds
2. **Delight Attendees** — Beautiful discovery and frictionless ticket purchase/RSVP
3. **Eliminate Fraud** — Every ticket is cryptographically signed and verifiable
4. **Streamline Check-In** — Sub-second QR scanning at venue doors
5. **Provide Insight** — Real-time dashboards for organizers

## 4. Target Users

See [04-User-Personas.md](./04-User-Personas.md) for detailed personas.

| Persona | Role | Primary Need |
|---------|------|-------------|
| Maya | Organizer / Session Leader | Create and manage jamming events |
| Alex | Regular Attendee / Musician | Discover sessions and book tickets |
| Jordan | Guest Attendee | Quick RSVP for one-off events |
| Sam | Co-Organizer | Assist with event operations |
| Casey | Venue Host | Coordinate with organizers |

## 5. Release Phases

### Phase 1 (MVP) — Core Platform
- Event creation and listing
- Free and paid ticketing
- User registration and profiles
- QR ticket generation and scanning
- Organizer dashboard (basic)

### Phase 2 — Premium Features
- Blockchain ticket verification (audit trail)
- Payment gateway integration (Stripe)
- Email notifications
- Waitlist management
- Event analytics

### Phase 3 — Advanced
- Recurring event scheduling
- Multi-session events (workshops)
- Mobile-responsive PWA
- Community forum / chat
- API for third-party integration

## 6. Key Features

| Priority | Feature | Description |
|----------|---------|-------------|
| P0 | Event Creation | Rich form with date, time, venue, capacity, pricing |
| P0 | Ticket Purchase | RSVP/free checkout flow with ticket generation |
| P0 | QR Ticket | Unique QR code per ticket, downloadable |
| P0 | QR Scanning | Camera-based scan for venue check-in |
| P0 | User Accounts | Email + password or Google OAuth |
| P0 | Event Discovery | Browse and search upcoming events |
| P1 | Blockchain Verification | Ticket hash stored on-chain for integrity |
| P1 | Payment Processing | Stripe integration for paid events |
| P1 | Attendee Dashboard | View purchased tickets and history |
| P1 | Organizer Dashboard | Event stats, attendee list, check-in status |
| P1 | Email Notifications | Confirmations and reminders |
| P2 | Waitlist | Auto-promote when spots open |
| P2 | Recurring Events | Weekly/monthly session templates |
| P2 | Analytics | Attendance trends, revenue reports |
| P2 | PWA | Offline ticket access |

## 7. User Stories

See [05-User-Stories.md](./05-User-Stories.md) for the complete backlog.

## 8. Constraints & Assumptions

### Assumptions
- Users have modern smartphones with cameras for QR scanning
- Internet connectivity is available at event venues (with offline fallback)
- Organizers have basic technical literacy

### Constraints
- Blockchain layer must be invisible to end users
- Mobile-first responsive design required
- GDPR/privacy compliance for user data
- No cryptocurrency or wallet management exposed to users

## 9. Dependencies

| Dependency | Purpose | Phase |
|------------|---------|-------|
| Next.js 14+ | Frontend framework | MVP |
| PostgreSQL | Primary database | MVP |
| Prisma ORM | Database access | MVP |
| Stripe | Payment processing | Phase 2 |
| Ethereum (Sepolia) | Ticket hash storage | Phase 2 |
| SendGrid/Resend | Email delivery | Phase 2 |
| Vercel / Docker | Hosting | MVP |

## 10. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Low attendance at events | Medium | Medium | Marketing, quality events |
| Ticket fraud attempts | Low | High | Blockchain verification |
| Payment processing failures | Low | High | Stripe retries, fallback |
| Server downtime during events | Low | High | Offline QR fallback |
| User privacy breach | Low | Critical | Encryption, audit logging |
