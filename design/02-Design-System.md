# Design System — Complete Component Specifications

## Component Principles

Every component must handle these visual states:

| State | Description | Visual |
|-------|-------------|--------|
| **Default** | Normal display | As designed |
| **Hover** | Mouse over interactive element | Background shift, subtle lift |
| **Active/Pressed** | Currently being clicked | Scale(0.97), darker bg |
| **Focus** | Keyboard focused | 2px ring in primary color |
| **Loading** | Data being fetched | Skeleton/pulse animation |
| **Disabled** | Action unavailable | Opacity 50%, muted colors |
| **Error** | Failed validation | Red border + error message |
| **Empty** | No data to display | Illustration + message + CTA |
| **Success** | Action completed | Green checkmark + message |

---

## Button

### Visual Specs

| Attribute | Primary | Secondary | Ghost | Danger |
|-----------|---------|-----------|-------|--------|
| Height | 44px (md), 52px (lg) | Same | 36px (sm) | Same as primary |
| Padding | 16px 24px | 16px 24px | 8px 16px | 16px 24px |
| Background | `--color-primary` | Transparent | Transparent | `--color-error` |
| Hover BG | `--color-primary-hover` | `--color-surface-elevated` | `--color-surface-elevated` | `#DC2626` |
| Text | White, 500 | White | `--color-text-secondary` | White |
| Border | None | `1px solid --color-border` | None | None |
| Radius | `--radius-md` | `--radius-md` | `--radius-md` | `--radius-md` |
| Shadow | None | None | None | None |

### With Icon

```
[→ Icon] Label    — Icon on left
Label [→ Icon]    — Icon on right (default for arrows)
[→ Icon]          — Icon only (tooltip required)
```

### Loading State

```
[🌀 Spinner] Loading...
Button is disabled during loading. Width preserved to prevent layout shift.
```

---

## Input

### Visual Specs

```
┌─────────────────────────────────┐
│  Label                          │
│  ┌───────────────────────────┐  │
│  │ [icon] Value              │  │
│  └───────────────────────────┘  │
│  Hint text or error message     │
└─────────────────────────────────┘
```

| Attribute | Default | Focus | Error | Disabled |
|-----------|---------|-------|-------|----------|
| Height | 44px | Same | Same | Same |
| Border | `1px solid --color-border` | `2px solid --color-primary` | `2px solid --color-error` | `--color-border` |
| Background | `--color-surface` | Same | Same | Same |
| Text | White | White | White | `--color-text-muted` |
| Label | `--color-text-secondary` | `--color-primary` | `--color-error` | Muted |
| Radius | `--radius-md` | Same | Same | Same |

---

## Card

### Event Card

```
┌──────────────────────────────────┐
│ ┌────────────────────────────┐   │
│ │        Cover Image         │   │
│ │    (16:9 aspect ratio)     │   │
│ │                            │   │
│ │    Date badge top-left     │   │
│ └────────────────────────────┘   │
│                                  │
│  Event Title                     │
│  Venue • Date                    │
│                                  │
│  [Guitar] [Drums] [Vocals]      │
│                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━ 42/50   │
│                                  │
│  [RSVP Now →]                    │
└──────────────────────────────────┘
```

| Element | Spec |
|---------|------|
| Width | 320px (grid), 100% (list) |
| Background | `--color-surface` |
| Border | `1px solid --color-border` |
| Radius | `--radius-lg` |
| Hover | Elevate with shadow, translateY(-2px) |
| Image | 16:9 aspect ratio, object-fit: cover |

### Ticket Card

```
┌────────────────────────────────────┐
│  ┌──────────────────────────────┐  │
│  │                              │  │
│  │           QR CODE            │  │
│  │      (High contrast)         │  │
│  │                              │  │
│  └──────────────────────────────┘  │
│                                     │
│  🎵 JAMMING                         │
│                                     │
│  Jazz Night at The Bottleneck       │
│  Saturday, April 15, 2026 • 8PM    │
│  The Bottleneck, Austin, TX        │
│                                     │
│  Ticket: JAM-2026-0042              │
│  Status: ✅ Active                  │
│  Name: Alex Rivera                  │
│                                     │
│  [Download PDF]  [Add to Calendar]  │
└────────────────────────────────────┘
```

