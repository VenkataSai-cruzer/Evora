# Attendee Screens — High-Fidelity UI Specifications

---

## 1. Attendee Dashboard (/tickets)

```
┌──────────────────────────────────────────────────────────────┐
│ [🎵 JAMMING]  [Events]  [My Tickets]  [👤 Alex ▼]           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Welcome back, Alex!                              🔔 │    │
│  │                                                      │    │
│  │  You have 2 upcoming events this month               │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ──── Upcoming Events ────                                   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  🎵 Jazz Night at The Bottleneck                     │    │
│  │  📅 Tomorrow • 8:00 PM                               │    │
│  │  📍 The Bottleneck, Austin, TX                       │    │
│  │                                                      │    │
│  │  ┌──────────────┐                                    │    │
│  │  │ [QR CODE]    │  Ticket: JAM-2026-0042            │    │
│  │  └──────────────┘  Status: ✅ Active                 │    │
│  │                                                      │    │
│  │  [View Ticket]  [Add to Calendar]  [Cancel]          │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  🎵 Blues Session at The Hideout                     │    │
│  │  📅 Apr 18 • 7:00 PM                                 │    │
│  │  📍 The Hideout, Austin, TX                          │    │
│  │                                                      │    │
│  │  ┌──────────────┐                                    │    │
│  │  │ [QR CODE]    │  Ticket: JAM-2026-0051            │    │
│  │  └──────────────┘  Status: ✅ Active                 │    │
│  │                                                      │    │
│  │  [View Ticket]  [Add to Calendar]  [Cancel]          │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ──── Past Events ────                                       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  🎵 Funk Groove (Completed)       [View Ticket]      │    │
│  │  Apr 5 • Studio B                  [Leave Review]    │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Empty State (No Tickets)

```
┌────────────────────────────────┐
│                                │
│      🎫 (Ticket illustration)  │
│                                │
│     No tickets yet             │
│                                │
│  Browse upcoming events and    │
│  grab your first ticket!       │
│                                │
│  [Browse Events →]             │
│                                │
└────────────────────────────────┘
```

---

## 2. My Tickets (/tickets/[id])

### Active Ticket

```
┌──────────────────────────────────────────────────────────────┐
│ [← My Tickets]                                               │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │                                                      │    │
│  │              🎵  JAMMING                              │    │
│  │                                                      │    │
│  │  ┌──────────────────────────────────────────┐        │    │
│  │  │                                          │        │    │
│  │  │              [QR CODE]                   │        │    │
│  │  │       (600×600px, high contrast)         │        │    │
│  │  │                                          │        │    │
│  │  │   Ticket: JAM-2026-0042                  │        │    │
│  │  │                                          │        │    │
│  │  └──────────────────────────────────────────┘        │    │
│  │                                                      │    │
│  │  ──── Event Details ────                             │    │
│  │  Jazz Night at The Bottleneck                        │    │
│  │  Saturday, April 15, 2026                            │    │
│  │  8:00 PM – 11:00 PM                                  │    │
│  │  The Bottleneck, 123 Main St, Austin, TX             │    │
│  │                                                      │    │
│  │  Status: ● Active                                    │    │
│  │  Name: Alex Rivera                                   │    │
│  │                                                      │    │
│  │  ──── Actions ────                                   │    │
│  │  [Download PDF]  [Add to Calendar]                   │    │
│  │                                                      │    │
│  │  [Cancel Ticket] (available until 24h before event)  │    │
│  │                                                      │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Used Ticket

```
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Status: ● Used ✓ — Checked in at 8:32 PM            │    │
│  │                                                      │    │
│  │  [QR CODE] — Stamped "USED" diagonally               │    │
│  │                                                      │    │
│  │  Background: Subtle purple tint, faded               │    │
│  └──────────────────────────────────────────────────────┘    │
```

### Cancellation Confirmation

```
┌──────────────────────────────────────────┐
│  Cancel your ticket?                      │
│                                          │
│  Your spot at "Jazz Night" will be       │
│  released to someone on the waitlist.    │
│                                          │
│  Reason (optional):                      │
│  [▼ Can't make it]                       │
│                                          │
│  [Keep Ticket]     [Confirm Cancel]      │
│                    (Danger button)        │
└──────────────────────────────────────────┘
```

---

## 3. Profile (/profile)

```
┌──────────────────────────────────────────────────────────────┐
│ [🎵 JAMMING]  [Events]  [My Tickets]  [👤 Alex ▼]           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  ┌──────┐                                            │    │
│  │  │      │  Alex Rivera            [Edit Profile]      │    │
│  │  │Avatar│  alex.rivera@email.com                      │    │
│  │  │      │  Member since Jan 2026                     │    │
│  │  └──────┘                                            │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ──── About Me ────                                          │
│  Weekend drummer looking for jam sessions around Austin.     │
│  Into jazz, funk, and progressive rock.                      │
│                                                              │
│  ──── Instruments ────                                       │
│  [Drums] [Bass] [Percussion]                                 │
│                                                              │
│  ──── Skill Level ────                                       │
│  Intermediate                                                │
│                                                              │
│  ──── Stats ────                                             │
│  12 events attended  •  3 this month  •  4.8★ avg rating    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. Notifications

```
┌──────────────────────────────────────────────────────────────┐
│ [←]  Notifications                    [Mark all as read]     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  🎫  Ticket Confirmed!   ● Unread    Just now       │    │
│  │  Your ticket for Jazz Night is ready.                │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  🎵  Event Reminder              2 hours ago         │    │
│  │  Jazz Night starts tomorrow at 8 PM!                 │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  ❌  Event Cancelled                                 │    │
│  │  Blues Session at The Hideout has been cancelled.    │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  🎉  Waitlist Promoted!          3 days ago          │    │
│  │  A spot opened up for Funk Groove! You're in!        │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ──── Older ────                                             │
│  [Show more]                                                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Empty State

```
┌────────────────────────────────┐
│                                │
│      🔔 (Bell illustration)    │
│                                │
│     No notifications           │
│                                │
│  You're all caught up!         │
│                                │
└────────────────────────────────┘
```
