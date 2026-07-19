# Information Architecture — Jamming Events Platform

## 1. Content Inventory

| Content Type | Description | Example |
|-------------|-------------|---------|
| Event | A jamming session with date, venue, capacity | "Jazz Night at The Bottleneck" |
| User | Registered member profile | Alex Rivera, drummer |
| Ticket | Proof of RSVP/purchase for an event | QR ticket for Jazz Night |
| Organization | Container for events owned by a user | Maya's sessions |
| Venue | Location where event takes place | "The Bottleneck, 123 Main St" |

---

## 2. Object Model & Relationships

```
User (1) ──────> (N) Organization
User (1) ──────> (N) Ticket
User (1) ──────> (N) Event (as organizer)

Organization (1) ──> (N) Event

Event (1) ──────> (N) Ticket
Event (1) ──────> (N) CheckIn

Ticket (1) ──────> (1) CheckIn (optional)
Ticket (1) ──────> (1) QRCode
Ticket (1) ──────> (1) BlockchainHash (Phase 2)

Venue (1) ──────> (N) Event
```

---

## 3. Content Hierarchy

### Event Content

```
Event
├── Title (string, 5-100 chars)
├── Slug (URL-safe, auto-generated)
├── Description (markdown, max 5000 chars)
├── Cover Image (URL, max 5MB)
├── Date & Time
│   ├── Start Date (YYYY-MM-DD)
│   ├── Start Time (HH:MM)
│   ├── End Date (optional)
│   └── End Time (optional)
├── Venue
│   ├── Name
│   ├── Address
│   ├── City
│   └── Map Coordinates (lat, lng)
├── Capacity (integer, 1-10000)
├── Ticket Type (enum: FREE | PAID)
├── Price (decimal, if paid)
├── Instruments Needed (array of tags)
│   └── e.g., ["Guitar", "Bass", "Drums", "Vocals", "Keys"]
├── Skill Level (enum: BEGINNER | INTERMEDIATE | ADVANCED | ALL)
├── Visibility (enum: PUBLIC | PRIVATE)
├── Status (enum: DRAFT | ACTIVE | CANCELLED | COMPLETED)
├── Created At (timestamp)
└── Updated At (timestamp)
```

### User Profile

```
User
├── ID (UUID)
├── Email (unique, verified)
├── Display Name
├── Password Hash (bcrypt)
├── Avatar URL (optional)
├── Bio (max 500 chars, optional)
├── Instruments (array of string tags)
├── Skill Level (enum)
├── Role (enum: USER | ORGANIZER | ADMIN)
├── Email Verified (boolean)
├── Auth Provider (enum: EMAIL | GOOGLE)
├── Created At
└── Updated At
```

### Ticket

```
Ticket
├── ID (UUID)
├── Ticket Number (human-readable, e.g., "JAM-2026-0001")
├── Event ID (FK → Event)
├── User ID (FK → User)
├── Type (enum: FREE | PAID)
├── Status (enum: ACTIVE | USED | CANCELLED | REFUNDED)
├── QR Code
│   ├── Data URL (generated)
│   └── Secret (signed payload)
├── Blockchain Hash (Phase 2)
├── Purchase Date
└── Cancelled Date (nullable)
```

### Check-In Record

```
CheckIn
├── ID (UUID)
├── Ticket ID (FK → Ticket)
├── Event ID (FK → Event)
├── Scanner ID (FK → User)
├── Status (enum: VALID | USED | INVALID | CANCELLED)
├── Verification Method (enum: QR | MANUAL | BLOCKCHAIN)
├── Timestamp
└── Metadata (JSON)
    └── e.g., { "browser": "Chrome", "ip": "192.168.x.x" }
```

---

## 4. Navigation Architecture

### Global Navigation (Header)

```
[Logo]             [Events] [My Tickets] [Dashboard] [Profile ▾] [🔔]
                                                                    └── Notification count badge
```

### Footer Navigation

```
[Logo]  [Events]  [About]  [Privacy]  [Terms]  [Cookie Policy]

© 2026 Jamming. Made for musicians.
```

### Dashboard Navigation (Sidebar)

```
┌─────────────────────┐
│ [Logo]              │
│                     │
│ 📊 Overview         │
│ 📅 My Events        │
│ ➕ Create Event     │
│ 🎫 Scanner          │
│ 📈 Analytics        │
│                     │
│ ⚙️ Settings         │
│ 💬 Support          │
└─────────────────────┘
```

---

## 5. Search & Filter Architecture

### Event Search

```
Search Query ──> Full-text search on:
    ├── Title
    ├── Description
    └── Venue Name

Filters:
    ├── Date: From, To
    ├── Instrument: Multi-select tags
    ├── Skill Level: Checkbox group
    └── Price: Free / Paid / All

Sort:
    ├── Date (soonest first) [default]
    ├── Date (farthest first)
    └── Popularity (most tickets sold)
```

---

## 6. Labeling System

### UI Labels (Consistent Terminology)

| Concept | Label (Singular) | Label (Plural) | Button Text |
|---------|-----------------|----------------|-------------|
| Event | Event | Events | Create Event |
| Ticket | Ticket | Tickets | Get Ticket |
| QR Check-In | Check-In | Check-Ins | Start Scanning |
| Organizer | Organizer | Organizers | Become Organizer |
| Profile | Profile | Profiles | Edit Profile |
| Venue | Venue | Venues | Add Venue |
| Waitlist | Waitlist | — | Join Waitlist |
| RSVP | RSVP | — | RSVP Now |
| Dashboard | Dashboard | Dashboards | Go to Dashboard |

### Status Labels

| Entity | Status | Badge Color |
|--------|--------|-------------|
| Event | Active | Green |
| Event | Draft | Gray |
| Event | Cancelled | Red |
| Event | Completed | Blue |
| Ticket | Active | Green |
| Ticket | Used | Purple |
| Ticket | Cancelled | Red |
| Ticket | Refunded | Orange |

---

## 7. Empty States

### No Events

```html
<div class="empty-state">
  <icon>🎵</icon>
  <h3>No upcoming events</h3>
  <p>Check back later for new jamming sessions.</p>
</div>
```

### No Tickets

```html
<div class="empty-state">
  <icon>🎫</icon>
  <h3>No tickets yet</h3>
  <p>Browse events and grab your first ticket!</p>
  <a href="/events" class="btn">Browse Events</a>
</div>
```

### No Attendees (Organizer)

```html
<div class="empty-state">
  <icon>👥</icon>
  <h3>No one has RSVP'd yet</h3>
  <p>Share your event link to get attendees.</p>
  <button class="btn">Copy Event Link</button>
</div>
```

---

## 8. Sitemap Integration

See [10-Sitemap.md](./10-Sitemap.md) for the complete URL structure and page hierarchy.

## 9. Information Architecture Principles

1. **Progressive disclosure** — Show essential info first, details on demand
2. **Consistent naming** — Same term across all touchpoints
3. **User mental model** — Organize by user goals, not system structure
4. **Minimal depth** — Any content is ≤ 3 clicks from homepage
5. **Clear feedback** — Every action produces visible result
6. **Forgiveness** — Undo/cancel available for destructive actions
