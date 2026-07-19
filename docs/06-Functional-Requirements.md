# Functional Requirements — Jamming Events Platform

## 1. Scope

This document specifies the detailed functional requirements for the Jamming Events Platform MVP (Phase 1). Each requirement is traceable to a user story in [05-User-Stories.md](./05-User-Stories.md).

## 2. Requirements Format

```
FR-[Module]-[Number]: [Title]
- Description: [What the system must do]
- Acceptance Criteria: [Measurable conditions]
- Priority: [P0/P1/P2]
- Story Reference: [Story ID]
```

---

## 3. Event Management (E)

### FR-E-01: Create Event
- **Description:** Organizer can create a new jamming event via a form.
- **Fields:** Title, Description, Date, Start Time, End Time, Venue (Name + Address + Map), Cover Image, Capacity, Ticket Type (Free/Paid), Price (if paid), Instruments Needed (multi-select), Skill Level (Beginner/Intermediate/Advanced/All), Visibility (Public/Private)
- **Validation:** All required fields must be filled. Date/time must be in the future. Capacity > 0. Image must be < 5MB (jpg/png/webp).
- **Acceptance:** Event is created and visible in the database. Organizer is redirected to the event page.
- **Priority:** P0
- **Story:** E-01, E-02, E-03, E-04

### FR-E-02: Edit Event
- **Description:** Organizer can edit any field of an existing event except the event ID.
- **Constraints:** If tickets have already been sold, certain changes may require confirmation (date change, cancellation).
- **Acceptance:** Changes are persisted and visible immediately.
- **Priority:** P0
- **Story:** E-05

### FR-E-03: Cancel Event
- **Description:** Organizer can cancel an event. All ticket holders are notified (in-app).
- **Flow:** Confirm cancellation → Optional reason → Cancel all tickets → Notify attendees → Mark event as cancelled.
- **Acceptance:** Event status changes to `CANCELLED`. Tickets for this event are voided. Attendees see cancellation notice.
- **Priority:** P0
- **Story:** E-06

### FR-E-04: View Event Detail
- **Description:** Any user can view event details including title, description, date/time, venue, map, ticket availability, and attendee count.
- **Priority:** P0
- **Story:** D-02

### FR-E-05: Private Event
- **Description:** Organizer can mark an event as private (invite-only). Only users with an invite link can see and RSVP.
- **Priority:** P1
- **Story:** E-07

### FR-E-06: Duplicate Event
- **Description:** Organizer can duplicate an existing event as a template for a new event.
- **Priority:** P1
- **Story:** E-08

### FR-E-07: Waitlist
- **Description:** When an event reaches capacity, users can join a waitlist. If a spot opens, the first waitlisted user is automatically promoted.
- **Priority:** P1
- **Story:** E-09

---

## 4. User Management (U)

### FR-U-01: Register
- **Description:** User registers with email (validated) and password (min 8 chars, 1 uppercase, 1 number). Email verification required before ticket purchase.
- **Priority:** P0
- **Story:** U-01

### FR-U-02: Google OAuth
- **Description:** User can sign in with Google. Email from Google account is used.
- **Priority:** P0
- **Story:** U-02

### FR-U-03: Profile Management
- **Description:** User can update name, profile photo, bio, instrument(s), skill level.
- **Priority:** P0
- **Story:** U-03

### FR-U-04: Password Reset
- **Description:** User can request a password reset email with a time-limited token (15 minutes).
- **Priority:** P0
- **Story:** U-04

### FR-U-05: Guest RSVP
- **Description:** User can RSVP for a free event by providing only email and name. Account creation is optional.
- **Priority:** P1
- **Story:** U-05, T-07

---

## 5. Event Discovery (D)

### FR-D-01: Browse Events
- **Description:** Grid of upcoming events sorted by date (soonest first). Shows title, date, time, venue, cover image thumbnail, ticket availability.
- **Priority:** P0
- **Story:** D-01

### FR-D-02: Search Events
- **Description:** Full-text search on event title and description.
- **Priority:** P1
- **Story:** D-04

### FR-D-03: Filter Events
- **Description:** Filter by date range and instrument needed.
- **Priority:** P1
- **Story:** D-03

---

## 6. Ticketing (T)

### FR-T-01: RSVP Free Event
- **Description:** Logged-in user can RSVP for a free event with one click. A ticket is generated immediately.
- **Priority:** P0
- **Story:** T-01

### FR-T-02: Purchase Paid Ticket (Phase 2)
- **Description:** User selects ticket type, enters payment info via Stripe, receives ticket on successful payment.
- **Priority:** P1
- **Story:** T-02

### FR-T-03: Generate QR Ticket
- **Description:** On successful RSVP/purchase, a unique QR code is generated for the ticket. Contains ticket ID, event ID, and signature.
- **Priority:** P0
- **Story:** T-04

