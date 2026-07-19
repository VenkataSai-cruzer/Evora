# Database Design — Jamming Events Platform

## 1. Database Technology

**Primary Database:** PostgreSQL 15+
**ORM:** Prisma 5+
**Caching:** Redis (Upstash / Vercel KV)

---

## 2. Entity Relationship Diagram (Text)

```
┌─────────────────────┐       ┌───────────────────────────┐
│       User          │       │       Organization        │
├─────────────────────┤       ├───────────────────────────┤
│ id (PK, UUID)       │       │ id (PK, UUID)             │
│ email (unique)      │1──N→  │ name                      │
│ displayName         │       │ slug (unique)             │
│ passwordHash        │       │ ownerId (FK → User)       │
│ avatarUrl           │       │ createdAt                 │
│ bio                 │       └─────────────┬─────────────┘
│ instruments (json)  │                     │
│ skillLevel (enum)   │                     │ 1
│ role (enum)         │                     │
│ emailVerified       │                     │
│ authProvider        │                     │
│ createdAt           │                     │
│ updatedAt           │                     │
└──────────┬──────────┘                     │
           │                                │
           │ 1                              │
           │                                │
           │                                │
┌──────────┴──────────┐       ┌────────────┴─────────────┐
│       Ticket        │       │         Event            │
├─────────────────────┤       ├──────────────────────────┤
│ id (PK, UUID)       │       │ id (PK, UUID)            │
│ ticketNumber (uniq) │       │ title                     │
│ eventId (FK)        │N──1→  │ slug (unique)            │
│ userId (FK)         │       │ description (text)       │
│ type (FREE | PAID)  │       │ coverImageUrl            │
│ status (enum)       │       │ startDate                │
│ price (decimal?)    │       │ startTime                │
│ qrDataUrl           │       │ endDate?                 │
│ qrSecret            │       │ endTime?                 │
│ blockchainHash?     │       │ venueName                │
│ purchasedAt         │       │ venueAddress             │
│ cancelledAt?        │       │ venueLat?                │
│ refundedAt?         │       │ venuelng?                │
└─────────────────────┘       │ capacity (int)           │
                               │ ticketType (FREE|PAID)   │
                               │ price (decimal?)         │
                               │ instruments (json)       │
                               │ skillLevel (enum)        │
                               │ visibility (PUBLIC|PRIV) │
                               │ status (enum)            │
                               │ organizationId (FK)      │
                               │ organizerId (FK → User)  │ 1
                               │ createdAt                │
                               │ updatedAt                │
                               └──────────────────────────┘
                                        │
                                        │ 1
                                        │
                               ┌────────┴────────┐
                               │    CheckIn      │
                               ├─────────────────┤
                               │ id (PK, UUID)   │
                               │ ticketId (FK)   │N
                               │ eventId (FK)    │
                               │ scannerId (FK)  │
                               │ status (enum)   │
                               │ method (enum)   │
                               │ timestamp       │
                               │ metadata (json) │
                               └──────────────────┘

┌─────────────────────┐
│    AuditLog         │
├─────────────────────┤
│ id (PK, UUID)       │
│ action (string)     │
│ entityType (string)  │
│ entityId (string)   │
│ actorId (FK→User)   │
│ metadata (json)     │
│ ipAddress           │
│ userAgent           │
│ timestamp           │
└─────────────────────┘

┌─────────────────────┐
│   WaitlistEntry     │
├─────────────────────┤
│ id (PK, UUID)       │
│ eventId (FK)        │
│ userId (FK)         │
│ position (int)      │
│ status (WAITING     │
│        | PROMOTED   │
│        | EXPIRED)   │
│ joinedAt            │
│ promotedAt?         │
└─────────────────────┘

┌─────────────────────┐
│  Notification       │
├─────────────────────┤
│ id (PK, UUID)       │
│ userId (FK)         │
│ type (enum)         │
│ title               │
│ message (text)      │
│ read (boolean)      │
│ link (url?)         │
│ createdAt           │
└─────────────────────┘

┌─────────────────────┐
│   BlockchainRecord  │ (Phase 2)
├─────────────────────┤
│ id (PK, UUID)       │
│ ticketId (FK)       │
│ txHash (unique)     │
│ blockNumber         │
│ timestamp           │
│ status (PENDING     │
│        | CONFIRMED  │
│        | FAILED)    │
└─────────────────────┘
```

---

## 3. Prisma Schema Definition

### Enums