| Element | Spec |
|---------|------|
| Width | 400px max, full width on mobile |
| Background | `--color-surface` with subtle purple border |
| QR size | 60% of card width |
| Status badge | Green dot for Active, purple for Used, red for Cancelled |

---

## Modal

```
┌─────────────────────────────────────┐
│  ┌─────────────────────────────┐    │
│  │  Title              [✕]    │    │
│  ├─────────────────────────────┤    │
│  │                             │    │
│  │  Content (scrollable)       │    │
│  │                             │    │
│  ├─────────────────────────────┤    │
│  │  [Cancel]     [Confirm]     │    │
│  └─────────────────────────────┘    │
│                                     │
│  (Overlay: rgba(0,0,0,0.6))         │
└─────────────────────────────────────┘
```

| Size | Width | When |
|------|-------|------|
| sm | 400px | Confirmations, alerts |
| md | 560px | Standard modals |
| lg | 720px | Complex forms, details |
| fullscreen | 100vw × 100vh | Mobile, scanner |

**Animation:** Slide up from bottom (300ms, ease-out). Overlay fades in (250ms).

---

## Toast Notifications

```
┌────────────────────────────────┐
│  ✅  Ticket confirmed!    [✕]  │  ← Success (green)
└────────────────────────────────┘

┌────────────────────────────────┐
│  ⚠️  Event is full!       [✕]  │  ← Warning (amber)
└────────────────────────────────┘

┌────────────────────────────────┐
│  ❌  Payment failed.      [✕]  │  ← Error (red)
└────────────────────────────────┘

┌────────────────────────────────┐
│  ℹ️  Check your email.    [✕]  │  ← Info (blue)
└────────────────────────────────┘
```

| Attribute | Value |
|-----------|-------|
| Position | Top-right (desktop), top-center (mobile) |
| Max width | 400px |
| Background | `--color-surface-higher` |
| Border left | 4px solid (color based on type) |
| Animation | Slide in from right (250ms) |
| Duration | Auto-dismiss after 4 seconds (error: manual only) |
| Stack | Up to 5 toasts, newest on top |

---

## Skeleton / Loading

```
┌────────────────────────────┐
│ ┌──────────────────────┐   │
│ │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│   │  ← Image skeleton (16:9)
│ └──────────────────────┘   │
│                             │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓    │  ← Title skeleton
│  ▓▓▓▓▓▓▓▓▓▓▓              │  ← Subtitle skeleton
│                             │
│  ▓▓▓  ▓▓▓  ▓▓▓             │  ← Tag skeletons
└────────────────────────────┘
```

| Variant | Spec |
|---------|------|
| Text | Height = line height, width varies, radius = `--radius-sm` |
| Circular | Width = height, radius = `--radius-full` (avatars) |
| Rectangular | Width × height from parent, radius = `--radius-md` (images) |
| Card | Full card skeleton with image + text lines |

**Animation:** Shimmer effect — gradient sweep left-to-right, 1.5s cycle.

---

## Empty States

```
┌────────────────────────────────┐
│                                │
│         🎵 (Illustration)      │
│                                │
│     No upcoming events         │
│                                │
│  Check back later for new      │
│  jamming sessions.             │
│                                │
│  [Browse Events]               │
│                                │
└────────────────────────────────┘
```

| Element | Spec |
|---------|------|
| Illustration | Centered, 120×120px, music-themed line art |
| Heading | `--text-xl`, `--color-text-primary`, centered |
| Description | `--text-base`, `--color-text-secondary`, centered |
| CTA Button | Optional, shown when action is available |
| Padding | 64px top + bottom |

---

## Error States

```
┌────────────────────────────────┐
│                                │
│       ⚠️ (Error illustration)  │
│                                │
│     Something went wrong       │
│                                │
│  We couldn't load this page.   │
│  Please try again.             │
│                                │
│  [Try Again]                   │
│                                │
└────────────────────────────────┘
```