### FR-T-04: View My Tickets
- **Description:** User can view all their tickets in a "My Tickets" section with QR code display.
- **Priority:** P0
- **Story:** T-04

### FR-T-05: Download Ticket
- **Description:** User can download ticket as PDF containing QR code and event details.
- **Priority:** P1
- **Story:** T-05

### FR-T-06: Cancel Ticket
- **Description:** User can cancel their ticket (up to 24 hours before event). Spot is released to waitlist.
- **Priority:** P1
- **Story:** T-06

### FR-T-07: Ticket Confirmation
- **Description:** After successful booking, user sees an on-screen confirmation with ticket details.
- **Priority:** P0
- **Story:** N-01

---

## 7. QR Check-In (Q)

### FR-Q-01: Scan QR Code
- **Description:** Organizer/co-organizer can use device camera to scan a ticket QR code. System decodes and validates the ticket.
- **Priority:** P0
- **Story:** Q-01

### FR-Q-02: Scan Result Display
- **Description:** After scanning, display:
  - ✅ **Valid** — Green screen with attendee name. Ticket is marked as used.
  - ❌ **Used** — Yellow/amber screen. Ticket was already checked in.
  - ❌ **Invalid** — Red screen. Ticket does not exist or is forged.
  - ❌ **Cancelled** — Red screen with cancellation info.
- **Priority:** P0
- **Story:** Q-02

### FR-Q-03: Manual Code Entry
- **Description:** Fallback text input to enter ticket ID manually for attendees with damaged/broken screens.
- **Priority:** P1
- **Story:** Q-04

### FR-Q-04: Real-Time Check-In Stats
- **Description:** Organizer dashboard shows live count of checked-in attendees vs total tickets.
- **Priority:** P0
- **Story:** Q-03

---

## 8. Organizer Dashboard (O)

### FR-O-01: Events List
- **Description:** Organizer sees all their events with status (Draft/Active/Cancelled/Completed), ticket count, check-in count.
- **Priority:** P0
- **Story:** O-01

### FR-O-02: Attendee List
- **Description:** Organizer can view all attendees for an event with name, email, ticket type, check-in status, check-in time.
- **Priority:** P0
- **Story:** O-02

### FR-O-03: Export Attendees
- **Description:** Export attendee list as CSV.
- **Priority:** P1
- **Story:** O-04

---

## 9. Blockchain & Security (B)

*Phase 2 feature*

### FR-B-01: Ticket Hash Generation
- **Description:** On ticket creation, a SHA-256 hash of (TicketID + EventID + UserID + Secret) is generated and stored on Ethereum Sepolia.
- **Priority:** P1
- **Story:** B-01

### FR-B-02: On-Chain Verification
- **Description:** QR scan trigger checks the ticket hash against the blockchain record to verify authenticity.
- **Priority:** P1
- **Story:** B-02

### FR-B-03: Audit Log
- **Description:** Every check-in action is logged with timestamp, scanner ID, ticket ID, and result.
- **Priority:** P1
- **Story:** B-03

---

## 10. Notifications (N)

### FR-N-01: In-App Confirmation
- **Description:** Post-RSVP/purchase, an on-screen notification confirms success.
- **Priority:** P0
- **Story:** N-01

### FR-N-02: Email Confirmation (Phase 2)
- **Description:** On booking, email confirmation with ticket details and QR code is sent.
- **Priority:** P1
- **Story:** N-02

### FR-N-03: Event Reminder
- **Description:** 24 hours before event, user receives notification.
- **Priority:** P1
- **Story:** N-03

### FR-N-04: Cancellation Notice
- **Description:** If event is cancelled, all ticket holders are notified via in-app notification (and email in Phase 2).
- **Priority:** P0
- **Story:** N-05

---

## 11. Admin Features (Phase 2+)

| FR-ID | Description | Priority |
|-------|-------------|----------|
| FR-A-01 | View all events (super admin) | P2 |
| FR-A-02 | Manage user accounts (suspend/ban) | P2 |
| FR-A-03 | Platform analytics dashboard | P2 |
| FR-A-04 | Configure platform settings | P2 |

---

## Requirements Traceability Matrix

| Module | Count | P0 | P1 | P2 |
|--------|-------|----|----|----|
| Event Management | 7 | 4 | 2 | 1 |
| User Management | 5 | 4 | 1 | 0 |
| Event Discovery | 3 | 1 | 2 | 0 |
| Ticketing | 7 | 4 | 3 | 0 |
| QR Check-In | 4 | 3 | 1 | 0 |
| Organizer Dashboard | 3 | 2 | 1 | 0 |
| Blockchain & Security | 3 | 0 | 3 | 0 |
| Notifications | 4 | 2 | 2 | 0 |
| Admin | 4 | 0 | 0 | 4 |
| **Total** | **40** | **20** | **15** | **5** |
