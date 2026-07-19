# Product Scope — Jamming Events Platform

## 1. In Scope (Phase 1 — MVP)

### Event Management
- Create, edit, cancel events
- Set date, time, venue, description, cover image
- Configure capacity and ticket types (free/paid)
- Set event visibility (public/private)
- Cancel events with attendee notification

### User Management
- Register with email + password
- Google OAuth login
- Profile management (name, photo, instrument, bio)
- Password reset
- Session management

### Ticketing
- Free RSVP tickets
- Unique QR code per ticket
- Ticket download (PDF)
- Ticket cancellation (Phase 2: refunds via Stripe)

### Event Discovery
- Browse upcoming events (card grid)
- Filter by date, instrument, venue
- Search by keyword
- Event detail page with full info
- Share event links

### QR Check-In
- Camera-based QR scanning
- Manual code entry fallback
- Real-time check-in status updates
- Check-in validation (valid/used/expired/cancelled)

### Organizer Dashboard (Basic)
- List of created events
- Attendee count and list
- Check-in status per attendee
- Basic event stats

### Notifications (Phase 1 — In-App)
- Confirmation after ticket purchase
- Event reminders (within platform)
- Cancellation notifications

## 2. In Scope (Phase 2)

- Blockchain ticket verification (Ethereum Sepolia)
- Stripe payment processing
- Email notifications (SendGrid/Resend)
- Waitlist management
- Advanced analytics and reporting
- Waitlist auto-promotion

## 3. In Scope (Phase 3)

- Recurring event scheduling
- Multi-session events (workshops/masterclasses)
- Progressive Web App (PWA) with offline support
- Community forum / discussion per event
- Public API for integrations
- Multi-language support
- Theme customization for organizers

## 4. Out of Scope (Explicitly Not Building)

- ❌ **Blockchain as product** — No crypto wallets, tokens, NFTs, or DeFi
- ❌ **Marketplace** — No secondary ticket sales or resale platform
- ❌ **Social network** — No feed, following, messaging, or matching
- ❌ **Streaming** — No live video or audio streaming
- ❌ **Booking for external venues** — No venue management system
- ❌ **Mobile native apps** — PWA only; no iOS/Android native
- ❌ **Music recording/practice tools** — No DAW, metronome, tuner
- ❌ **Gamification** — No badges, points, leaderboards
- ❌ **Advertising** — No ad serving or sponsored events
- ❌ **Affiliate system** — No referral programs

## 5. Feature Boundaries

| Feature | Phase | Notes |
|---------|-------|-------|
| Free ticketing | 1 | Always free, no payment info needed |
| Paid ticketing | 2 | Stripe integration |
| QR generation | 1 | Unique QR per ticket from day one |
| Blockchain verification | 2 | QR already exists; blockchain adds integrity layer |
| Email notifications | 2 | In-app notifications in Phase 1 |
| Organizer dashboard | 1 | Basic; advanced analytics in Phase 2 |

## 6. Technical Boundaries

- **Frontend:** Next.js (React) — no other framework
- **Backend:** Next.js API routes + Prisma ORM
- **Database:** PostgreSQL only
- **Auth:** NextAuth.js or Auth.js
- **Blockchain:** Ethereum-compatible (Sepolia testnet → mainnet)
- **QR:** Base QR generation → blockchain-signed QR in Phase 2
- **Payments:** Stripe only

## 7. Scalability Constraints

The MVP targets:
- Concurrent events: < 50
- Users: < 10,000
- Tickets per event: < 500
- Check-in throughput: < 100 scans/minute

Architecture supports scaling beyond these limits without redesign.

## 8. Future Considerations (Not Committed)

- White-label for other jamming communities
- Merchandise sales
- Donation/tip system for musicians
- Integration with music gear sponsors
- Recording session booking (studio time)