**404 Page:**
```
┌────────────────────────────────┐
│                                │
│    🎸 (Lost guitarist illo)    │
│                                │
│     This page isn't playing    │
│                                │
│  The page you're looking for   │
│  doesn't exist or was moved.   │
│                                │
│  [Take Me Home]                │
│                                │
└────────────────────────────────┘
```

---

## Navigation

### Top Navigation (Desktop)

```
[🎵 JAMMING]  [Events]  [About]          [Sign In]  [Sign Up]
                                          
[🎵 JAMMING]  [Events]  [My Tickets]  [Dashboard ▼]  [🔔]  [👤 ▼]
                                                       2     Profile
                                                            Settings
                                                            Sign Out
```

| Element | Spec |
|---------|------|
| Height | 64px |
| Background | `--glass-bg` with `backdrop-filter: blur(12px)` |
| Border bottom | `1px solid --color-border` |
| Sticky | Fixed at top, z-index: 50 |
| Logo | Left-aligned, 32px height |

### Bottom Navigation (Mobile)

```
[🏠 Home]  [🎵 Events]  [🎫 Tickets]  [👤 Profile]
```

| Element | Spec |
|---------|------|
| Height | 56px |
| Background | `--color-surface` with top border |
| Fixed | Bottom of viewport |
| Active state | Purple icon + text |
| Icons | 24×24px, centered |

---

## Scanner Screen (Full-Screen)

```
┌──────────────────────────────────┐
│  [←] Jazz Night Check-In         │
│  ┌────────────────────────────┐  │
│  │                            │  │
│  │                            │  │
│  │      📷 CAMERA             │  │
│  │                            │  │
│  │     ┌──────────────┐       │  │
│  │     │  QR Frame    │       │  │
│  │     │  (viewport)  │       │  │
│  │     └──────────────┘       │  │
│  │                            │  │
│  │                            │  │
│  └────────────────────────────┘  │
│                                   │
│  [Manual Entry]                   │
│                                   │
│  ✅ Scanned: 3 / 42               │
│  ── Recent Scans ──              │
│  ✅ Alex Rivera        7:32 PM    │
│  ✅ Sarah Miller       7:28 PM    │
│  ✅ Jay Kim            7:25 PM    │
└──────────────────────────────────┘
```

### Scan Result — Success (Full Screen)

```
┌──────────────────────────────────┐
│                                  │
│                                  │
│                                  │
│              ✅                   │
│           VALID                  │
│                                  │
│        Alex Rivera               │
│        Drummer                   │
│                                  │
│        ● ● ●                    │
│       (auto-dismiss)             │
│                                  │
│        [Scan Next →]             │
│                                  │
│                                  │
│                                  │
│                                  │
│    Background: #052E16           │
│    Sound: Short success beep     │
└──────────────────────────────────┘
```

### Scan Result — Error (Full Screen)

```
┌──────────────────────────────────┐
│                                  │
│                                  │
│                                  │
│              ❌                   │
│           INVALID                │
│                                  │
│     Invalid ticket signature     │
│                                  │
│        [Try Again]               │
│        [Manual Entry]            │
│                                  │
│                                  │
│                                  │
│                                  │
│    Background: #1C0505           │
│    Sound: Error buzz             │
└──────────────────────────────────┘
```

---

## Responsive Component Behaviors

| Component | Mobile (< 640px) | Tablet (640-1024px) | Desktop (> 1024px) |
|-----------|-----------------|---------------------|-------------------|
| Event Grid | 1 column | 2 columns | 3-4 columns |
| Event Card | Stacked layout | Grid, smaller image | Full grid |
| Dashboard | Full-width stack | Sidebar collapses | Sidebar visible |
| Scanner | Full screen | Full screen | Centered, max 480px |
| Modal | Full-screen sheet | Centered, 90% width | Centered, max 640px |
| Header | Bottom nav + hamburger | Full top nav | Full top nav |
| Event Form | Single column | Single column | Two-column layout |
| Ticket Card | Full width | Centered, max 400px | Centered, max 400px |
