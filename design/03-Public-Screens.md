# Public Screens — High-Fidelity UI Specifications

---

## 1. Landing Page (Homepage)

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│ [🎵 JAMMING]  [Events]  [About]         [Sign In]  [Sign Up] │  ← Glass nav
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                                                        │  │
│  │           {Hero: Dark concert photography}             │  │
│  │           Overlaid with purple gradient glow           │  │
│  │                                                        │  │
│  │  "Where Music Happens"                                 │  │
│  │  --text-5xl, bold, white                                │  │
│  │                                                        │  │
│  │  Discover, book, and jam with Austin's                 │  │
│  │  best musicians.                                       │  │
│  │  --text-lg, --color-text-secondary                     │  │
│  │                                                        │  │
│  │  [Browse Events →]    [About Jamming]                  │  │
│  │   Primary button       Ghost button                    │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ──── Upcoming Jams ────        [View All →]                │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │{Cover}   │ │{Cover}   │ │{Cover}   │ │{Cover}   │       │
│  │          │ │          │ │          │ │          │       │
│  │ Jazz     │ │ Blues    │ │ Funk     │ │ Open     │       │
│  │ Night    │ │ Session  │ │ Groove   │ │ Mic Jam  │       │
│  │ Apr 15   │ │ Apr 18   │ │ Apr 20   │ │ Apr 22   │       │
│  │ 8pm      │ │ 7pm      │ │ 8:30pm   │ │ 6pm      │       │
│  │ 45/50    │ │ 30/40    │ │ 12/30    │ │ 0/20     │       │
│  │ [RSVP]   │ │ [RSVP]   │ │ [RSVP]   │ │ [RSVP]   │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                              │
│  ──── How It Works ────                                      │
│                                                              │
│  [🎵 Find] ──→ [🎫 Book] ──→ [🎸 Jam] ──→ [📸 Share]       │
│                                                              │
│  ──── What Musicians Say ────                                │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  "Finally, a platform built for musicians, not       │   │
│  │   corporate events. The check-in is seamless."       │   │
│  │  — Alex R., Drummer                                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
│ [🎵 JAMMING]  [Events]  [About]  [Privacy]  [Terms]  © 2026 │
└──────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Spec |
|-----------|------|
| Hero section | Full-width, 80vh min-height, gradient overlay |
| Event cards | 4-column grid (desktop), 2-col (tablet), 1-col (mobile) |
| How it works | 4-step horizontal flow with icons |
| Testimonial | Single quote with attribution, subtle background |
| CTA buttons | Primary + Ghost pair |

### Mobile Adaptations

```
┌────────────────────────┐
│ [☰] [🎵 JAMMING] [🔔]  │
├────────────────────────┤
│                        │
│  {Hero Image}          │
│                        │
│  "Where Music Happens" │
│  [Browse Events →]     │
│                        │
│  ── Upcoming Jams ──   │
│  ┌──────────────────┐  │
│  │ {Event Card}     │  │
│  │ Jazz Night       │  │
│  │ Apr 15 • 8pm     │  │
│  │ 45/50            │  │
│  │ [RSVP]           │  │
│  └──────────────────┘  │
│  ┌──────────────────┐  │
│  │ {Event Card}     │  │
│  │ Blues Session    │  │
│  │ Apr 18 • 7pm     │  │
│  │ 30/40            │  │
│  │ [RSVP]           │  │
│  └──────────────────┘  │
└────────────────────────┘
│ [🏠] [🎵] [🎫] [👤]   │
└────────────────────────┘
```

---

## 2. Events Listing (/events)

### Filters Bar

```
[Search events...       🔍]
[Any Date ▼]  [Any Instrument ▼]  [All Levels ▼]  [Sort: Date ▼]
```

Results: "Showing 12 upcoming events"

### Empty State

```
┌────────────────────────────────┐
│                                │
│       🎵 (Music illustration)  │
│                                │
│     No upcoming events         │
│                                │
│  There are no events scheduled │
│  in this date range.           │
│                                │
│  [Clear Filters]               │
│                                │
└────────────────────────────────┘
```

---

## 3. Event Details (/events/[slug])

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│ [← Back to Events]                                           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │                                                      │    │
│  │         {Cover Image — Full width, 16:9}            │    │
│  │                                                      │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  🎵 Jazz Night at The Bottleneck            [Share] [♥ Save]│
│  --text-3xl, bold                                            │
│                                                              │
│  📅 Saturday, April 15, 2026                                 │
│  🕐 8:00 PM – 11:00 PM                                       │
│  📍 The Bottleneck, 123 Main St, Austin, TX                  │
│     🗺️ [Show Map]                                            │
│                                                              │
│  ──── Description ────                                       │
│  Join us for an unforgettable night of jazz fusion...        │
│                                                              │
│  ──── Instruments Needed ────                                │
│  [Guitar] [Bass] [Drums] [Saxophone] [Vocals]               │
│                                                              │
│  ──── Skill Level ────                                       │
│  All levels welcome                                          │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  💰 FREE ENTRY                           [RSVP Now] │    │
│  │  42 / 50 spots taken                                 │    │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 84%             │    │
│  │                                                     │    │
│  │  or join the waitlist (3 people ahead)               │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ──── Who's Coming (8 of 42) ────                            │
│  [Avatar] [Avatar] [Avatar] [Avatar] [Avatar] [+3]          │
│                                                              │
│  ──── Organized by ────                                      │
│  [Avatar] Maya Chen                                          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Capacity Bar

