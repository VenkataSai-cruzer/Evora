# QR Verification — Jamming Events Platform

## 1. QR Code Generation

### Library
`qrcode` npm package (server-side generation)

### Generation Process

```typescript
import QRCode from 'qrcode';

interface QRData {
  ticketId: string;
  ticketNumber: string;
  eventId: string;
  sig: string; // HMAC-SHA256 signature
}

async function generateTicketQR(ticket: Ticket): Promise<string> {
  const payload: QRData = {
    ticketId: ticket.id,
    ticketNumber: ticket.ticketNumber,
    eventId: ticket.eventId,
    sig: generateSignature(ticket),
  };
  
  // Compact JSON to minimize QR size
  const json = JSON.stringify(payload);
  
  // Generate as data URL
  const qrDataUrl = await QRCode.toDataURL(json, {
    width: 1000,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'M',
  });
  
  return qrDataUrl;
}

function generateSignature(ticket: Ticket): string {
  const crypto = require('crypto');
  return crypto
    .createHmac('sha256', process.env.QR_SECRET_KEY!)
    .update(`${ticket.id}:${ticket.eventId}:${ticket.ticketNumber}`)
    .digest('hex')
    .substring(0, 16); // Truncated for QR size efficiency
}
```

---

## 2. QR Scanning Implementation

### Frontend Scanner Component

```tsx
// /src/components/scanner/ScannerView.tsx
import { QrReader } from 'react-qr-reader';

interface ScannerViewProps {
  onScan: (result: ScanResult) => void;
  onError: (error: string) => void;
}

export function ScannerView({ onScan, onError }: ScannerViewProps) {
  return (
    <div className="scanner-container">
      <QrReader
        constraints={{ facingMode: 'environment' }}
        onResult={(result, error) => {
          if (result) {
            try {
              const data = JSON.parse(result.getText());
              verifyAndCheckIn(data);
            } catch {
              onError('Invalid QR code format');
            }
          }
          if (error) {
            // QR reader errors are expected between scans
          }
        }}
        containerStyle={{ width: '100%' }}
        videoStyle={{ objectFit: 'cover' }}
      />
    </div>
  );
}
```

### Scanner Verification Flow

```typescript
// /src/lib/services/checkin.service.ts

interface CheckInRequest {
  ticketId: string;
  eventId: string;
  signature: string;
  scannerId: string;
}

interface CheckInResult {
  status: 'VALID' | 'USED' | 'INVALID' | 'CANCELLED' | 'WRONG_EVENT';
  attendeeName?: string;
  ticketNumber?: string;
  message: string;
}

export async function processCheckIn(
  request: CheckInRequest
): Promise<CheckInResult> {
  const { ticketId, eventId, signature, scannerId } = request;
  
  // 1. Verify signature
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { event: true, user: true },
  });
  
  if (!ticket) {
    return { status: 'INVALID', message: 'Ticket not found' };
  }
  
  // 2. Verify HMAC signature
  const expectedSig = crypto
    .createHmac('sha256', process.env.QR_SECRET_KEY!)
    .update(`${ticket.id}:${ticket.eventId}:${ticket.ticketNumber}`)
    .digest('hex')
    .substring(0, 16);
  
  if (signature !== expectedSig) {
    await logAuditEvent('checkin.signature_mismatch', { ticketId, scannerId });
    return { status: 'INVALID', message: 'Invalid ticket signature' };
  }
  
  // 3. Verify event match
  if (ticket.eventId !== eventId) {
    return { status: 'WRONG_EVENT', message: 'This ticket is for a different event' };
  }
  
  // 4. Check ticket status
  if (ticket.status === 'USED') {
    const checkIn = await prisma.checkIn.findUnique({
      where: { ticketId: ticket.id },
    });
    return {
      status: 'USED',
      attendeeName: ticket.user.displayName,
      ticketNumber: ticket.ticketNumber,
      message: `Already checked in at ${checkIn?.timestamp.toLocaleTimeString()}`,
    };
  }
  
  if (ticket.status === 'CANCELLED') {
    return {
      status: 'CANCELLED',
      attendeeName: ticket.user.displayName,
      ticketNumber: ticket.ticketNumber,
      message: 'This ticket has been cancelled',
    };
  }
  
  // 5. Verify blockchain (Phase 2)
  if (process.env.ENABLE_BLOCKCHAIN_VERIFICATION === 'true') {
    const blockchainValid = await verifyTicketBlockchain(ticket);
    if (!blockchainValid) {
      return { status: 'INVALID', message: 'Blockchain verification failed' };
    }
  }
  
  // 6. Process check-in (atomic)
  return await processValidCheckIn(ticket, scannerId);
}

async function processValidCheckIn(
  ticket: Ticket & { user: User },
  scannerId: string
): Promise<CheckInResult> {
  // Use transaction to prevent race conditions
  return await prisma.$transaction(async (tx) => {
    // Double-check status within transaction
    const currentTicket = await tx.ticket.findUnique({
      where: { id: ticket.id },
    });
    
    if (currentTicket!.status !== 'ACTIVE') {
      throw new Error('Ticket status changed');
    }
    
    // Create check-in record
    await tx.checkIn.create({
      data: {
        ticketId: ticket.id,
        eventId: ticket.eventId,
        scannerId,
        status: 'VALID',
        method: 'QR',
        metadata: { scannedAt: new Date().toISOString() },
      },
    });
    
    // Mark ticket as used
    await tx.ticket.update({
      where: { id: ticket.id },
      data: { status: 'USED' },
    });
    
    // Log audit
    await tx.auditLog.create({
      data: {
        action: 'checkin.valid',
        entityType: 'ticket',
        entityId: ticket.id,
        actorId: scannerId,
        metadata: { eventId: ticket.eventId, ticketNumber: ticket.ticketNumber },
      },
    });
    
    return {
      status: 'VALID',
      attendeeName: ticket.user.displayName,
      ticketNumber: ticket.ticketNumber,
      message: 'Check-in successful',
    };
  });
}
```

