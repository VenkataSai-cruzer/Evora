# Design System — Jamming Events Platform

## 1. Design Principles

1. **Minimal & Intentional** — Every element serves a purpose. No decoration without meaning.
2. **Music-Inspired** — Rhythm, harmony, and flow in layouts, transitions, and interactions.
3. **Trustworthy** — Clear hierarchy, predictable patterns, transparent actions.
4. **Premium** — High-quality visuals, smooth animations, thoughtful whitespace.
5. **Accessible** — WCAG 2.1 AA compliant, inclusive by default.

---

## 2. Brand Identity

### Brand Name
**Jamming** — lowercase, friendly, musical

### Tagline
*"Where Music Happens"*

### Brand Voice

| Attribute | Application |
|-----------|-------------|
| Warm | Inclusive language, welcoming tone |
| Direct | Clear calls-to-action, no jargon |
| Passionate | Music-centric metaphors and language |
| Confident | Clean UI, no apologies |
| Minimal | Say more with fewer words |

---

## 3. Color Palette

### Primary Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-primary` | `#7C3AED` (Purple Violet) | Primary buttons, links, active states |
| `--color-primary-hover` | `#6D28D9` | Button hover states |
| `--color-primary-light` | `#EDE9FE` | Background tints, badges |
| `--color-primary-dark` | `#5B21B6` | Pressed states |

### Neutral Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-bg` | `#0A0A0A` | Page background (dark mode) |
| `--color-surface` | `#1A1A1A` | Cards, modals, dropdowns |
| `--color-surface-hover` | `#242424` | Card hover states |
| `--color-border` | `#2A2A2A` | Borders, dividers |
| `--color-text-primary` | `#FFFFFF` | Primary text |
| `--color-text-secondary` | `#A1A1AA` | Secondary text |
| `--color-text-muted` | `#52525B` | Placeholder, disabled |

### Accent Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-success` | `#22C55E` | Valid scan, confirmation |
| `--color-warning` | `#F59E0B` | Used ticket, near capacity |
| `--color-error` | `#EF4444` | Invalid scan, errors |
| `--color-info` | `#3B82F6` | Information, links |

### Status Colors (Scan Results)

| State | Background | Text | Border |
|-------|-----------|------|--------|
| Valid | `#052E16` | `#22C55E` | `#22C55E` |
| Used | `#1C1004` | `#F59E0B` | `#F59E0B` |
| Invalid | `#1C0505` | `#EF4444` | `#EF4444` |
| Cancelled | `#1C0505` | `#EF4444` | `#EF4444` |

---

## 4. Typography

### Font Family

| Usage | Font | Fallback |
|-------|------|----------|
| Headings | `Cabinet Grotesk` or `Inter` | `system-ui, sans-serif` |
| Body | `Inter` | `system-ui, sans-serif` |
| Mono | `JetBrains Mono` | `monospace` |

### Type Scale

| Token | Size | Weight | Line Height | Letter Spacing | Usage |
|-------|------|--------|-------------|----------------|-------|
| `--text-xs` | 0.75rem (12px) | 400 | 1.5 | Normal | Captions, labels |
| `--text-sm` | 0.875rem (14px) | 400 | 1.5 | Normal | Body small |
| `--text-base` | 1rem (16px) | 400 | 1.5 | Normal | Body text |
| `--text-lg` | 1.125rem (18px) | 500 | 1.4 | -0.01em | Large body |
| `--text-xl` | 1.25rem (20px) | 600 | 1.3 | -0.01em | Subheadings |
| `--text-2xl` | 1.5rem (24px) | 600 | 1.25 | -0.02em | Section headings |
| `--text-3xl` | 1.875rem (30px) | 700 | 1.2 | -0.02em | Page headings |
| `--text-4xl` | 2.25rem (36px) | 700 | 1.1 | -0.03em | Hero headings |
| `--text-5xl` | 3rem (48px) | 800 | 1 | -0.03em | Large hero |

---

## 5. Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Tiny gaps |
| `--space-2` | 8px | Small gaps, icon margins |
| `--space-3` | 12px | Form field gaps |
| `--space-4` | 16px | Standard padding |
| `--space-5` | 20px | Comfortable padding |
| `--space-6` | 24px | Section gaps |
| `--space-8` | 32px | Large sections |
| `--space-10` | 40px | Page sections |
| `--space-12` | 48px | Hero sections |
| `--space-16` | 64px | Major page sections |

---

## 6. Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 4px | Small tags, badges |
| `--radius-md` | 8px | Cards, inputs, buttons |
| `--radius-lg` | 12px | Modals, large cards |
| `--radius-xl` | 16px | Hero sections |
| `--radius-full` | 9999px | Pills, avatars |

---

