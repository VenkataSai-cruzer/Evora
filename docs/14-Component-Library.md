# Component Library — Jamming Events Platform

## 1. Component Hierarchy

```
Page Layouts
├── AppShell (Header + Main + Footer)
├── DashboardLayout (Header + Sidebar + Main)
└── AuthLayout (Centered card)

Shared UI Components
├── Button
├── Input
├── Select
├── Textarea
├── Toggle
├── Badge
├── Avatar
├── Card
├── Modal
├── Toast
├── Skeleton
├── Spinner
├── Tooltip
├── DropdownMenu
├── Tabs
├── Tag
├── Chip
├── ProgressBar
├── EmptyState
├── ErrorState
├── ConfirmDialog
├── CookieConsent
├── NotificationCenter (in-app notification list)

Feature Components
├── EventCard
├── EventGrid
├── EventDetail
├── EventForm
├── TicketCard
├── TicketQR
├── ScannerView
├── ScanResult
├── AttendeeList
├── AttendeeRow
├── DashboardStats
├── EventRow (dashboard)
├── NotificationBell
├── NotificationItem
├── WaitlistBadge
├── ShareButtons
├── MapView
└── AuthForms (Login, Register, ResetPassword)
```

---

## 2. Shared UI Components

### Button

```tsx
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}
```

| Variant | Purpose |
|---------|---------|
| primary | Main CTA (RSVP, Create Event, Confirm) |
| secondary | Alternative actions (Cancel, Edit) |
| ghost | Subtle actions (Copy Link, Share) |
| danger | Destructive actions (Cancel Event, Delete) |

**States:** default, hover, active, loading (spinner), disabled

### Input

```tsx
interface InputProps {
  label?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  required?: boolean;
  icon?: ReactNode;
  type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'time';
  value: string;
  onChange: (value: string) => void;
}
```

**States:** default, focused, filled, error, disabled

### Badge (Status indicator)

```tsx
interface BadgeProps {
  variant: 'active' | 'cancelled' | 'completed' | 'draft' | 'used' | 'valid' | 'invalid';
  size?: 'sm' | 'md';
  children: ReactNode;
}
```

### Card

```tsx
interface CardProps {
  variant?: 'default' | 'interactive' | 'highlighted';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
  children: ReactNode;
}
```

### Modal

```tsx
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'fullscreen';
  children: ReactNode;
  footer?: ReactNode;
  closeOnOverlay?: boolean;
}
```

### Toast

```tsx
interface ToastProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number; // ms, 0 = persistent
  action?: { label: string; onClick: () => void };
  onDismiss: () => void;
}
```

### CookieConsent

```tsx
interface CookieConsentProps {
  onAccept: () => void;
  onReject: () => void;
  onCustomize: () => void;
}
```

**Behavior:**
- Shown as a fixed bottom banner on first visit
- Options: Accept All | Reject Non-Essential | Customize
- Stores consent in localStorage
- Respects `doNotTrack` browser setting
- Links to `/legal/cookies` and `/legal/privacy`

### NotificationCenter

```tsx
interface NotificationCenterProps {
  notifications: NotificationItem[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClose: () => void;
}

interface NotificationItem {
  id: string;
  type: 'ticket_confirmation' | 'event_reminder' | 'event_cancelled' | 'waitlist_promoted';
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: string;
}
```

**Behavior:**
- Accessible via bell icon in header
- Unread count badge on bell
- Dropdown panel showing recent notifications
- "Mark all as read" action
- Clicking a notification navigates to relevant page
- Empty state when no notifications

### Skeleton

```tsx
interface SkeletonProps {
  variant: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  count?: number; // repeat lines
}
```

---

## 3. Feature Components

### EventCard

```
┌──────────────────────┐
│ {Cover Image}        │
│                      │
│ Date badge (top-left)│
│                      │
├──────────────────────┤
│ Title                │
│ Venue • Time         │
│                      │
│ [Guitar] [Drums]     │
│                      │
│ Capacity bar         │
│ 45/50 filled         │
│                      │
│ [RSVP] or [Sold Out] │
└──────────────────────┘
```

**Props:**
```tsx
interface EventCardProps {
  event: {
    id: string;
    slug: string;
    title: string;
    date: string;
    time: string;
    venue: string;
    coverImage: string;
    capacity: number;
    ticketsSold: number;
    price: number | null; // null = free
    instruments: string[];
    status: EventStatus;
  };
  variant?: 'grid' | 'list';
}
```

### EventGrid

```tsx
interface EventGridProps {
  events: EventCardProps['event'][];
  loading?: boolean;
  emptyMessage?: string;
  columns?: 2 | 3 | 4; // responsive
}
```

### TicketCard

```
┌─────────────────────────────┐
│                             │
│       🎵 JAMMING            │
│                             │
│  ┌───────────────────────┐  │
│  │                       │  │
│  │       [QR CODE]       │  │
│  │     (High contrast)   │  │
│  │                       │  │
│  └───────────────────────┘  │
│                             │
│  Event Title                │
│  Date • Time • Venue        │
│                             │
│  Ticket: JAM-2026-0042     │
│  Status: Active             │
│                             │
│  [Download] [Add to Cal]   │
│                             │
└─────────────────────────────┘
```

