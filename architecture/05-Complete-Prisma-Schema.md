# Architecture 05: Complete Prisma Schema

## Purpose
Final, production-ready Prisma schema that serves as the single source of truth for the database.

## Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============ ENUMS ============

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

enum PaymentStatus {
  PENDING
  SUCCEEDED
  FAILED
  REFUNDED
}

// ============ MODELS ============

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
  authProvider   String    @default("email")
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  tickets         Ticket[]
  events          Event[]        @relation("OrganizedEvents")
  checkIns        CheckIn[]
  auditLogs       AuditLog[]
  notifications   Notification[]
  waitlistEntries WaitlistEntry[]
  eventOrganizers EventOrganizer[]
  guestTickets    GuestTicket[]
  organization    Organization?

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
  id             String      @id @default(uuid()) @db.Uuid
  title          String
  slug           String      @unique
  description    String      @db.Text
  coverImageUrl  String?
  startDate      DateTime    @db.Date
  startTime      String
  endDate        DateTime?   @db.Date
  endTime        String?
  venueName      String
  venueAddress   String
  venueLat       Float?
  venueLng       Float?
  capacity       Int
  ticketType     TicketType  @default(FREE)
  price          Decimal?    @db.Decimal(10, 2)
  instruments    Json?       @default("[]")
  skillLevel     SkillLevel  @default(ALL)
  visibility     Visibility  @default(PUBLIC)
  status         EventStatus @default(DRAFT)
  organizationId String?     @db.Uuid
  organizerId    String      @db.Uuid
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  tickets          Ticket[]
  checkIns         CheckIn[]
  waitlist         WaitlistEntry[]
  organization     Organization?  @relation(fields: [organizationId], references: [id])
  organizer        User           @relation("OrganizedEvents", fields: [organizerId], references: [id])
  eventOrganizers  EventOrganizer[]
  guestTickets     GuestTicket[]

  @@index([slug])
  @@index([startDate])
  @@index([status])
  @@index([organizerId])
  @@index([organizationId])
}

model Ticket {
  id              String       @id @default(uuid()) @db.Uuid
  ticketNumber    String       @unique
  eventId         String       @db.Uuid
  userId          String       @db.Uuid
  type            TicketType   @default(FREE)
  status          TicketStatus @default(ACTIVE)
  price           Decimal?     @db.Decimal(10, 2)
  qrDataUrl       String
  qrSecret        String
  blockchainHash  String?
  purchasedAt     DateTime     @default(now())
  cancelledAt     DateTime?
  refundedAt      DateTime?

  event            Event             @relation(fields: [eventId], references: [id])
  user             User              @relation(fields: [userId], references: [id])
  checkIn          CheckIn?
  blockchainRecord BlockchainRecord?
  payment          Payment?

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
  action      String
  entityType  String
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

model Payment {
  id              String        @id @default(uuid()) @db.Uuid
  stripePaymentId String        @unique
  stripeChargeId  String?
  ticketId        String        @unique @db.Uuid
  userId          String        @db.Uuid
  eventId         String        @db.Uuid
  amount          Decimal       @db.Decimal(10, 2)
  currency        String        @default("usd")
  status          PaymentStatus @default(PENDING)
  paymentMethod   String?
  idempotencyKey  String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  ticket Ticket @relation(fields: [ticketId], references: [id])

  @@index([stripePaymentId])
  @@index([userId])
  @@index([eventId])
}

model BlockchainRecord {
  id          String   @id @default(uuid()) @db.Uuid
  ticketId    String   @unique @db.Uuid
  txHash      String   @unique
  blockNumber Int
  timestamp   DateTime
  status      String   @default("PENDING")

  ticket Ticket @relation(fields: [ticketId], references: [id])

  @@index([txHash])
  @@index([ticketId])
}

model GuestTicket {
  id           String       @id @default(uuid()) @db.Uuid
  eventId      String       @db.Uuid
  email        String
  guestName    String
  ticketNumber String       @unique
  qrDataUrl    String
  qrSecret     String
  status       TicketStatus @default(ACTIVE)
  expiresAt    DateTime
  createdAt    DateTime     @default(now())

  event   Event    @relation(fields: [eventId], references: [id])
  checkIn CheckIn?

  @@index([eventId])
  @@index([email])
  @@index([ticketNumber])
}

model EventOrganizer {
  id        String   @id @default(uuid()) @db.Uuid
  eventId   String   @db.Uuid
  userId    String   @db.Uuid
  role      String   @default("CO_ORGANIZER")
  createdAt DateTime @default(now())

  event Event @relation(fields: [eventId], references: [id])
  user  User  @relation(fields: [userId], references: [id])

  @@unique([eventId, userId])
  @@index([eventId])
  @@index([userId])
}
```

## Migration Commands

```bash
# Initial schema creation
npx prisma migrate dev --name init

# Development migration
npx prisma migrate dev --name add_waitlist

# Production deployment
npx prisma migrate deploy

# Generate Prisma client after schema changes
npx prisma generate

# Open Prisma Studio (GUI)
npx prisma studio
```
