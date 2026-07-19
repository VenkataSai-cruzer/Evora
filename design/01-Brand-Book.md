# Brand Book — Jamming

## Brand Identity

### Brand Name
**Jamming** — lowercase, one word, energetic, musical

### Tagline
*"Where Music Happens"*

### Brand Essence
**Premium · Minimal · Musical · Warm**

### Brand Personality

| Attribute | How It Shows |
|-----------|-------------|
| Warm | Rounded corners, soft shadows, inviting language |
| Bold | High-contrast purple accent, confident typography |
| Artistic | Generous whitespace, music-inspired micro-interactions |
| Trustworthy | Clear hierarchy, predictable patterns, transparent actions |
| Minimal | Every element serves a purpose. Nothing decorative. |

### Tone of Voice

| Context | Tone | Example |
|---------|------|---------|
| Welcome | Warm, exciting | "Ready to jam?" |
| Confirmation | Clear, direct | "You're in! Your ticket is ready." |
| Error | Helpful, not blaming | "Something went wrong. Let's try again." |
| Empty state | Encouraging | "No events yet. Be the first to create one." |
| Cancellation | Respectful | "We're sorry to see you go. Your spot has been released." |

### What We Don't Sound Like
- Corporate ("Our platform enables...")
- Robotic ("An error has occurred. Code: 500.")
- Overly casual ("Yo, grab a ticket fam!")
- Scammy ("LIMITED TIME OFFER!!!")

---

## Logo Usage

### Primary Logo
```
[🎵 JAMMING]
Wordmark with music note icon
```

### Logo Variations

