# Interaction States — Empty, Loading, Error, Success

## Purpose
Every screen must account for all possible states, not just the "happy path." This document defines every state every screen type should handle.

## State Types

Every data-driven view must handle these states:

| State | Trigger | Display |
|-------|---------|---------|
| **Loading** | Data is being fetched | Skeleton components |
| **Empty** | No data exists | Illustration + message + optional CTA |
| **Error** | Data fetch failed | Error message + retry button |
| **Success** | Data loaded normally | Normal content view |
| **Offline** | No network connection | Banner + cached content |

---

## Screen State Matrix

### Public Screens

| Screen | Loading | Empty | Error | Offline |
|--------|---------|-------|-------|---------|
| Landing Page | Hero skeleton + card skeletons | Never empty (static hero) | Fetch error for events section only | Banner + cached events |
| Events Listing | Card grid skeletons × 6 | 🎵 "No events found" + Clear Filters | ⚠️ "Couldn't load events" + [Retry] | Cached list + offline banner |
| Event Details | Full page skeleton | ❌ Event removed (404) | ⚠️ "Couldn't load event" + [Retry] | Cached event data + banner |
| Auth (Login) | Button spinner | Never empty | ⚠️ "Invalid credentials" inline error | ❌ "No internet connection" full screen |
| Auth (Register) | Button spinner | Never empty | ❌ "Email already registered" inline | Same as login |

### Attendee Screens

| Screen | Loading | Empty | Error | Offline |
|--------|---------|-------|-------|---------|
| My Tickets | Card skeletons × 3 | 🎫 "No tickets yet" + [Browse Events] | ⚠️ "Couldn't load tickets" + [Retry] | Cached tickets + banner |
| Ticket Detail | Full ticket skeleton | ❌ "Ticket not found" (404) | ⚠️ "Couldn't load ticket" + [Retry] | Cached + last synced time |
| Profile | Avatar + text skeletons | Never empty | ⚠️ "Couldn't load profile" + [Retry] | Cached profile |
| Notifications | List skeletons × 4 | 🔔 "No notifications" | ⚠️ "Couldn't load notifications" + [Retry] | Cached notifications |

### Organizer Screens

| Screen | Loading | Empty | Error | Offline |
|--------|---------|-------|-------|---------|
| Dashboard | Stats skeletons + event list skeletons | 🗓️ "No events yet" + [Create Event] | ⚠️ "Couldn't load dashboard" + [Retry] | Cached stats + offline banner |
| Create Event | Form skeleton | Never empty | ⚠️ "Couldn't save" inline error per field | ❌ Requires connection |
| Event Management | Attendee list skeleton | 👥 "No attendees yet" + [Share event] | ⚠️ "Couldn't load event" + [Retry] | Partial cache + banner |
| Analytics | Chart skeletons + stat skeletons | 📊 "Not enough data" | ⚠️ "Couldn't load analytics" + [Retry] | Cached analytics |
| QR Scanner | Camera loading | Never empty | ❌ "Camera access denied" + [Manual Entry] | Local verification mode |
| Check-in History | Table skeleton | 📋 "No check-ins recorded" | ⚠️ "Couldn't load history" + [Retry] | Cached history |

### Admin Screens

| Screen | Loading | Empty | Error | Offline |
|--------|---------|-------|-------|---------|
| Platform Dashboard | Stat skeletons × 4 + chart skeleton | Never empty | ⚠️ "Couldn't load dashboard" + [Retry] | Banner |
| User Management | Table skeleton × 8 | 👥 "No users found" | ⚠️ "Couldn't load users" + [Retry] | Banner |
| Audit Logs | Table skeleton × 10 | 📋 "No audit entries for filter" | ⚠️ "Couldn't load audit logs" + [Retry] | Banner |

---

## Loading State Specifications

### Page Skeleton (Events Listing)

```
┌──────────────────────────────────────────────────────────────┐
│ [Search skeleton ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓]                    │
│ [▓▓▓▓▓] [▓▓▓▓▓▓] [▓▓▓▓▓] [▓▓▓▓▓▓]                           │
│                                                              │
│ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐     │
│ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓ │ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓ │ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓ │     │
│ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓ │ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓ │ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓ │     │
│ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓ │ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓ │ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓ │     │
│ │                │ │                │ │                │     │
│ │ ▓▓▓▓▓▓▓▓▓▓▓▓  │ │ ▓▓▓▓▓▓▓▓▓▓▓▓  │ │ ▓▓▓▓▓▓▓▓▓▓▓▓  │     │
│ │ ▓▓▓▓  ▓▓▓▓    │ │ ▓▓▓▓  ▓▓▓▓    │ │ ▓▓▓▓  ▓▓▓▓    │     │
│ │ ▓▓▓▓▓▓▓▓▓▓▓▓  │ │ ▓▓▓▓▓▓▓▓▓▓▓▓  │ │ ▓▓▓▓▓▓▓▓▓▓▓▓  │     │
│ │ ▓▓            │ │ ▓▓            │ │ ▓▓            │     │
│ │ ▓▓▓▓▓▓▓▓      │ │ ▓▓▓▓▓▓▓▓      │ │ ▓▓▓▓▓▓▓▓      │     │
│ └────────────────┘ └────────────────┘ └────────────────┘     │
└──────────────────────────────────────────────────────────────┘
```

### Card Skeleton Animation

```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-surface) 25%,
    var(--color-surface-elevated) 50%,
    var(--color-surface) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}
```

---

