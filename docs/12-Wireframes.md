# Wireframes — Jamming Events Platform

## 1. Wireframe Convention

```
+--+--+--+  = Section boundary
[Label]     = Component name
(btn)       = Button
[...]       = Text input
{image}     = Image placeholder
```

All wireframes are described in text to establish layout structure. Actual visual design follows the Design System.

---

## 2. Homepage

```
┌──────────────────────────────────────────────────────────────┐
│ [Logo]    [Events]  [About]           [Sign In]  [Sign Up]   │  ← Header
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │                                                          │ │
│ │               {Hero Image: Live Jam Session}             │ │
│ │                                                          │ │
│ │  "Where Music Happens"                                   │ │
│ │  Discover, book, and jam with Austin's best musicians    │ │
│ │                                                          │ │
│ │  [Browse Events →]                                       │ │
│ │                                                          │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│  ────── Upcoming Jams ──────                                 │
│                                                              │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│ │{Event   │ │{Event   │ │{Event   │ │{Event   │            │
│ │ Image}  │ │ Image}  │ │ Image}  │ │ Image}  │            │
│ │         │ │         │ │         │ │         │            │
│ │ Jazz    │ │ Blues   │ │ Funk    │ │ Open    │            │
│ │ Night   │ │ Session │ │ Groove  │ │ Mic Jam │            │
│ │ Apr 15  │ │ Apr 18  │ │ Apr 20  │ │ Apr 22  │            │
│ │ 8pm     │ │ 7pm     │ │ 8:30pm  │ │ 6pm     │            │
│ │ 45/50   │ │ 30/40   │ │ 12/30   │ │ 0/20    │            │
│ │ (btn)   │ │ (btn)   │ │ (btn)   │ │ (btn)   │            │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘            │
│                                                              │
│ [View All Events →]                                          │
│                                                              │
│ ────── How It Works ──────                                   │
│                                                              │
│ [🎵 Find] ──→ [🎫 Book] ──→ [🎸 Jam] ──→ [📸 Share]        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
│ [Logo]  [Events]  [About]  [Privacy]  [Terms]  © 2026       │  ← Footer
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Event Detail Page

```
┌──────────────────────────────────────────────────────────────┐
│ [← Back to Events]                                           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌────────────────┐                                           │
│ │                │  🎵 Jazz Night at The Bottleneck          │
│ │  {Cover Image} │  📅 Saturday, April 15, 2026             │
│ │                │  🕐 8:00 PM – 11:00 PM                   │
│ │                │  📍 The Bottleneck, 123 Main St           │
│ └────────────────┘  🗺️ [Show Map]                           │
│                                                              │
│  ──── Description ────                                      │
│  Join us for an unforgettable night of jazz...               │
│                                                              │
│  ──── Instruments Needed ────                                │
│  [Guitar] [Bass] [Drums] [Saxophone] [Vocals]               │
│                                                              │
│  ──── Skill Level ────                                       │
│  All levels welcome                                          │
│                                                              │
│  ┌──────────────────────────────────┐                        │
│  │  💰 FREE ENTRY                   │                        │
│  │  42 / 50 spots taken             │                        │
│  │  [RSVP Now →]                    │                        │
│  │  or                              │                        │
│  │  3 people on waitlist            │                        │
│  └──────────────────────────────────┘                        │
│                                                              │
│  ──── Who's Coming (8 of 42) ────                           │
│  [Avatar] Alex R.   [Avatar] Sarah M.   [Avatar] Jay K.     │
│  [Avatar] +5 more                                            │
│                                                              │
│  ──── Share ────                                             │
│  [📋 Copy Link] [🐦 Twitter] [📘 Facebook]                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. Ticket View (User)

```
┌──────────────────────────────────────────────────────────────┐
│ [← My Tickets]                                               │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │                                                      │    │
│  │               🎵 JAMMING                             │    │
│  │                                                      │    │
│  │  ┌──────────────────────────────────────┐            │    │
│  │  │                                      │            │    │
│  │  │            [QR CODE]                 │            │    │
│  │  │        (Large, high contrast)        │            │    │
│  │  │                                      │            │    │
│  │  └──────────────────────────────────────┘            │    │
│  │                                                      │    │
│  │  Jazz Night at The Bottleneck                        │    │
│  │  Saturday, April 15, 2026 • 8:00 PM                  │    │
│  │  The Bottleneck, 123 Main St, Austin, TX             │    │
│  │                                                      │    │
│  │  Ticket: JAM-2026-0042                               │    │
│  │  Status: ✅ Active                                   │    │
│  │  Name: Alex Rivera                                   │    │
│  │                                                      │    │
│  │  [Download PDF]  [Add to Calendar]                   │    │
│  │                                                      │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. QR Scanner (Organizer)

```
┌──────────────────────────────────────────────────────────────┐
│ [← Dashboard]   Jazz Night Check-In                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │                                                      │    │
│  │                                                      │    │
│  │              📷 Camera Viewfinder                    │    │
│  │                                                      │    │
│  │         ┌──────────────────────────┐                 │    │
│  │         │                          │                 │    │
│  │         │    [QR SCAN AREA]        │                 │    │
│  │         │                          │                 │    │
│  │         └──────────────────────────┘                 │    │
│  │                                                      │    │
│  │         [or tap for manual entry]                    │    │
│  │                                                      │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ──── Recent Scans ────                                      │
│  ✅ Alex Rivera       7:32 PM                                │
│  ✅ Sarah Miller      7:28 PM                                │
│  ✅ Jay Kim           7:25 PM                                │
│                                                              │
│  Scanned: 3 / 42                                            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. Scan Result Screen (Success)

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                    ┌──────────────┐                          │
│                    │   ✅         │                          │
│                    │  VALID       │                          │
│                    │              │                          │
│                    │  Alex        │                          │
│                    │  Rivera      │                          │
│                    │              │                          │
│                    │  Drummer     │                          │
│                    └──────────────┘                          │
│                                                              │
│                    ● ● ●                                     │
│                    (auto-dismissing)                          │
│                                                              │
│                    [Scan Next]                                │
│                                                              │
│                    Background: Green                         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 7. Create Event Form

