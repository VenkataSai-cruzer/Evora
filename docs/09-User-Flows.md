# User Flows — Jamming Events Platform

## 1. Flow Notation

```
[Page/Step] → [Action] → [Page/Step] → [Decision]
```

- **Rounded rectangle:** Page/screen
- **Arrow:** Action/transition
- **Diamond:** Decision point
- **Red:** Error/edge case path

---

## 2. Core Flow: Event Discovery → RSVP → Entry

```
User visits website
    ↓
[Homepage] — Browse upcoming events grid
    ↓ (clicks event card)
[Event Detail Page]
    ├── See: date, time, venue, description, capacity, instrument needs
    ├── See: current attendee count
    ├── See: "Instruments Needed" tags
    └── [RSVP / Get Tickets Button]
            ↓ (clicks)
            ├── If [FREE] → [Confirm RSVP Modal]
            │       ↓ (confirms)
            │   [Ticket Confirmation Page]
            │       └── Shows QR code, event details, "Add to Calendar" link
            │           ↓ (user arrives at venue)
            │       [Venue Check-In]
            │           └── Organizer scans QR → [Valid] → Entry granted
            │                                  → [Used] → Already checked in
            │                                  → [Invalid] → Denied
            │
            └── If [PAID] → [Checkout Page] (Phase 2)
                    ↓ (Stripe payment)
                [Payment Processing]
                    ├── Success → [Ticket Confirmation Page] (QR + details)
                    ├── Failed → [Error Message] → Retry or cancel
                    └── Cancelled → Return to event page
```

---

## 3. Flow: Event Creation (Organizer)

```
[Organizer Dashboard]
    ↓ (clicks "Create Event")
[Create Event Form]
    ├── Section 1: Basic Info
    │   ├── Event Title (required)
    │   ├── Description (required)
    │   └── Cover Image (optional, upload)
    │
    ├── Section 2: Date & Venue
    │   ├── Date (required, future date)
    │   ├── Start Time (required)
    │   ├── End Time (optional)
    │   ├── Venue Name (required)
    │   └── Venue Address (required)
    │
    ├── Section 3: Capacity & Tickets
    │   ├── Maximum Capacity (required)
    │   ├── Ticket Type: Free / Paid
    │   └── Price (if paid)
    │
    ├── Section 4: Music Details
    │   ├── Instruments Needed (multi-select: Guitar, Bass, Drums, Keys, Vocals, Horns, etc.)
    │   └── Skill Level (Beginner / Intermediate / Advanced / All)
    │
    └── Section 5: Visibility
        ├── Public / Private (invite only)
        └── [Create Event Button]
                ↓
            [Validation]
                ├── ✅ Pass → [Event Created] → Redirect to Event Detail Page
                └── ❌ Fail → Show inline errors
```

---

## 4. Flow: QR Check-In (Scanner)

```
[Organizer Dashboard → Event → "Check-In" Button]
    ↓
[Scanner Screen]
    ├── Camera viewfinder (full-screen, vertical phone orientation)
    ├── Recent scan log at bottom
    └── Manual code entry button
            ↓ (scans QR)
        [Processing...] (spinner, <1 second)
            ↓
        ┌──────────────────────────────┐
        │         RESULT               │
        ├──────────────────────────────┤
        │ ✅ VALID                     │
        │ Name: Alex Rivera            │
        │ Ticket: DRUMMER-GOLD-1234    │
        │ Time: 7:30 PM                │
        │ [Mark as Entered]            │
        │   → Green background         │
        │   → Success sound            │
        └──────────────────────────────┘
            ↓ (auto-dismiss after 3 seconds, or tap "Scan Next")
        [Back to Scanner — Ready for next scan]
```

### Edge Cases in Scanning Flow

```
[Scan QR]
    ├── 📱 Already Used → Amber screen: "This ticket was already used at 7:32 PM"
    ├── ❌ Invalid/Not Found → Red screen: "Invalid ticket. Please check the code."
    ├── ❌ Cancelled → Red screen: "This ticket has been cancelled."
    ├── ❌ Wrong Event → Red screen: "This ticket is for a different event."
    └── ❌ Scanner Error → Error toast: "Camera access denied. Use manual entry."
```

---

## 5. Flow: User Registration

