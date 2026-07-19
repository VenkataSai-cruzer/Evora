# Architecture 04: Database ER Diagram

## Purpose
Visual representation of all database entities, their relationships, and key fields.

## Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o{ Organization : owns
    User ||--o{ Ticket : "purchases"
    User ||--o{ Event : "organizes"
    User ||--o{ CheckIn : "scans"
    User ||--o{ AuditLog : "generates"
    User ||--o{ Notification : "receives"
    User ||--o{ WaitlistEntry : "joins"
    User ||--o{ EventOrganizer : "assigned"
    User ||--o{ GuestTicket : "as guest"
    
    Organization ||--o{ Event : hosts
    
    Event ||--o{ Ticket : contains
    Event ||--o{ CheckIn : records
    Event ||--o{ WaitlistEntry : manages
    Event ||--o{ EventOrganizer : assigns
    Event ||--o{ GuestTicket : "guest tickets"
    
    Ticket ||--|| CheckIn : "has one"
    Ticket ||--o| BlockchainRecord : "has one (Phase 2)"
    Ticket ||--o| Payment : "has one (Phase 2)"
    
    User {
        uuid id PK
        string email UK
        string displayName
        string passwordHash "nullable (OAuth)"
        string avatarUrl
        text bio
        json instruments
        enum skillLevel
        enum role "USER | ORGANIZER | CO_ORGANIZER | ADMIN"
        boolean emailVerified
        string authProvider "email | google"
        datetime createdAt
        datetime updatedAt
    }
    
    Organization {
        uuid id PK
        string name
        string slug UK
        uuid ownerId FK
        datetime createdAt
    }
    
    Event {
        uuid id PK
        string title
        string slug UK
        text description
        string coverImageUrl
        date startDate
        string startTime
        date endDate "nullable"
        string endTime "nullable"
        string venueName
        string venueAddress
        float venueLat
        float venueLng
        int capacity
        enum ticketType "FREE | PAID"
        decimal price "nullable"
        json instruments
        enum skillLevel
        enum visibility "PUBLIC | PRIVATE"
        enum status "DRAFT | ACTIVE | CANCELLED | COMPLETED"
        uuid organizationId FK "nullable"
        uuid organizerId FK
        datetime createdAt
        datetime updatedAt
    }
    
    Ticket {
        uuid id PK
        string ticketNumber UK
        uuid eventId FK
        uuid userId FK
        enum type "FREE | PAID"
        enum status "ACTIVE | USED | CANCELLED | REFUNDED"
        decimal price "nullable"
        string qrDataUrl
        string qrSecret
        string blockchainHash "Phase 2"
        datetime purchasedAt
        datetime cancelledAt "nullable"
        datetime refundedAt "nullable"
    }
    
    CheckIn {
        uuid id PK
        uuid ticketId FK UK
        uuid eventId FK
        uuid scannerId FK
        enum status "VALID | USED | INVALID | CANCELLED"
        enum method "QR | MANUAL | BLOCKCHAIN"
        datetime timestamp
        json metadata
    }
    
    WaitlistEntry {
        uuid id PK
        uuid eventId FK
        uuid userId FK
        int position
        enum status "WAITING | PROMOTED | EXPIRED"
        datetime joinedAt
        datetime promotedAt "nullable"
    }
    
    Notification {
        uuid id PK
        uuid userId FK
        enum type
        string title
        text message
        boolean read
        string link "nullable"
        datetime createdAt
    }
    
    AuditLog {
        uuid id PK
        string action
        string entityType
        string entityId
        uuid actorId FK "nullable"
        json metadata
        string ipAddress
        string userAgent
        datetime timestamp
    }
    
    Payment {
        uuid id PK
        string stripePaymentId UK
        string stripeChargeId "nullable"
        uuid ticketId FK UK
        uuid userId FK
        uuid eventId FK
        decimal amount
        string currency
        enum status "PENDING | SUCCEEDED | FAILED | REFUNDED"
        string paymentMethod "nullable"
        string idempotencyKey "nullable"
        datetime createdAt
        datetime updatedAt
    }
    
    BlockchainRecord {
        uuid id PK
        uuid ticketId FK UK
        string txHash UK
        int blockNumber
        datetime timestamp
        string status "PENDING | PROCESSING | CONFIRMED | FAILED"
    }
    
    GuestTicket {
        uuid id PK
        uuid eventId FK
        string email
        string guestName
        string ticketNumber UK
        string qrDataUrl
        string qrSecret
        enum status
        datetime expiresAt
        datetime createdAt
    }
    
    EventOrganizer {
        uuid id PK
        uuid eventId FK
        uuid userId FK
        string role "CO_ORGANIZER | SCANNER"
        datetime createdAt
    }
```

## Key Relationships

| From | To | Type | Cardinality |
|------|----|------|-------------|
| User | Ticket | One-to-Many | One user can have many tickets |
| Event | Ticket | One-to-Many | One event can have many tickets |
| Ticket | CheckIn | One-to-One | Each ticket has at most one check-in |
| Event | CheckIn | One-to-Many | One event can have many check-ins |
| Event | User (organizer) | Many-to-One | An event has one organizer |
| Event | EventOrganizer | One-to-Many | An event can have many co-organizers |
| Ticket | BlockchainRecord | One-to-One | Each ticket has at most one blockchain record |
| Ticket | Payment | One-to-One | Each paid ticket has one payment record |

## Indexing Hotspots

| Query Pattern | Index Strategy |
|---------------|----------------|
| Browse upcoming events | `Event(startDate, status)` composite index |
| Organizer's events | `Event(organizerId, status)` composite index |
| User's tickets | `Ticket(userId, status)` composite index |
| Check-in lookup | `CheckIn(ticketId)` unique index |
| Waitlist ordering | `WaitlistEntry(eventId, position)` composite index |
| Notification queries | `Notification(userId, read, createdAt)` composite index |
