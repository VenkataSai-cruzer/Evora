# Ticket Lifecycle — Jamming Events Platform

## 1. Ticket States

```
                  ┌────────────┐
                  │  PENDING   │ (Phase 2: Payment pending)
                  └─────┬──────┘
                        │ Payment confirmed
                        ▼
                  ┌────────────┐
           ┌──────│   ACTIVE   │◄────── QR Generated
           │      └─────┬──────┘
           │            │
           │            ├────────────────────┐
           │            │                    │
           ▼            ▼                    ▼
    ┌──────────┐  ┌──────────┐      ┌──────────────┐
    │CANCELLED │  │   USED   │      │   REFUNDED   │
    │(by user) │  │(checked  │      │(Phase 2)     │
    └──────────┘  │   in)    │      └──────────────┘
                  └──────────┘
```

---

## 2. Lifecycle Stages

### Stage 1: Pending (Phase 2 — Paid Tickets Only)

| Attribute | Value |
|-----------|-------|
| **When** | After payment initiated, before confirmation |
| **Duration** | ~1-30 seconds (payment processing) |
| **QR Code** | Not yet generated |
| **Actions** | None (waiting for payment confirmation) |
| **Auto-cleanup** | Expires after 30 minutes if payment not completed |

### Stage 2: Active

| Attribute | Value |
|-----------|-------|
| **When** | After successful RSVP (free) or payment (paid) |
| **Duration** | Until check-in, cancellation, or event end |
| **QR Code** | Generated and displayed |
| **QR Payload** | `{ ticketId, eventId, signature }` |
| **Actions** | View, download, cancel, transfer (Phase 3) |
| **Display** | Full ticket card with QR, event details, attendee name |

### Stage 3: Used

| Attribute | Value |
|-----------|-------|
| **When** | After successful QR scan check-in |
| **Duration** | Permanent |
| **QR Code** | Marked as used (still displayed but annotated) |
| **Blockchain** | Check-in hash recorded (Phase 2) |
| **Actions** | View only |
| **Re-entry** | Scanner shows "Already used" |

### Stage 4: Cancelled

| Attribute | Value |
|-----------|-------|
| **When** | Attendee voluntarily cancels |
| **Cuttoff** | Must be > 24 hours before event start |
| **Spot** | Released to waitlist or general availability |
| **QR Code** | Invalidated |
| **Blockchain** | Cancellation recorded (Phase 2) |
| **Refund** | Full refund (paid tickets) or free cancellation |

### Stage 5: Refunded (Phase 2)

| Attribute | Value |
|-----------|-------|
| **When** | After refund is processed |
| **QR Code** | Invalidated |
| **Blockchain** | Refund recorded (Phase 2) |
| **Actions** | View only |

---

## 3. QR Code Specification

### QR Generation

```typescript
interface QRPayload {
  ticketId: string;       // UUID
  eventId: string;        // UUID
  ticketNumber: string;   // Human-readable
  issuedAt: string;       // ISO timestamp
  signature: string;      // HMAC-SHA256 hash
}

// Signature generation
const signature = crypto
  .createHmac('sha256', process.env.QR_SECRET_KEY!)
  .update(`${ticketId}:${eventId}:${ticketNumber}`)
  .digest('hex');
```

### QR Content

- **Format:** Compact JSON encoded in QR
- **Size:** ~300 bytes per QR (fits in QR version 4, 33x33 modules)
- **Error correction:** Level M (15% damage tolerance)
- **Foreground:** Black (#000000)
- **Background:** White (#FFFFFF)
- **Size:** 1000x1000px (scalable)

### QR Display

- **User view:** Large QR taking up 60% of ticket card
- **Scanner view:** Camera viewfinder matches QR aspect ratio
- **Print version:** Full-page ticket with QR, event details, tear-off
- **Accessibility:** Ticket number displayed below QR for manual entry

---

## 4. Ticket Numbering Scheme

```
Format:  [PREFIX]-[YEAR]-[SEQUENTIAL]

Example: JAM-2026-00042
         │    │     │
         │    │     └── Sequential number (zero-padded to 5 digits)
         │    └──────── Year
         └───────────── Platform prefix

Sequence: Resets yearly. Auto-incremented via database sequence.
```

---

## 5. Ticket Capacity Management

```
Event capacity: 50

Ticket count tracks:
  - ACTIVE tickets: 42
  - USED tickets: 18 (subset of active)
  - CANCELLED tickets: 3
  - REFUNDED tickets: 1

Available spots: capacity - ACTIVE - CANCELLED (cancelled spots reopen)
                 50 - 42 - 3 = 5 available spots
```

### Race Condition Prevention

```sql
-- Atomic capacity check and ticket creation
BEGIN;
  SELECT COUNT(*) FROM tickets 
  WHERE event_id = :eventId AND status IN ('ACTIVE', 'PENDING')
  FOR UPDATE;  -- Row-level lock
  
  IF count < event.capacity THEN
    INSERT INTO tickets (...) VALUES (...);
    COMMIT;
    RETURN success;
  ELSE
    ROLLBACK;
    RETURN 'event_full';
  END IF;
END;
```

---

## 6. Ticket Expiry & Cleanup

| Event | TTL | Action |
|-------|-----|--------|
| Pending payment (Phase 2) | 30 min | Cancel → release spot |
| Active ticket | Until event end + 7 days | Archive |
| Used ticket | Until event end + 30 days | Archive |
| Cancelled ticket | Immediate | Spot released |
| Old events (completed) | 90 days | Hard delete tickets |
| Unused tickets (no-show) | 24h after event | Mark as no-show |

---

## 7. Ticket Actions by Role

| Action | Attendee | Organizer | Admin |
|--------|----------|-----------|-------|
| View own ticket | ✅ | ✅ | ✅ |
| View anyone's ticket | ❌ | ✅ (their event) | ✅ |
| Cancel own ticket | ✅ (24h+) | ❌ | ✅ |
| Cancel anyone's ticket | ❌ | ✅ (their event) | ✅ |
| Refund ticket | ❌ | ✅ (Phase 2) | ✅ |
| Transfer ticket | ❌ | ❌ (Phase 3) | ❌ |
| Check-in ticket | ❌ | ✅ | ✅ |
| View check-in history | Own only | Their event | ✅ |
| View blockchain record | Own only | Their event | ✅ |

---

## 8. Visual Ticket States

| State | Background | Badge | QR Style |
|-------|-----------|-------|----------|
| Active | Clean white/dark | Green "Active" | Normal QR |
| Used | Faded, purple tint | Purple "Used ✓" | QR with checkmark |
| Cancelled | Dimmed, red tint | Red "Cancelled" | QR crossed out |
| Refunded | Dimmed, orange tint | Orange "Refunded" | QR crossed out |
| Pending | Animated skeleton | Yellow "Processing" | Pulse animation |