```
[Any page] → [Sign Up Button]
    ↓
[Sign Up Page]
    ├── Email (required, valid format)
    ├── Password (required, min 8 chars, 1 uppercase, 1 number)
    ├── Confirm Password
    ├── Name / Display Name (required)
    └── [Create Account Button]
            ↓
        [Validation]
            ├── ✅ → [Email Verification Sent] → User checks email → Clicks link → [Account Verified]
            └── ❌ → Show inline error (e.g., "Email already registered")
```

### Alternative Flow: Google OAuth

```
[Sign Up Page] → [Continue with Google Button]
    ↓
[Google OAuth Consent Screen]
    ↓ (user approves)
[Redirect back to Jamming]
    ├── ✅ New user → Profile setup prompt (optional)
    └── ✅ Returning user → Redirect to origin page
```

---

## 6. Flow: Ticket Cancellation

```
[User Profile → "My Tickets"]
    ↓ (selects ticket)
[Ticket Detail]
    ├── QR code
    ├── Event details
    └── [Cancel Ticket Button] (visible if event > 24h away)
            ↓
        [Confirmation Modal]
            ├── "Are you sure? Your spot will be released."
            ├── Reason dropdown (optional)
            └── [Confirm Cancellation] / [Keep Ticket]
                    ↓ (if confirmed)
                [Ticket Cancelled]
                    ├── Ticket marked as CANCELLED
                    ├── Spot released to waitlist (if waitlist exists)
                    └── Organizer notified
```

---

## 7. Flow: Waitlist

```
[Event Page — Full]
    ↓ (capacity reached)
[RSVP Button] → [Join Waitlist Button]
    ↓ (clicks)
[Waitlist Confirmation]
    ├── "You're #3 on the waitlist"
    └── [Leave Waitlist] option
            ↓ (someone cancels)
        [Auto-Promotion]
            ├── Waitlisted user #1 gets ticket
            ├── Email notification sent
            └── Must claim within 24 hours or pass to next
```

---

## 8. High-Level User Journey Map

### Attendee Journey

```
Discovery → Interest → Registration (or Guest) → RSVP/Purchase → Confirmation → Arrival → Check-In → Experience → Feedback
   │           │             │                     │              │              │         │           │           │
Browse      Read         Create or               Secure         View QR        Go to    QR scan    Enjoy      Rate the
events      details      sign in                  ticket         on phone      venue    at door    session    event
```

### Organizer Journey

```
Login → Dashboard → Create Event → Publish → Monitor RSVPs → Pre-Event Prep → At Venue → Check-In → Post-Event → Analytics
  │        │            │            │            │               │              │        │            │           │
Sign in  View my     Fill event    Event      See who's       Print QR        Open     Scan       Close      Review
         events      form         is live     coming +         posters or      scanner  tickets    event      attendance
                                             manage waitlist   just use app                                 + feedback
```

---

## 9. Error & Edge Case Flows

### Error Flow: Payment Failure (Phase 2)

```
[Checkout → Payment]
    ↓ (payment fails)
[Error Screen]
    ├── "Payment failed. Your card has not been charged."
    ├── Possible reasons: insufficient funds, expired card, bank decline
    ├── [Try Again] → Returns to payment form
    └── [Try Different Card] → Select new payment method
```

### Error Flow: Scanning Without Camera Permission

```
[Scanner Screen — No Camera Permission]
    ├── Message: "Camera access is needed to scan QR codes"
    ├── [Enable Camera] → Browser permission prompt
    └── [Manual Entry] → Opens text input for ticket code
```

### Error Flow: Network Offline

```
[Any action requiring network]
    ├── Banner: "You appear to be offline"
    ├── Cached tickets are still viewable
    ├── Scanning uses local verification with sync later
    └── [Retry] button for pending actions
```

---

## 10. Flow: Block Verification (Blockchain - Phase 2)

```
[Ticket Creation]
    ↓
[Generate keccak256 hash of (ticketID + eventID + userID + serverSecret + timestamp)]
    ↓
[Store hash on Ethereum Sepolia via smart contract]
    ↓
[Ticket QR contains: ticketID + signature]
    ↓
[At scan time]
    ↓
[Read ticketID from QR]
    ↓
[Look up hash on blockchain]
    ├── ✅ Hash matches → Valid ticket
    └── ❌ Hash not found or mismatch → Invalid ticket
    ↓
[Verification result returned to scanner app]
```

*Blockchain interaction is server-side; scanner app only sees the result.*
