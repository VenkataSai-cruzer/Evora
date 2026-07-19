# Sitemap — Jamming Events Platform

## 1. Site Structure

```
jamming.com/
│
├── /                           # Homepage — Featured upcoming events
├── /events                     # Browse all events (grid view)
│   └── /events/[slug]          # Event detail page
│
├── /auth
│   ├── /auth/login             # Sign in
│   ├── /auth/register          # Sign up
│   ├── /auth/forgot-password   # Password reset request
│   ├── /auth/reset-password    # Password reset (token in URL)
│   └── /auth/verify            # Email verification
│
├── /tickets                    # My Tickets (user's purchased/RSVP tickets)
│   └── /tickets/[id]           # Individual ticket view (QR, details)
│
├── /profile                    # User profile
│   ├── /profile/edit           # Edit profile
│   └── /profile/settings       # Account settings
│
├── /dashboard                  # Organizer Dashboard
│   ├── /dashboard/events       # My events list
│   ├── /dashboard/events/new   # Create event
│   ├── /dashboard/events/[id]  # Event management (attendees, stats)
│   ├── /dashboard/events/[id]/edit        # Edit event
│   ├── /dashboard/events/[id]/checkin     # QR scanner
│   └── /dashboard/analytics    # Event analytics (Phase 2)
│
├── /legal
│   ├── /legal/privacy          # Privacy policy
│   ├── /legal/terms            # Terms of service
│   └── /legal/cookies          # Cookie policy
│
└── /about                      # About Jamming
```

---

## 2. Page Roles Map

| Page | Visitor | Registered User | Organizer | Co-Organizer | Admin |
|------|---------|----------------|-----------|--------------|-------|
| `/` (Home) | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/events` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/events/[slug]` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/auth/login` | ✅ | ❌ (redirect) | ❌ | ❌ | ❌ |
| `/auth/register` | ✅ | ❌ (redirect) | ❌ | ❌ | ❌ |
| `/tickets` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `/tickets/[id]` | ❌ | ✅ (own) | ✅ (own event) | ✅ (own event) | ✅ |
| `/profile` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `/profile/edit` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `/dashboard` | ❌ | ❌ | ✅ | ✅ | ✅ |
| `/dashboard/events` | ❌ | ❌ | ✅ | ✅ | ✅ |
| `/dashboard/events/new` | ❌ | ❌ | ✅ | ❌ | ✅ |
| `/dashboard/events/[id]` | ❌ | ❌ | ✅ | ✅ (assigned) | ✅ |
| `/dashboard/events/[id]/checkin` | ❌ | ❌ | ✅ | ✅ | ✅ |
| `/dashboard/analytics` | ❌ | ❌ | ✅ | ❌ | ✅ |
| `/legal/*` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/about` | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 3. Navigation

### Top Navigation (Header) — All Users

```
[Logo]  [Events]  [About]  [Sign In]  [Sign Up]
```

### Top Navigation (Header) — Logged-In User

```
[Logo]  [Events]  [My Tickets]  [Profile ▼]  [Notifications]
                                         ├── My Profile
                                         ├── My Dashboard (if organizer)
                                         └── Sign Out
```

### Top Navigation (Header) — Organizer

```
[Logo]  [Events]  [My Tickets]  [Dashboard ▼]  [Profile ▼]
                              ├── My Events
                              ├── Create Event
                              ├── Analytics
                              └── Scanner
```

### Footer — All Pages

```
[Logo]  [Events]  [About]  [Privacy]  [Terms]  [Cookies]  © 2026 Jamming
```

---

## 4. Page Hierarchy & URL Design

### URL Convention

- **Kebab-case** for slugs: `/events/jazz-night-at-the-bottleneck`
- **Lowercase** only
- **No trailing slashes** (redirect to non-trailing version)
- **No file extensions**
- **No query strings** for simple navigation (use for filters only)

### URL Parameters

| Page | Query Parameters |
|------|-----------------|
| `/events` | `?dateFrom=&dateTo=&instrument=&q=` (search) |
| `/dashboard/analytics` | `?eventId=&period=7d/30d/90d` |

### Redirect Rules

| From | To | Condition |
|------|----|-----------|
| `/signin` | `/auth/login` | Permanent redirect |
| `/signup` | `/auth/register` | Permanent redirect |
| `/event/*` | `/events/*` | Permanent redirect |
| `/login` | `/auth/login` | Permanent redirect |
| `/register` | `/auth/register` | Permanent redirect |
| `/dashboard` | `/dashboard/events` | If no specific section |
| Any authenticated page | `/auth/login` | If not authenticated |
| Any organizer page | `/events` | If not organizer role |

---

## 5. Content Pages

| Page | Purpose | Content Sources |
|------|---------|----------------|
| Homepage | Convert visitors → discovery | Featured events, hero, CTA |
| About | Build trust | Mission, team, story |
| Privacy | Legal compliance | Privacy policy |
| Terms | Legal compliance | Terms of service |
| Cookies | Legal compliance | Cookie policy |
| 404 | Error recovery | Navigation + search prompt |
| 500 | Error recovery | Status message + retry |

---

## 6. Mobile Navigation

### Mobile Bottom Navigation (Logged-In User)

```
[🏠 Home]  [🎵 Events]  [🎫 Tickets]  [👤 Profile]
```

### Mobile Header

```
[☰ Menu] [Logo] [🔔 Notifications]
```

Drawer menu includes all top-nav links in a vertical list.