**Props:**
```tsx
interface TicketCardProps {
  ticket: {
    id: string;
    ticketNumber: string;
    eventTitle: string;
    eventDate: string;
    eventTime: string;
    venue: string;
    attendeeName: string;
    status: 'active' | 'used' | 'cancelled';
    qrDataUrl: string;
  };
  onDownload?: () => void;
  onAddToCalendar?: () => void;
}
```

### ScannerView

```tsx
interface ScannerViewProps {
  eventId: string;
  onScan: (result: ScanResult) => void;
  recentScans: ScanResult[];
  totalScanned: number;
  totalTickets: number;
}
```

### ScanResult

```tsx
interface ScanResultProps {
  result: {
    status: 'valid' | 'used' | 'invalid' | 'cancelled';
    attendeeName?: string;
    ticketNumber?: string;
    message: string;
    timestamp: string;
  };
  onScanNext: () => void;
  autoDismiss?: boolean;
  autoDismissDuration?: number;
}
```

### DashboardStats

```tsx
interface DashboardStatsProps {
  stats: {
    activeEvents: number;
    totalTickets: number;
    checkedInToday: number;
    revenue?: number;
  };
}
```

### EventForm

```tsx
interface EventFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<EventData>;
  onSubmit: (data: EventFormData) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}
```

### AttendeeList

```tsx
interface AttendeeListProps {
  eventId: string;
  attendees: Attendee[];
  onExport?: () => void;
  onRefresh?: () => void;
}
```

### WaitlistBadge

```tsx
interface WaitlistBadgeProps {
  position: number; // 0 = next in line
  totalOnWaitlist: number;
}
```

---

## 4. Layout Components

### AppShell

```
┌──────────────────────────────────┐
│ Header                           │
│ [Logo]  [Nav Links]  [Profile]   │
├──────────────────────────────────┤
│                                  │
│           Main Content           │
│                                  │
├──────────────────────────────────┤
│ Footer                           │
│ [Links]  [Legal]  [Social]       │
└──────────────────────────────────┘
```

### DashboardLayout

```
┌──────────────────────────────────┐
│ Header (compact)                 │
├──────────┬───────────────────────┤
│ Sidebar  │  Main Content         │
│          │                       │
│ Overview │  (Event list,         │
│ My Events│   scanner, stats)     │
│ Create   │                       │
│ Scanner  │                       │
│ Analytics│                       │
│          │                       │
│ Settings │                       │
└──────────┴───────────────────────┘
```

### AuthLayout

```
┌──────────────────────────────────┐
│                                  │
│         [Logo - Large]           │
│                                  │
│    ┌──────────────────────┐      │
│    │                      │      │
│    │   Auth Form Card     │      │
│    │   (Login/Register/   │      │
│    │    Reset Password)   │      │
│    │                      │      │
│    └──────────────────────┘      │
│                                  │
│         [Footer links]           │
│                                  │
└──────────────────────────────────┘
```

---

## 5. Component States

Each component must handle these states:

| State | Description | Example |
|-------|-------------|---------|
| **Default** | Normal display | Event card in grid |
| **Loading** | Data is being fetched | Skeleton variant |
| **Empty** | No data to display | EmptyState component |
| **Error** | Failed to load data | ErrorState with retry |
| **Disabled** | Action temporarily unavailable | Button when RSVP closed |
| **Active** | Current/interactive state | Selected tab |
| **Hover** | Mouse over interactive element | Card hover elevation |
| **Focus** | Keyboard focus | Input focus ring |
| **Transitioning** | Between states | Spinner overlay |

---

## 6. Accessibility States

| Attribute | Usage |
|-----------|-------|
| `aria-label` | Icon-only buttons |
| `aria-describedby` | Error messages linked to inputs |
| `aria-live="polite"` | Dynamic content updates |
| `role="status"` | Toast notifications |
| `role="alert"` | Error messages |
| `tabindex="0"` | Keyboard-focusable elements |
| `aria-expanded` | Dropdown menus |
| `aria-current="page"` | Active navigation link |

---

## 7. Responsive Component Behaviors

| Component | Mobile (< 640px) | Tablet (640-1024px) | Desktop (> 1024px) |
|-----------|-----------------|---------------------|-------------------|
| EventGrid | 1 column | 2 columns | 3-4 columns |
| EventCard | Stacked layout | Grid, smaller image | Full grid |
| Dashboard | Full-width stack | Sidebar collapses | Sidebar visible |
| Scanner | Full screen | Full screen | Centered, max 480px |
| Modal | Full-screen sheet | Centered, 90% width | Centered, max 640px |
| Header | Bottom nav + hamburger | Top nav + hamburger | Full top nav |
| EventForm | Single column | Single column | Two-column layout |
| TicketCard | Full width | Centered, max 400px | Centered, max 400px |
