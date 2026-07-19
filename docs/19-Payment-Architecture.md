# Payment Architecture — Jamming Events Platform

## 1. Payment Provider

**Provider:** Stripe
**Phase:** 2 (Post-MVP)
**Integration:** Stripe Payment Intents API

---

## 2. Why Stripe?

| Requirement | Stripe |
|-------------|--------|
| Global payment methods | ✅ 135+ currencies |
| Subscription support | ✅ (future recurring events) |
| Strong authentication (SCA) | ✅ |
| Webhook reliability | ✅ |
| Payouts to organizers | ✅ Stripe Connect (Phase 3) |
| No monthly fee | ✅ Pay-as-you-go |
| Developer experience | ✅ Excellent API + SDK |

---

## 3. Payment Flow

```
[User clicks "Purchase" on paid event]
    ↓
[Frontend: POST /api/payments/create-intent]
    ↓
[Server: Creates Stripe PaymentIntent]
    ✓ Amount (ticket price)
    ✓ Currency (USD)
    ✓ Metadata (eventId, userId, ticketType)
    ✓ Idempotency key (prevent double charge)
    ↓
[Server: Returns clientSecret to frontend]
    ↓
[Frontend: Stripe Elements renders Payment Form]
    ↓
[User enters card details]
    ↓
[Stripe.js: Confirms PaymentIntent]
    ↓
[Stripe processes payment]
    ├── ✅ Success → Webhook: payment_intent.succeeded
    │   → Server creates ticket
    │   → Server generates QR
    │   → Server sends confirmation
    │   → Frontend redirects to ticket page
    │
    ├── ❌ Failure → Webhook: payment_intent.payment_failed
    │   → Server logs failure
    │   → Frontend shows error
    │   → User can retry
    │
    └── ❌ 3D Secure required
        → Stripe handles authentication
        → Continues to success/failure
```

---

## 4. Stripe Integration

### Server-Side

```typescript
// /src/lib/services/payment.service.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
});

interface CreatePaymentIntentParams {
  amount: number; // in cents
  eventId: string;
  userId: string;
  ticketType: string;
}

export async function createPaymentIntent(params: CreatePaymentIntentParams) {
  const { amount, eventId, userId, ticketType } = params;
  
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: 'usd',
    metadata: {
      eventId,
      userId,
      ticketType,
    },
    automatic_payment_methods: {
      enabled: true,
    },
  });
  
  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  };
}
```

### Webhook Handler

```typescript
// /src/app/api/payments/webhook/route.ts
import { NextRequest } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;
  
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }
  
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      await handleSuccessfulPayment(paymentIntent);
      break;
    }
    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object;
      await handleFailedPayment(paymentIntent);
      break;
    }
    case 'charge.refunded': {
      const charge = event.data.object;
      await handleRefund(charge);
      break;
    }
  }
  
  return Response.json({ received: true });
}
```

---

## 5. Pricing Structure

### Platform Fees

| Item | Amount |
|------|--------|
| Free events | No fee |
| Paid events | 5% platform fee + Stripe fees |
| Stripe processing | 2.9% + $0.30 per transaction |

### Example: $10 Ticket

```
Ticket Price:      $10.00
Stripe Fee:        -$0.59  (2.9% + $0.30)
Platform Fee:      -$0.50  (5%)
Organizer Payout:  $8.91
```

### Payout Schedule

- Payouts are available immediately after the event
- Organizer receives payout via Stripe Connect (Phase 3)
- For MVP: payments go to platform, organizers receive via manual transfer

---

## 6. Security Measures

| Measure | Implementation |
|---------|---------------|
| PCI Compliance | Stripe handles PCI (Level 1) |
| Card data | Never touches our servers |
| Idempotency | Idempotency key prevents double charges |
| 3D Secure | Enabled for fraud protection |
| Webhook verification | Stripe signature validation |
| Rate limiting | 10 payment attempts per user per hour |
| Fraud detection | Stripe Radar enabled |

---

## 7. Refund Policy

| Scenario | Refund Policy |
|----------|--------------|
| Attendee cancels (24h+ before) | Full refund minus fees |
| Attendee cancels (<24h) | No refund (spot released) |
| Event cancelled by organizer | Full refund including fees |
| Duplicate charge | Immediate full refund |

---

## 8. Database Schema

```prisma
enum PaymentStatus {
  PENDING
  SUCCEEDED
  FAILED
  REFUNDED
}

model Payment {
  id                String        @id @default(uuid()) @db.Uuid
  stripePaymentId   String        @unique
  stripeChargeId    String?
  ticketId          String        @unique @db.Uuid
  userId            String        @db.Uuid
  eventId           String        @db.Uuid
  amount            Decimal       @db.Decimal(10, 2) // in dollars
  currency          String        @default("usd")
  status            PaymentStatus @default(PENDING)
  paymentMethod     String?
  idempotencyKey    String?
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  ticket Ticket @relation(fields: [ticketId], references: [id])

  @@index([stripePaymentId])
  @@index([userId])
  @@index([eventId])
}
```

---

## 9. Webhook Idempotency

Stripe webhooks can deliver the same event multiple times (at-least-once delivery).

The webhook handler **must be idempotent**:

```typescript
// Idempotency check in webhook handler
async function handleSuccessfulPayment(paymentIntent: Stripe.PaymentIntent) {
  // Check if we already processed this payment intent
  const existingPayment = await prisma.payment.findUnique({
    where: { stripePaymentId: paymentIntent.id },
  });
  
  if (existingPayment && existingPayment.status === 'SUCCEEDED') {
    // Already processed, skip (idempotent)
    return;
  }
  
  // Process the successful payment
  await prisma.$transaction(async (tx) => {
    // ... create ticket, mark payment as succeeded
  });
}
```

**Key principles:**
- Use `stripePaymentId` as unique index for deduplication
- Use database transactions to prevent partial state
- Store webhook `idempotencyKey` from Stripe request header
- Never assume single delivery

---

## 10. Testing

### Stripe Test Cards

| Card Number | Scenario |
|------------|----------|
| `4242424242424242` | Success |
| `4000000000003220` | 3D Secure required |
| `4000000000000002` | Decline |
| `4000000000009995` | Insufficient funds |

### Test Commands

```bash
# Test webhook locally
stripe listen --forward-to localhost:3000/api/payments/webhook

# Trigger test event
stripe trigger payment_intent.succeeded
```