| Variation | Usage | Background |
|-----------|-------|------------|
| Full color | Primary — most contexts | Dark (#0A0A0A) |
| White | Dark backgrounds only | Dark/colored |
| Small (icon only) | Favicon, mobile nav, avatar placeholder | Any |

### Clear Space
Minimum clear space around logo = height of the "J" character.

### Incorrect Usage
- ❌ Do not stretch or distort the logo
- ❌ Do not change the logo colors
- ❌ Do not add effects (shadows, gradients, outlines)
- ❌ Do not rotate the logo

---

## Color System

### Primary Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-primary` | `#7C3AED` | Primary buttons, links, active states |
| `--color-primary-hover` | `#6D28D9` | Hover states for primary elements |
| `--color-primary-light` | `#EDE9FE` | Subtle backgrounds, active badges |
| `--color-primary-dark` | `#5B21B6` | Pressed states, dark variant |

### Neutral Palette (Dark Theme)

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-bg` | `#0A0A0A` | Page background |
| `--color-surface` | `#1A1A1A` | Cards, modals, dropdowns |
| `--color-surface-elevated` | `#242424` | Hovered cards, elevated surfaces |
| `--color-surface-higher` | `#2E2E2E` | Modals, tooltips |
| `--color-border` | `#2A2A2A` | Borders, dividers |
| `--color-border-light` | `#333333` | Subtle borders |
| `--color-text-primary` | `#FFFFFF` | Primary text |
| `--color-text-secondary` | `#A1A1AA` | Secondary text |
| `--color-text-muted` | `#52525B` | Placeholder, disabled |

### Functional Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-success` | `#22C55E` | Valid scans, confirmations, success states |
| `--color-success-bg` | `#052E16` | Success background |
| `--color-warning` | `#F59E0B` | Used tickets, warnings, near capacity |
| `--color-warning-bg` | `#1C1004` | Warning background |
| `--color-error` | `#EF4444` | Invalid scans, errors, cancellations |
| `--color-error-bg` | `#1C0505` | Error background |
| `--color-info` | `#3B82F6` | Information, help, links |

### Status Colors (Scan Results)

| State | Background | Text/Icon | Border |
|-------|-----------|-----------|--------|
| ✅ Valid | `#052E16` | `#22C55E` | `#22C55E` |
| ⚠️ Used | `#1C1004` | `#F59E0B` | `#F59E0B` |
| ❌ Invalid | `#1C0505` | `#EF4444` | `#EF4444` |
| ❌ Cancelled | `#1C0505` | `#EF4444` | `#EF4444` |

### Gradient (Hero/Accent)

```css
--gradient-hero: linear-gradient(135deg, #7C3AED 0%, #6D28D9 50%, #5B21B6 100%);
--gradient-glow: radial-gradient(ellipse at center, rgba(124,58,237,0.15) 0%, transparent 70%);
```

---

## Typography

### Font Family

| Usage | Font | Fallback |
|-------|------|----------|
| Headings (display) | `Cabinet Grotesk` | `system-ui, sans-serif` |
| Body text | `Inter` | `system-ui, sans-serif` |
| Monospace (codes) | `JetBrains Mono` | `monospace` |

### Type Scale

```css
--text-xs:   0.75rem  (12px)   — Captions, metadata
--text-sm:   0.875rem (14px)   — Body small, labels
--text-base: 1rem     (16px)   — Body text
--text-lg:   1.125rem (18px)   — Large body, lead
--text-xl:   1.25rem  (20px)   — Subheadings, card titles
--text-2xl:  1.5rem   (24px)   — Section headings
--text-3xl:  1.875rem (30px)   — Page headings
--text-4xl:  2.25rem  (36px)   — Hero headings
--text-5xl:  3rem     (48px)   — Large hero
```

### Font Weights

| Weight | Usage |
|--------|-------|
| 400 (Regular) | Body text, labels |
| 500 (Medium) | Buttons, navigation |
| 600 (Semibold) | Subheadings, emphasized text |
| 700 (Bold) | Headings |
| 800 (ExtraBold) | Hero headings (display only) |

### Line Heights

```css
--leading-tight:    1.1    — Headings
--leading-normal:   1.5    — Body text
--leading-relaxed:  1.75   — Large text blocks
```

---

## Spacing System

```css
--space-1:   4px    — Tiny gaps
--space-2:   8px    — Small gaps, icon margins
--space-3:   12px   — Form field gaps
--space-4:   16px   — Standard padding (base unit)
--space-5:   20px   — Comfortable padding
--space-6:   24px   — Section gaps
--space-8:   32px   — Large sections (2× base)
--space-10:  40px   — Page sections
--space-12:  48px   — Hero sections (3× base)
--space-16:  64px   — Major page sections (4× base)
```

**Rule:** Use multiples of 4px. Always prefer the space tokens over arbitrary values.

---

## Border Radius

```css
--radius-sm:    4px    — Tags, badges, small elements
--radius-md:    8px    — Cards, inputs, buttons
--radius-lg:    12px   — Modals, large cards, dropdowns
--radius-xl:    16px   — Hero sections, full-screen modals
--radius-full:  9999px — Pills, avatars, circular elements
```

---

## Shadows

```css
--shadow-sm:  0 1px 2px rgba(0,0,0,0.3)        — Subtle depth
--shadow-md:  0 4px 6px rgba(0,0,0,0.4)         — Cards
--shadow-lg:  0 10px 15px rgba(0,0,0,0.5)       — Modals, dropdowns
--shadow-xl:  0 20px 25px rgba(0,0,0,0.6)       — Hero sections
--shadow-glow-purple: 0 0 20px rgba(124,58,237,0.3)  — Glowing accent
--shadow-glow-green:  0 0 20px rgba(34,197,94,0.3)   — Success glow
--shadow-glow-red:    0 0 20px rgba(239,68,68,0.3)   — Error glow
```

---

## Glass Effects

```css
--glass-bg:        rgba(26, 26, 26, 0.8);
--glass-border:    rgba(255, 255, 255, 0.08);
--glass-blur:      blur(12px);
--glass-saturate:  saturate(180%);

/* Usage: modals, nav bars, overlays */
.glass {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur) var(--glass-saturate);
  -webkit-backdrop-filter: var(--glass-blur) var(--glass-saturate);
  border: 1px solid var(--glass-border);
}
```

---

## Motion Guidelines

### Duration

| Token | Value | Usage |
|-------|-------|-------|
| `--duration-fast` | 150ms | Hover states, micro-interactions |
| `--duration-normal` | 250ms | Standard transitions, page elements |
| `--duration-slow` | 400ms | Page transitions, modals |
| `--duration-scan` | 500ms | QR scan result pulse animation |

### Easing

| Token | Value | Usage |
|-------|-------|-------|
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Elements entering |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | Page transitions |
| `--ease-bounce` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Playful micro-interactions |

### Motion Principles

1. **Fast** — UI should feel responsive (150-250ms for most interactions)
2. **Subtle** — Motion supports, never distracts
3. **Meaningful** — Every animation has a purpose (feedback, focus, transition)
4. **Accessible** — Respect `prefers-reduced-motion`

---

## Illustration & Photography Style

### Illustrations
- **Minimal line art** style with 1.5px stroke weight
- **Purple accent** color as primary, white as secondary
- **Rounded** corners on line endings
- **Used for:** Empty states, onboarding, error pages, hero graphics

### Photography
- **Dark, moody** concert photography style
- **High contrast** with dramatic lighting
- **Warm tones** (amber, gold, deep purple)
- **Candid** musician shots (playing instruments, not posed)
- **Used for:** Event cover images, hero sections, about page

### Icon Style
- **Line icons** with 1.5px stroke
- **24×24px** default size
- **Rounded** line caps and joins
- **Fill** variant for selected/active states
- **Stroke:** `currentColor` for theme compatibility

---

## Button Behavior

### Button Hierarchy

| Variant | Purpose | Usage |
|---------|---------|-------|
| Primary (purple) | Main call-to-action | RSVP, Create Event, Confirm, Purchase |
| Secondary (outlined) | Alternative action | Cancel, Edit, Learn More |
| Ghost (text) | Subtle action | Copy Link, Share, Add to Calendar |
| Danger (red) | Destructive action | Cancel Event, Delete, Remove |

### Button States

| State | Change |
|-------|--------|
| Default | Normal appearance |
| Hover | Background darkens 10%, slight lift (translateY(-1px)) |
| Active/Pressed | Scale(0.97), background darkens further |
| Loading | Show spinner, disable interaction |
| Disabled | Opacity 50%, cursor not-allowed |

---

## Grid System

### Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 640px | Single column, bottom navigation |
| Tablet | 640px – 1024px | 2 columns, condensed header |
| Desktop | 1024px – 1440px | Multi-column, sidebar visible |
| Wide | > 1440px | Max-width 1280px container, centered |

### Grid

```css
--grid-cols: 12;
--grid-gap: 24px;
--container-max: 1280px;
--container-padding: 24px; /* 16px on mobile */
```

---

## Accessibility Rules

| Rule | Implementation |
|------|---------------|
| Color contrast | All text pairs ≥ 4.5:1 (AA) for normal, ≥ 3:1 for large |
| Focus indicators | 2px solid outline with 2px offset on all interactive elements |
| Touch targets | Minimum 44×44px for all interactive elements |
| Keyboard navigation | All interactive elements reachable via Tab |
| Screen reader | ARIA labels on icon-only buttons, live regions for dynamic content |
| Motion | Respect `prefers-reduced-motion: reduce` |
| Text sizing | All text uses rem units (browser zoom compatible) |
| Alt text | Every image has meaningful alt text |
