# Organizer Screens — High-Fidelity UI Specifications

---

## 1. Organizer Dashboard (/dashboard)

### Desktop Layout

```
┌──────────────────────────────────────────────────────────────┐
│ [🎵 JAMMING]              [Events]  [👤 Maya ▼]             │
├──────────┬───────────────────────────────────────────────────┤
│ Sidebar  │  Main Content                                     │
│          │                                                    │
│ 📊 Over  │  Welcome back, Maya!   [+ Create Event]           │
│   view   │                                                    │
│ 📅 My    │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐     │
│   Events │  │Active  │ │Total   │ │Checked │ │Revenue │     │
│ ➕ Create│  │Events  │ │Tickets │ │In Today│ │(Month) │     │
│ 🎫 Scan │  │   3    │ │  127   │ │   42   │ │  $340  │     │
│ 📈 Analy │  └────────┘ └────────┘ └────────┘ └────────┘     │
│   tics   │                                                    │
│          │  ──── Your Events ────                             │
│ ⚙️ Setting│                                                    │
│   s      │  ┌────────────────────────────────────────────┐   │
│ 💬 Supp  │  │ Jazz Night     Apr 15  42/50 ✅  8 checked │   │
│   ort    │  │ The Bottleneck 8PM        [View] [Edit]    │   │
│          │  │                                    [Scan]  │   │
│          │  ├────────────────────────────────────────────┤   │
│          │  │ Blues Session  Apr 18  30/40   3 checked  │   │
│          │  │ The Hideout    7PM         [View] [Edit]  │   │
│          │  │                                    [Scan]  │   │
│          │  ├────────────────────────────────────────────┤   │
│          │  │ Funk Groove    Apr 20  12/30 ⏳ W:3       │   │
│          │  │ Studio B       8:30PM      [View] [Edit]  │   │
│          │  │                                    [Scan]  │   │
│          │  └────────────────────────────────────────────┘   │
│          │                                                    │
└──────────┴───────────────────────────────────────────────────┘
```

### Mobile Layout

```
┌────────────────────────┐
│ [<] Dashboard          │
├────────────────────────┤
│  Welcome back, Maya!   │
│  [+ Create]            │
│                        │
│ ┌──────┐ ┌──────┐     │
│ │Active│ │Total │     │
│ │   3  │ │ 127  │     │
│ └──────┘ └──────┘     │
│ ┌──────┐ ┌──────┐     │
│ │Check │ │Revenue     │
│ │  42  │ │ $340 │     │
│ └──────┘ └──────┘     │
│                        │
│ ── Your Events ──      │
│ ┌──────────────────┐   │
│ │ Jazz Night       │   │
│ │ Apr 15 • 8PM     │   │
│ │ 42/50 • 8 checked│   │
│ │ [View] [Scan]    │   │
│ └──────────────────┘   │
│ ┌──────────────────┐   │
│ │ Blues Session    │   │
│ │ Apr 18 • 7PM     │   │
│ │ 30/40 • 3 checked│   │
│ │ [View] [Scan]    │   │
│ └──────────────────┘   │
└────────────────────────┘
│ [🏠] [🎵] [🎫] [👤]   │
└────────────────────────┘
```

---

## 2. Create Event (/dashboard/events/new)

### Form Layout

```
┌──────────────────────────────────────────────────────────────┐
│ [← Dashboard]  Create New Event                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Section 1: Basic Info                               │    │
│  │                                                      │    │
│  │  Event Title *                                       │    │
│  │  [Jazz Night at The Bottleneck                    ]  │    │
│  │                                                      │    │
│  │  Description *                                       │    │
│  │  [Join us for an unforgettable night of...        ]  │    │
│  │  [                                                ]  │    │
│  │  [                                                ]  │    │
│  │                                                      │    │
│  │  Cover Image                                         │    │
│  │  ┌──────────────────────────────────────┐            │    │
│  │  │           [Upload Image]             │            │    │
│  │  │     or drag and drop (max 5MB)      │            │    │
│  │  └──────────────────────────────────────┘            │    │
│  │                                                      │    │
│  │  Section 2: Date & Venue                             │    │
│  │                                                      │    │
│  │  Date *      [MM/DD/YYYY]  Time * [HH:MM] to [HH:MM]│    │
│  │                                                      │    │
│  │  Venue Name *  [The Bottleneck                   ]  │    │
│  │  Address *     [123 Main St, Austin, TX          ]  │    │
│  │                                                      │    │
│  │  Section 3: Capacity & Tickets                       │    │
│  │                                                      │    │
│  │  Maximum Capacity * [50]                             │    │
│  │                                                      │    │
│  │  Ticket Type                                         │    │
│  │  ● Free — No payment needed                          │    │
│  │  ○ Paid — Requires Stripe integration (Phase 2)      │    │
│  │                                                      │    │
│  │  Section 4: Music Details                            │    │
│  │                                                      │    │
│  │  Instruments Needed                                  │    │
│  │  [Guitar] [Bass] [Drums] [Keys] [Vocals] [Horns]    │    │
│  │  [+ Add custom]                                      │    │
│  │                                                      │    │
│  │  Skill Level    ○ Beg  ○ Int  ○ Adv  ● All           │    │
│  │                                                      │    │
│  │  Section 5: Visibility                               │    │
│  │                                                      │    │
│  │  ● Public — Anyone can find and RSVP                 │    │
│  │  ○ Private — Only people with the link can RSVP     │    │
│  │                                                      │    │
│  │  [Cancel]                 [Create Event →]           │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Event Management (/dashboard/events/[id])

```
┌──────────────────────────────────────────────────────────────┐
│ [← Dashboard]  Jazz Night at The Bottleneck                  │
│                                                 [Edit] [Scan]│
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │
│  │  42  │  │    8     │  │   84%   │  │  3 waitlist  │    │
│  │Tickets│  │Checked In│  │Fill Rate│  │              │    │
│  └──────┘  └──────────┘  └──────────┘  └──────────────┘    │
│                                                              │
│  ──── Attendees (42) ────                    [Export CSV]   │
│                                                              │
│  [Search attendees...]                    [Filter by status ▼]│
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ [Avatar]  Alex Rivera     Drums     ✅ 7:32 PM      │    │
│  │ [Avatar]  Sarah Miller    Guitar    ✅ 7:28 PM      │    │
│  │ [Avatar]  Jay Kim         Bass      ✅ 7:25 PM      │    │
│  │ [Avatar]  Maria Garcia    Vocals    ⏳ Not checked  │    │
│  │ [Avatar]  Tom Chen        Keys      ⏳ Not checked  │    │
│  │ [Avatar]  +37 more                  ⏳ Not checked  │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Check-In Stats (Real-Time)

