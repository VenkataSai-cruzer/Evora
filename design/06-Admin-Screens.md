# Admin Screens — High-Fidelity UI Specifications

---

## 1. Platform Dashboard (/admin)

```
┌──────────────────────────────────────────────────────────────┐
│ [🎵 JAMMING]  [Events]  [Admin ▼]  [👤 Admin]              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  Total   │  │  Active  │  │  Total   │  │  Revenue │    │
│  │  Users   │  │  Events  │  │Tickets   │  │  (Month) │    │
│  │   856    │  │    12    │  │  2,847   │  │  $1,240  │    │
│  │  ↑ 12%  │  │  ↑ 2     │  │  ↑ 18%   │  │          │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │                                                      │    │
│  │      Platform Growth (Line Chart)                    │    │
│  │      Users • Events • Tickets over time              │    │
│  │                                                      │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ──── Recent Activity ────                                   │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ 🆕  New user registered: Jordan Kim                  │    │
│  │ 📅  Event created: Funk Groove by Maya Chen          │    │
│  │ 🎫  42 tickets sold for Jazz Night                   │    │
│  │ ⚠️  Failed login attempt detected (IP blocked)       │    │
│  │ 💳  Refund processed: $10.00                         │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. User Management (/admin/users)

```
┌──────────────────────────────────────────────────────────────┐
│ [← Admin]  User Management                                   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [Search by name or email...]  [Role: All ▼]  [Status: All] │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ [Avatar]  Maya Chen      maya@email.com    Org    ✅ │    │
│  │ [Avatar]  Alex Rivera    alex@email.com    User   ✅ │    │
│  │ [Avatar]  Jordan Kim     jordan@email.com  User   ✅ │    │
│  │ [Avatar]  Sam Patil      sam@email.com     Co-Org ✅ │    │
│  │ [Avatar]  Casey O'Brien  casey@email.com   User   ⛔  │    │
│  │                                                    │    │
│  │                                    Page 1 of 25   │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### User Detail Modal

```
┌──────────────────────────────────────────┐
│  User Details                             │
│                                          │
│  [Avatar]  Alex Rivera                   │
│  alex@email.com                          │
│  Member since: Jan 12, 2026              │
│                                          │
│  Status: ● Active                        │
│  Role: [User ▼]  [Change Role]          │
│  Email: ✅ Verified                      │
│                                          │
│  Stats:                                  │
│  • 12 events attended                    │
│  • 0 events organized                    │
│  • 4.8★ avg rating                       │
│                                          │
│  ──── Recent Activity ────               │
│  • Apr 10: RSVP'd Jazz Night             │
│  • Apr 8:  Attended Funk Groove          │
│                                          │
│  [Suspend User]  [Delete Account]        │
│   (Danger)        (Danger)               │
└──────────────────────────────────────────┘
```

---

## 3. Organizers (/admin/organizers)

```
┌──────────────────────────────────────────────────────────────┐
│ [← Admin]  Organizer Management                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ [Avatar]  Maya Chen      8 events    2.4K tickets  ✅│    │
│  │ [Avatar]  David Park     3 events      580 tickets  ✅│    │
│  │ [Avatar]  Lisa Wong      1 event         42 tickets  ✅│    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. Audit Logs (/admin/audit-logs)

```
┌──────────────────────────────────────────────────────────────┐
│ [← Admin]  Audit Logs                           [Export CSV] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [Filter by action ▼]  [From: ▼]  [To: ▼]  [Search...]     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Apr 15  7:32 PM  checkin.valid      Ticket #0042   │    │
│  │                    Scanner: Maya Chen               │    │
│  ├──────────────────────────────────────────────────────┤    │
│  │ Apr 15  7:00 PM  ticket.created     User: Alex R.  │    │
│  │                    Event: Jazz Night                │    │
│  ├──────────────────────────────────────────────────────┤    │
│  │ Apr 14  3:15 PM  event.created      Maya Chen      │    │
│  │                    Event: Jazz Night                │    │
│  ├──────────────────────────────────────────────────────┤    │
│  │ Apr 14  2:00 PM  auth.login         Alex Rivera     │    │
│  ├──────────────────────────────────────────────────────┤    │
│  │ Apr 13  11:00AM  user.registered    Jordan Kim      │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  Page 1 of 87                                                │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. Platform Settings (/admin/settings)

```
┌──────────────────────────────────────────────────────────────┐
│ [← Admin]  Platform Settings                                 │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ──── General ────                                           │
│  Platform Name: [Jamming                        ]           │
│  Support Email: [support@jamming.com            ]           │
│  Max Event Capacity: [10000]                                │
│                                                              │
│  ──── Features ────                                          │
│  [✅] Allow free events                                     │
│  [✅] Allow paid events (requires Stripe)                    │
│  [✅] Blockchain verification (requires Ethereum)            │
│  [✅] Guest RSVPs (no account required)                      │
│                                                              │
│  ──── Security ────                                          │
│  Session timeout: [15 ▼] minutes                             │
│  Max login attempts: [5] before lockout                      │
│  [❌] Require email verification for event creation          │
│                                                              │
│  ──── Maintenance ────                                       │
│  [Run Database Cleanup]  [Re-index Search]                   │
│                                                              │
│  [Save Settings]                                             │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```