```
┌──────────────────────────────────────────────────────────────┐
│ [← Dashboard]   Create New Event                            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Event Title                                         │    │
│  │  [........................]                          │    │
│  │                                                      │    │
│  │  Description                                         │    │
│  │  [..................................]                │    │
│  │  [..................................]                │    │
│  │                                                      │    │
│  │  Cover Image                    {image placeholder}  │    │
│  │  [Upload Image]                                      │    │
│  │                                                      │    │
│  │  ──── Date & Venue ────                             │    │
│  │  Date:    [MM/DD/YYYY]  Time: [HH:MM] to [HH:MM]   │    │
│  │  Venue:   [........................]                │    │
│  │  Address: [........................]                │    │
│  │                                                      │    │
│  │  ──── Capacity & Tickets ────                       │    │
│  │  Capacity: [___]                                    │    │
│  │  Ticket Type: ○ Free  ● Paid                        │    │
│  │  Price:     [$___.__]                               │    │
│  │                                                      │    │
│  │  ──── Music Details ────                            │    │
│  │  Instruments Needed:                                │    │
│  │  [Guitar] [Bass] [Drums] [Keys] [Vocals] [Horns]   │    │
│  │  [+ Add]                                            │    │
│  │                                                      │    │
│  │  Skill Level: ○ Beg ○ Int ○ Adv ● All               │    │
│  │                                                      │    │
│  │  ──── Visibility ────                               │    │
│  │  ● Public — Anyone can find and RSVP                │    │
│  │  ○ Private — Only people with the link can RSVP    │    │
│  │                                                      │    │
│  │  [Create Event]              [Cancel]               │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 8. Organizer Dashboard

```
┌──────────────────────────────────────────────────────────────┐
│ [Logo]  [Events]  [My Tickets]  [Dashboard ▼]  [👤]         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Welcome back, Maya!                                 │    │
│  │  You have 3 upcoming events                          │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  Active   │  │ Total    │  │ Checked  │  │ Revenue  │    │
│  │  Events   │  │ Tickets  │  │ In Today │  │ (Month)  │    │
│  │    3      │  │    127   │  │    42    │  │   $340   │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                              │
│  ──── Your Events ────                                       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Jazz Night       Apr 15    42/50 ✅  8 checked in   │    │
│  │ The Bottleneck   8:00 PM                             │    │
│  │ [View] [Edit] [Scan] [Cancel]                       │    │
│  ├──────────────────────────────────────────────────────┤    │
│  │ Blues Session    Apr 18    30/40   3 checked in     │    │
│  │ The Hideout      7:00 PM                             │    │
│  │ [View] [Edit] [Scan]                                │    │
│  ├──────────────────────────────────────────────────────┤    │
│  │ Funk Groove      Apr 20    12/30   0 checked in     │    │
│  │ Studio B         8:30 PM   Waitlist: 3              │    │
│  │ [View] [Edit] [Scan] [Promote Waitlist]             │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  [+ Create Event]                                            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 9. Mobile Responsive Considerations

### Homepage (Mobile — < 640px)

```
┌────────────────┐
│ [☰] [Logo] [🔔]│
├────────────────┤
│                │
│  {Hero Image}  │
│                │
│ "Where Music   │
│  Happens"      │
│                │
│ [Browse Events]│
│                │
│ ── Upcoming ── │
│                │
│ ┌────────────┐ │
│ │{Event Card}│ │
│ │ Jazz Night │ │
│ │ Apr 15 8pm │ │
│ │ 45/50      │ │
│ └────────────┘ │
│ ┌────────────┐ │
│ │{Event Card}│ │
│ │ Blues Jam  │ │
│ │ Apr 18 7pm │ │
│ │ 30/40      │ │
│ └────────────┘ │
│                │
└────────────────┘
```

### Scanner (Mobile)

```
┌────────────────┐
│ [←] Check-In   │
├────────────────┤
│                │
│ ┌────────────┐ │
│ │            │ │
│ │  [CAMERA]  │ │
│ │            │ │
│ │            │ │
│ └────────────┘ │
│                │
│ [Manual Entry] │
│                │
│ Checked: 3/42  │
└────────────────┘
```

---

## 10. Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 640px | Single column, bottom nav |
| Tablet | 640px – 1024px | 2-column grid, top nav |
| Desktop | > 1024px | Multi-column, sidebar dash |
| Wide | > 1440px | Max-width container centered |

---

## 11. Key UX Principles Applied

1. **F-shaped pattern** for event cards (image left, text right on desktop)
2. **Thumb zone** for scanner (scan button at thumb reach)
3. **Scan result fills entire screen** for immediate visibility
4. **Ticket card is printable** (high contrast QR, clear typography)
5. **Forms use single-column** on mobile for easy completion