```
┌──────────────────────────┐
│  Check-In Progress        │
│                           │
│  8 / 42 checked in        │
│  ━━━━╸━━━━━━━━━━━━━━━  19%│
│                           │
│  Last scan: 2 min ago     │
│  Scan rate: 12 / hour     │
└──────────────────────────┘
```

---

## 4. Analytics (/dashboard/analytics)

```
┌──────────────────────────────────────────────────────────────┐
│ [← Dashboard]  Analytics                    [Period: 30d ▼]  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  ┌─────────────────────────────────────────┐         │    │
│  │  │                                         │         │    │
│  │  │      Attendance Trend (Line Chart)       │         │    │
│  │  │                                         │         │    │
│  │  │   📈 Upward trend — 23% growth          │         │    │
│  │  │                                         │         │    │
│  │  └─────────────────────────────────────────┘         │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Avg. Fill   │  │  No-Show     │  │  Satisfaction│       │
│  │  Rate        │  │  Rate        │  │  Rating      │       │
│  │    78%       │  │    12%       │  │    4.7★      │       │
│  │  ↑ 5% from   │  │  ↓ 3% from   │  │  ↑ 0.2 from  │       │
│  │  last month  │  │  last month  │  │  last month  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                              │
│  ──── Top Events ────                                        │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  #1  Jazz Night       42/50  84%   4.9★   Apr 15    │    │
│  │  #2  Blues Session    30/40  75%   4.5★   Apr 18    │    │
│  │  #3  Funk Groove      12/30  40%   4.2★   Apr 20    │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. QR Scanner (/dashboard/events/[id]/checkin)

### Full Spec (see Design System document for complete scanner screens)

```
┌──────────────────────────────────────────────────────────────┐
│ [← Dashboard]  Jazz Night Check-In                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │                                                      │    │
│  │              📷 Camera Preview                        │    │
│  │                                                      │    │
│  │         ┌──────────────────────────┐                 │    │
│  │         │                          │                 │    │
│  │         │    [QR SCAN AREA]        │                 │    │
│  │         │    Corner guides         │                 │    │
│  │         │    (white, animated)     │                 │    │
│  │         │                          │                 │    │
│  │         └──────────────────────────┘                 │    │
│  │                                                      │    │
│  │         [Tap for manual entry]                      │    │
│  │                                                      │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────┐                                                    │
│  │ 8/42 │  Checked in                                       │
│  └──────┘                                                    │
│                                                              │
│  ──── Recent Scans ────                                      │
│  ✅ Alex Rivera         7:32 PM                              │
│  ✅ Sarah Miller        7:28 PM                              │
│  ✅ Jay Kim             7:25 PM                              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Manual Entry

```
┌──────────────────────────────────────────┐
│  Manual Ticket Entry                      │
│                                          │
│  Enter the ticket number shown on the    │
│  attendee's phone or printed ticket.     │
│                                          │
│  Ticket Number                           │
│  [JAM-2026-0042                     ]    │
│                                          │
│  Format: JAM-YYYY-XXXXX                  │
│                                          │
│  [Cancel]        [Verify Ticket]         │
└──────────────────────────────────────────┘
```

---

## 6. Check-in History (/dashboard/events/[id]/checkins)

```
┌──────────────────────────────────────────────────────────────┐
│ [← Jazz Night]  Check-in History                             │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Total checked in: 42 / 42  •  Average time: 7:30 PM        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ ✅ Alex Rivera         7:32 PM      QR              │    │
│  │ ✅ Sarah Miller        7:28 PM      QR              │    │
│  │ ✅ Jay Kim             7:25 PM      QR              │    │
│  │ ✅ Maria Garcia        7:20 PM      Manual          │    │
│  │ ✅ Tom Chen            7:15 PM      QR              │    │
│  │ ❌ Jordan Kim          No show     —               │    │
│  │ ❌ Lisa Park           No show     —               │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  [Export CSV]                                                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```