---

## 3. Offline Scanning Mode

### Strategy

| Scenario | Mode | Mechanism |
|----------|------|-----------|
| Online | Real-time | Server verification via API |
| Intermittent | Optimistic | Cache last-known state, verify when online |
| Offline (planned) | Local only | Pre-downloaded event data, local signature verification |

### Local Verification (Offline)

```typescript
// For offline scanning, the device pre-downloads event + ticket data
interface OfflineTicketData {
  ticketId: string;
  ticketNumber: string;
  eventId: string;
  attendeeName: string;
  signature: string;
  status: 'ACTIVE' | 'USED' | 'CANCELLED';
}

// Local verification uses cached data + HMAC
function verifyLocally(
  scanned: QRData,
  cachedTickets: Map<string, OfflineTicketData>
): CheckInResult {
  const cached = cachedTickets.get(scanned.ticketId);
  
  if (!cached) return { status: 'INVALID', message: 'Ticket not found in cache' };
  if (cached.status !== 'ACTIVE') return { status: cached.status, message: `${cached.status} ticket` };
  
  // Verify signature locally
  const expectedSig = generateLocalSignature(cached);
  if (scanned.sig !== expectedSig) return { status: 'INVALID', message: 'Signature mismatch' };
  
  return { status: 'VALID', attendeeName: cached.attendeeName, ticketNumber: cached.ticketNumber, message: 'OK' };
}
```

---

## 4. Scanner UI States

### Scanning Active

```
┌──────────────────────────┐
│                          │
│    ┌────────────────┐    │
│    │                │    │
│    │   [CAMERA]     │    │
│    │   (scanning)   │    │
│    │                │    │
│    │   ┌──── QR ──┐ │    │
│    │   │  Frame   │ │    │
│    │   └──────────┘ │    │
│    └────────────────┘    │
│                          │
│    [Manual Entry]        │
│                          │
│    Recent: 3 scanned     │
└──────────────────────────┘
```

### Scan Result: Valid

```
┌──────────────────────────┐
│                          │
│                          │
│        ✅ VALID          │
│                          │
│    Alex Rivera           │
│    JAM-2026-0042         │
│    Drums                 │
│                          │
│    ● ● ● (auto-dismiss) │
│                          │
│    [Scan Next →]         │
│                          │
│    Background: Green     │
│    Sound: Success beep   │
└──────────────────────────┘
```

### Scan Result: Invalid

```
┌──────────────────────────┐
│                          │
│      ❌ INVALID          │
│                          │
│    Ticket not found      │
│                          │
│    Try scanning again    │
│    or use manual entry   │
│                          │
│    [Try Again]           │
│    [Manual Entry]        │
│                          │
│    Background: Red       │
│    Sound: Error buzz     │
└──────────────────────────┘
```

### Scan Result: Already Used

```
┌──────────────────────────┐
│                          │
│      ⚠️ ALREADY USED     │
│                          │
│    Alex Rivera           │
│    Checked in at 7:32 PM │
│                          │
│    [Dismiss]             │
│                          │
│    Background: Amber     │
│    Sound: Warning tone   │
└──────────────────────────┘
```

---

## 5. Manual Code Entry

Fallback for attendees with:
- Broken/damaged screens
- Dead batteries
- Printed tickets with unreadable QR

```tsx
interface ManualEntryProps {
  eventId: string;
  onSubmit: (ticketNumber: string) => void;
}

function ManualEntry({ eventId, onSubmit }: ManualEntryProps) {
  const [code, setCode] = useState('');
  
  return (
    <div>
      <h3>Manual Ticket Entry</h3>
      <p>Enter the ticket number shown on the attendee's ticket</p>
      <Input
        value={code}
        onChange={setCode}
        placeholder="e.g., JAM-2026-0042"
        maxLength={16}
        pattern="[A-Z]{3}-\d{4}-\d{5}"
      />
      <Button onClick={() => onSubmit(code)}>Verify</Button>
    </div>
  );
}
```

---

## 6. Scanner Hardware Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Camera | 5MP | 12MP+ |
| Auto-focus | Yes | Yes |
| Flash/LED | Optional | Helpful in dark venues |
| Screen size | 4.7" | 6"+ |
| Orientation | Portrait | Portrait (locked) |
| Internet | 3G+ | 4G/WiFi |

---

## 7. QR Failure Rate Targets

| Metric | Target |
|--------|--------|
| First-scan success rate | > 95% |
| Scan-to-result time | < 1 second |
| False positive rate | < 0.01% |
| False negative rate | < 1% |
| Manual entry fallback rate | < 5% |