## Empty State Specifications

### Illustration Style

```
┌────────────────────────────────┐
│                                │
│       🎵 (Centered icon)        │
│       --text-5xl, muted        │
│                                │
│     Heading (--text-xl, white) │
│                                │
│  Description text              │
│  (--text-base, secondary)      │
│  Max-width: 400px, centered    │
│                                │
│  [CTA Button]  (optional)      │
│                                │
└────────────────────────────────┘
```

### Empty State Gallery

| Context | Icon | Heading | Description | CTA |
|---------|------|---------|-------------|-----|
| No events | 🎵 | "No upcoming events" | "Check back later for new jamming sessions." | — |
| No search results | 🔍 | "No events found" | "Try adjusting your filters or search terms." | [Clear Filters] |
| No tickets | 🎫 | "No tickets yet" | "Browse upcoming events and grab your first ticket!" | [Browse Events] |
| No notifications | 🔔 | "All caught up!" | "You'll see notifications here when something happens." | — |
| No attendees | 👥 | "No one has RSVP'd yet" | "Share your event link to get attendees." | [Copy Event Link] |
| No analytics | 📊 | "Not enough data yet" | "Analytics will appear once you've hosted a few events." | — |
| No audit logs | 📋 | "No audit entries" | "Try changing your date range or filters." | [Clear Filters] |

---

## Error State Specifications

### Inline Error (Form Field)

```
┌──────────────────────────────┐
│  Email                       │
│  ┌────────────────────────┐  │
│  │ invalid@               │  │  ← Red border
│  └────────────────────────┘  │
│  ⚠️ Please enter a valid     │  ← Red text, --text-sm
│     email address             │
└──────────────────────────────┘
```

### Page Error

```
┌────────────────────────────────────────────────────┐
│  ⚠️ (Warning icon, large)                          │
│                                                     │
│  Something went wrong                               │
│  --text-xl, bold                                    │
│                                                     │
│  We couldn't load your events. This is usually      │
│  temporary.                                         │
│  --text-base, secondary                             │
│                                                     │
│  [Try Again]   [Go Home]                            │
│   Primary       Ghost                               │
└────────────────────────────────────────────────────┘
```

### Connection Error (Banner)

```
┌─ 🔴 You're offline ───────────────────────────────┐
│  Some features may be limited until you reconnect. │
│  [Dismiss]                                         │
└────────────────────────────────────────────────────┘
```

---

## Success State Specifications

### Toast Notifications

```
┌────────────────────────────────────────────────┐
│  ✅  Ticket confirmed!    [View Ticket →]  [✕] │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│  🎉  Event created!       [View Event →]  [✕]  │
└────────────────────────────────────────────────┘
```

### Confirmation Screen (Post-Action)

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│              ✅  You're in!                           │
│                                                      │
│  ┌──────────────────────────────────────────┐        │
│  │          [QR Code]                       │        │
│  └──────────────────────────────────────────┘        │
│                                                      │
│  Event: Jazz Night at The Bottleneck                │
│  Date: Saturday, April 15 • 8:00 PM                 │
│                                                      │
│  [View My Ticket]  [Download PDF]                    │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## Offline State

### Strategy

| Scenario | Behavior |
|----------|----------|
| App launched offline | Show cached homepage, banner "You're offline" |
| Try to RSVP offline | Show "Connect to internet to book tickets" modal |
| QR scanning (previously loaded) | Local cache verification + sync later |
| QR scanning (first load) | Show "Connect to internet to load event" |
| View ticket (cached) | Show cached QR code |
| View ticket (not cached) | Show "This ticket needs internet to load" |

### Offline Banner

```
┌────────────────────────────────────────────────────────────┐
│  📡 You're offline. Cached data is shown.                 │
│  [Dismiss]                                                  │
└────────────────────────────────────────────────────────────┘
```

### Offline Modal (Critical Action)

```
┌──────────────────────────────────────────┐
│  No internet connection                   │
│                                          │
│  You need to be online to purchase       │
│  tickets. Your cart has been saved.      │
│                                          │
│  [Try Again]    [Save for Later]         │
└──────────────────────────────────────────┘
```

---

## Mobile Adaptation Rules

| Screen | Mobile Layout |
|--------|--------------|
| Landing | Stack hero, single column events, hide "How it Works" |
| Events Listing | Single column, compact cards, sticky filter bar |
| Event Details | Full-width image, stacked info, CTA fixed at bottom |
| Auth Forms | Full-width card, no side panels |
| Ticket View | Full-width card, QR takes 60% of viewport |
| Scanner | Full-screen camera, compact stats |
| Dashboard | Sidebar becomes bottom nav, stat cards 2×2 grid |
| Event Form | Single column, no side-by-side fields |
| Analytics | Vertical chart, stat cards stacked |
| Notifications | Full-width list, full-width items |
| Admin | Full-width tables, horizontal scroll on wide tables |

## Transition States

| Transition | Animation | Duration |
|------------|-----------|----------|
| Page enter | Fade in + slide up | 300ms |
| Page exit | Fade out | 200ms |
| Modal enter | Slide up from bottom | 300ms |
| Modal exit | Slide down | 200ms |
| Card hover | TranslateY(-2px), shadow increase | 150ms |
| Button press | Scale(0.97) | 100ms |
| Scan success | Green pulse + scale | 500ms |
| Toast enter | Slide in from right | 250ms |
| Toast exit | Slide out to right | 200ms |