```
  ━━━━━━━━━━━━━━━━━━━━╸━━━━━━━━  42/50 filled
  ← Purple fill →    ← Dark →
```

| Threshold | Color |
|-----------|-------|
| < 50% | Green |
| 50-80% | Purple |
| 80-95% | Amber/Orange |
| 95%+ | Red |
| Full | Red + "Event Full" badge |

### Share Sheet

```
┌──────────────────────────┐
│  Share this event        │
│                          │
│  [📋 Copy Link]          │
│  [🐦 Twitter]            │
│  [📘 Facebook]           │
│  [💬 WhatsApp]           │
│  [📧 Email]              │
│                          │
│  [Cancel]                │
└──────────────────────────┘
```

---

## 4. Authentication Screens (/auth/*)

### Login

```
┌──────────────────────────────────────────┐
│                                          │
│              🎵 JAMMING                  │
│                                          │
│     ┌────────────────────────────┐       │
│     │  Welcome back              │       │
│     │                            │       │
│     │  Email                     │       │
│     │  [__________________]      │       │
│     │                            │       │
│     │  Password                  │       │
│     │  [__________________] 👁️   │       │
│     │                            │       │
│     │  [Forgot password?]        │       │
│     │                            │       │
│     │  [Sign In →]              │       │
│     │                            │       │
│     │  ──── or ────              │       │
│     │                            │       │
│     │  [Continue with Google]    │       │
│     │                            │       │
│     │  Don't have an account?    │       │
│     │  [Create one →]            │       │
│     └────────────────────────────┘       │
│                                          │
└──────────────────────────────────────────┘
```

### Register

```
┌──────────────────────────────────────────┐
│                                          │
│              🎵 JAMMING                  │
│                                          │
│     ┌────────────────────────────┐       │
│     │  Join the community        │       │
│     │                            │       │
│     │  Display Name              │       │
│     │  [__________________]      │       │
│     │                            │       │
│     │  Email                     │       │
│     │  [__________________]      │       │
│     │                            │       │
│     │  Password                  │       │
│     │  [__________________] 👁️   │       │
│     │  Must be 8+ chars, 1 upper│       │
│     │                            │       │
│     │  I play (optional)         │       │
│     │  [Guitar] [Drums] [Bass]   │       │
│     │  [Keys] [Vocals] [+ Add]  │       │
│     │                            │       │
│     │  Skill Level (optional)    │       │
│     │  ○ Beginner ○ Intermediate │       │
│     │  ○ Advanced  ● All Levels │       │
│     │                            │       │
│     │  [Create Account →]        │       │
│     │                            │       │
│     │  ──── or ────              │       │
│     │                            │       │
│     │  [Continue with Google]    │       │
│     │                            │       │
│     │  Already have an account?  │       │
│     │  [Sign in]                 │       │
│     └────────────────────────────┘       │
│                                          │
└──────────────────────────────────────────┘
```

### Email Verification (Phase 1 — In-App)

```
┌──────────────────────────────────────────┐
│                                          │
│     ┌────────────────────────────┐       │
│     │  Check your code           │       │
│     │                            │       │
│     │  We sent a 6-digit code    │       │
│     │  to verify your email.     │       │
│     │                            │       │
│     │  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐  │       │
│     │  │  │ │  │ │  │ │  │ │  │ │  │  │       │
│     │  └──┘ └──┘ └──┘ └──┘ └──┘ └──┘  │       │
│     │                            │       │
│     │  [Verify Email]           │       │
│     │                            │       │
│     │  Didn't get it?            │       │
│     │  [Resend Code] (30s)       │       │
│     └────────────────────────────┘       │
│                                          │
└──────────────────────────────────────────┘
```

---

## 5. Ticket Confirmation (/tickets/[id])

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │                                                      │    │
│  │    ✅  You're in!                                     │    │
│  │                                                      │    │
│  │    ┌──────────────────────────────────┐              │    │
│  │    │                                  │              │    │
│  │    │          [QR CODE]               │              │    │
│  │    │                                  │              │    │
│  │    └──────────────────────────────────┘              │    │
│  │                                                      │    │
│  │    Jazz Night at The Bottleneck                      │    │
│  │    Saturday, April 15 • 8:00 PM                      │    │
│  │    The Bottleneck, Austin, TX                        │    │
│  │                                                      │    │
│  │    Ticket: JAM-2026-0042                             │    │
│  │                                                      │    │
│  │    [Download PDF]  [Add to Calendar]                 │    │
│  │                                                      │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  [View My Tickets →]                                         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```