## 7. Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` | Subtle depth |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.4)` | Cards |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.5)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.6)` | Hero sections |
| `--shadow-glow-primary` | `0 0 20px rgba(124,58,237,0.3)` | Glowing accents |

---

## 8. Transitions & Animation

### Durations

| Token | Value | Usage |
|-------|-------|-------|
| `--duration-fast` | 150ms | Hover states |
| `--duration-normal` | 250ms | Standard transitions |
| `--duration-slow` | 400ms | Page transitions |

### Easing

| Token | Value |
|-------|-------|
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` |
| `--ease-bounce` | `cubic-bezier(0.34, 1.56, 0.64, 1)` |

### Key Animations

| Animation | Purpose | Duration |
|-----------|---------|----------|
| `fadeIn` | Mount content | 250ms |
| `slideUp` | Mount modal/drawer | 300ms |
| `scanSuccess` | QR scan success pulse | 500ms |
| `scanError` | QR scan error shake | 400ms |
| `pulse` | Loading skeleton | 1.5s (infinite) |
| `spin` | Loading spinner | 1s (infinite) |

---

## 9. Iconography

### Style
- **Line icons** with 1.5px stroke weight
- **24x24** default size
- **Current color** awareness (inherit stroke color)
- **Rounded** corners on line endings

### Required Icon Set

| Area | Icons |
|------|-------|
| Navigation | Home, Calendar, Ticket, User, Settings, Logout, Bell |
| Actions | Plus, Edit, Delete, Search, Filter, Share, Download, Copy |
| Status | Check, X, Alert, Info, Clock, CheckCircle, XCircle |
| Music | Music, Guitar, Drums, Mic, Piano, Headphones |
| Events | MapPin, Users, Clock, Calendar, Dollar, Tag |
| Check-In | Camera, QRCode, Scan, Fingerprint |
| Communication | Mail, Send, Notification, Message |
| Media | Image, Upload, Play, Photo |

---

## 10. Dark Mode

The design system is **dark-first** (dark mode is the default). Light mode (future) will invert the palette.

| Element | Dark Mode | Light Mode (Future) |
|---------|-----------|---------------------|
| Background | `#0A0A0A` | `#FAFAFA` |
| Surface | `#1A1A1A` | `#FFFFFF` |
| Text | `#FFFFFF` | `#0A0A0A` |
| Border | `#2A2A2A` | `#E4E4E7` |

---

## 11. Component-Specific Tokens

### Buttons

| Attribute | Primary | Secondary | Ghost | Danger |
|-----------|---------|-----------|-------|--------|
| Background | `--color-primary` | Transparent | Transparent | `--color-error` |
| Hover BG | `--color-primary-hover` | `--color-surface-hover` | `--color-surface-hover` | `#DC2626` |
| Text Color | White | `--color-text-primary` | `--color-text-secondary` | White |
| Border | None | `--color-border` | None | None |
| Padding | 12px 24px | 12px 24px | 8px 16px | 12px 24px |

### Inputs

| Attribute | Default | Focus | Error | Disabled |
|-----------|---------|-------|-------|----------|
| Border | `--color-border` | `--color-primary` | `--color-error` | `--color-border` |
| Background | `--color-surface` | `--color-surface` | `--color-surface` | `--color-surface` |
| Text | `--color-text-primary` | `--color-text-primary` | `--color-text-primary` | `--color-text-muted` |
| Label | `--color-text-secondary` | `--color-primary` | `--color-error` | `--color-text-muted` |

---

## 12. Design Token File Structure

```css
/* tokens.css */
:root {
  /* Colors */
  --color-primary: #7C3AED;
  --color-primary-hover: #6D28D9;
  /* ... */

  /* Typography */
  --text-base: 1rem;
  /* ... */

  /* Spacing */
  --space-4: 16px;
  /* ... */

  /* Radii */
  --radius-md: 8px;
  /* ... */

  /* Shadows */
  --shadow-md: 0 4px 6px rgba(0,0,0,0.4);
  /* ... */

  /* Transitions */
  --duration-normal: 250ms;
  /* ... */
}
```

---

## 13. Color Accessibility Compliance

| Color Pair | Contrast Ratio | WCAG AA | WCAG AAA |
|-----------|---------------|---------|----------|
| White on `#1A1A1A` (surface) | 13.2:1 | ✅ | ✅ |
| `#A1A1AA` on `#1A1A1A` (secondary text) | 6.5:1 | ✅ | ✅ |
| `#7C3AED` on `#FFFFFF` (primary on white) | 6.8:1 | ✅ | ✅ |
| `#22C55E` on `#052E16` (success) | 7.1:1 | ✅ | ✅ |
| `#EF4444` on `#1C0505` (error) | 7.5:1 | ✅ | ✅ |
| `#52525B` on `#1A1A1A` (muted) | 3.2:1 | ❌ (large text only) | ❌ |