```prisma
enum TicketType {
  FREE
  PAID
}

enum TicketStatus {
  ACTIVE
  USED
  CANCELLED
  REFUNDED
}

enum EventStatus {
  DRAFT
  ACTIVE
  CANCELLED
  COMPLETED
}

enum UserRole {
  USER
  ORGANIZER
  CO_ORGANIZER
  ADMIN
}

enum Visibility {
  PUBLIC
  PRIVATE
}

enum SkillLevel {
  BEGINNER
  INTERMEDIATE
  ADVANCED
  ALL
}

enum CheckInMethod {
  QR
  MANUAL
  BLOCKCHAIN
}

enum CheckInStatus {
  VALID
  USED
  INVALID
  CANCELLED
}

enum NotificationType {
  TICKET_CONFIRMATION
  EVENT_REMINDER
  EVENT_CANCELLED
  WAITLIST_PROMOTED
  CHECK_IN_SUCCESS
}

enum WaitlistStatus {
  WAITING
  PROMOTED
  EXPIRED
}
```

### Models

```prisma
model User {
  id             String    @id @default(uuid()) @db.Uuid
  email          String    @unique
  displayName    String
  passwordHash   String?
  avatarUrl      String?
  bio            String?
  instruments    Json?     @default("[]")
  skillLevel     SkillLevel?
  role           UserRole  @default(USER)
  emailVerified  Boolean   @default(false)
  authProvider   String    @default("email") // "email" | "google"
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  tickets        Ticket[]
  events         Event[]        @relation("OrganizedEvents")
  checkIns       CheckIn[]
  auditLogs      AuditLog[]
  notifications  Notification[]
  waitlistEntries  WaitlistEntry[]
  eventOrganizers  EventOrganizer[]
  guestTickets     GuestTicket[]
  organization     Organization?

  @@index([email])
  @@index([role])
}

model Organization {
  id        String   @id @default(uuid()) @db.Uuid
  name      String
  slug      String   @unique
  ownerId   String   @db.Uuid
  createdAt DateTime @default(now())

  owner  User    @relation(fields: [ownerId], references: [id])
  events Event[]

  @@index([slug])
}

model Event {
  id            String      @id @default(uuid()) @db.Uuid
  title         String
  slug          String      @unique
  description   String      @db.Text
  coverImageUrl String?
  startDate     DateTime    @db.Date
  startTime     String      // "HH:mm"
  endDate       DateTime?   @db.Date
  endTime       String?
  venueName     String
  venueAddress  String
  venueLat      Float?
  venueLng      Float?
  capacity      Int
  ticketType    TicketType  @default(FREE)
  price         Decimal?    @db.Decimal(10, 2)
  instruments   Json?       @default("[]")
  skillLevel    SkillLevel  @default(ALL)
  visibility    Visibility  @default(PUBLIC)
  status        EventStatus @default(DRAFT)
  organizationId String?    @db.Uuid
  organizerId   String      @db.Uuid
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  tickets       Ticket[]
  checkIns      CheckIn[]
  waitlist          WaitlistEntry[]
  organization      Organization? @relation(fields: [organizationId], references: [id])
  organizer         User          @relation("OrganizedEvents", fields: [organizerId], references: [id])
  eventOrganizers   EventOrganizer[]
  guestTickets      GuestTicket[]

  @@index([slug])
  @@index([startDate])
  @@index([status])
  @@index([organizerId])
  @@index([organizationId])
}

model Ticket {
  id              String       @id @default(uuid()) @db.Uuid
  ticketNumber    String       @unique // e.g., "JAM-2026-00042"
  eventId         String       @db.Uuid
  userId          String       @db.Uuid
  type            TicketType   @default(FREE)
  status          TicketStatus @default(ACTIVE)
  price           Decimal?     @db.Decimal(10, 2)
  qrDataUrl       String
  qrSecret        String
  blockchainHash  String?      // Phase 2
  purchasedAt     DateTime     @default(now())
  cancelledAt     DateTime?
  refundedAt      DateTime?

  event           Event            @relation(fields: [eventId], references: [id])
  user            User             @relation(fields: [userId], references: [id])
  checkIn         CheckIn?
  blockchainRecord BlockchainRecord? // Phase 2

  @@index([ticketNumber])
  @@index([eventId])
  @@index([userId])
  @@index([status])
  @@index([eventId, userId])
}

model CheckIn {
  id         String         @id @default(uuid()) @db.Uuid
  ticketId   String         @unique @db.Uuid
  eventId    String         @db.Uuid
  scannerId  String         @db.Uuid
  status     CheckInStatus
  method     CheckInMethod  @default(QR)
  timestamp  DateTime       @default(now())
  metadata   Json?          @default("{}")

  ticket  Ticket @relation(fields: [ticketId], references: [id])
  event   Event  @relation(fields: [eventId], references: [id])
  scanner User   @relation(fields: [scannerId], references: [id])

  @@index([eventId])
  @@index([ticketId])
  @@index([scannerId])
}

model WaitlistEntry {
  id         String         @id @default(uuid()) @db.Uuid
  eventId    String         @db.Uuid
  userId     String         @db.Uuid
  position   Int
  status     WaitlistStatus @default(WAITING)
  joinedAt   DateTime       @default(now())
  promotedAt DateTime?

  event Event @relation(fields: [eventId], references: [id])
  user  User  @relation(fields: [userId], references: [id])

  @@unique([eventId, userId])
  @@index([eventId, position])
}

model Notification {
  id        String           @id @default(uuid()) @db.Uuid
  userId    String           @db.Uuid
  type      NotificationType
  title     String
  message   String           @db.Text
  read      Boolean          @default(false)
  link      String?
  createdAt DateTime         @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([userId, read])
  @@index([userId, createdAt])
}

model AuditLog {
  id          String   @id @default(uuid()) @db.Uuid
  action      String   // "ticket.created", "checkin.valid", "event.cancelled"
  entityType  String   // "ticket", "event", "user"
  entityId    String
  actorId     String?  @db.Uuid
  metadata    Json?    @default("{}")
  ipAddress   String?
  userAgent   String?
  timestamp   DateTime @default(now())

  actor User? @relation(fields: [actorId], references: [id])

  @@index([entityType, entityId])
  @@index([action])
  @@index([timestamp])
}

model BlockchainRecord { // Phase 2
  id          String   @id @default(uuid()) @db.Uuid
  ticketId    String   @unique @db.Uuid
  txHash      String   @unique
  blockNumber Int
  timestamp   DateTime
  status      String   @default("PENDING") // PENDING | PROCESSING | CONFIRMED | FAILED

  ticket Ticket @relation(fields: [ticketId], references: [id])

  @@index([txHash])
  @@index([ticketId])
}

model GuestTicket { // Phase 2 — Guest RSVPs without full account
  id            String      @id @default(uuid()) @db.Uuid
  eventId       String      @db.Uuid
  email         String
  guestName     String
  ticketNumber  String      @unique
  qrDataUrl     String
  qrSecret      String
  status        TicketStatus @default(ACTIVE)
  expiresAt     DateTime    // 7 days after event
  createdAt     DateTime    @default(now())

  event         Event       @relation(fields: [eventId], references: [id])
  checkIn       CheckIn?

  @@index([eventId])
  @@index([email])
  @@index([ticketNumber])
}

model EventOrganizer {
  id        String   @id @default(uuid()) @db.Uuid
  eventId   String   @db.Uuid
  userId    String   @db.Uuid
  role      String   @default("CO_ORGANIZER") // CO_ORGANIZER | SCANNER
  createdAt DateTime @default(now())

  event Event @relation(fields: [eventId], references: [id])
  user  User  @relation(fields: [userId], references: [id])

  @@unique([eventId, userId])
  @@index([eventId])
  @@index([userId])
}
```

---

## 4. Indexing Strategy

| Table | Index | Type | Purpose |
|-------|-------|------|---------|
| User | `email` | Unique | Auth lookups |
| User | `role` | B-tree | Admin queries |
| Event | `slug` | Unique | URL lookups |
| Event | `startDate` | B-tree | Browse by date |
| Event | `status` | B-tree | Filter active events |
| Event | `organizerId` | B-tree | Organizer dashboard |
| Ticket | `ticketNumber` | Unique | QR decode lookup |
| Ticket | `eventId` | B-tree | Event attendee list |
| Ticket | `userId` | B-tree | User's tickets |
| Ticket | `status` | B-tree | Status filtering |
| CheckIn | `eventId` | B-tree | Event check-in stats |
| CheckIn | `ticketId` | Unique | One check-in per ticket |

---

## 5. Data Retention & Cleanup

| Data | Retention | Cleanup |
|------|-----------|---------|
| Active tickets | Until 90 days after event | Archive then soft-delete |
| Cancelled tickets | 90 days | Hard delete after 90 days |
| Audit logs | 1 year | Archive to cold storage |
| Notification history | 90 days | Hard delete |
| User accounts | Until deletion request | 30 days after request |
| Blockchain records | Permanent | No deletion |
| Event data | 1 year after completion | Archive |
| Session data (Redis) | 7 days | TTL-based expiry |

---

## 6. Migration Strategy

```bash
# Development
npx prisma migrate dev --name init
npx prisma migrate dev --name add_waitlist

# Production
npx prisma migrate deploy
npx prisma db seed

# Reset (dev only)
npx prisma migrate reset
```

---

## 7. Seed Data

The seed script creates:
- 1 admin user
- 2 organizer users
- 5 regular users
- 2 organizations
- 5-10 events (mix of past, active, future)
- 50+ tickets with varied statuses
- Sample check-in records
- Sample notifications

```bash
npx prisma db seed
# Configured in package.json: "prisma": { "seed": "tsx prisma/seed.ts" }
```
