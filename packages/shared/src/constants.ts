// Shared constants for Prisma schema String values
// Use these constants instead of magic strings throughout the application.

export const USER_ROLE = {
  USER: 'USER',
  ORGANIZER: 'ORGANIZER',
  CO_ORGANIZER: 'CO_ORGANIZER',
  ADMIN: 'ADMIN',
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

export const EVENT_STATUS = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  SALES_OPEN: 'SALES_OPEN',
  SALES_PAUSED: 'SALES_PAUSED',
  SALES_CLOSED: 'SALES_CLOSED',
  SOLD_OUT: 'SOLD_OUT',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type EventStatus = (typeof EVENT_STATUS)[keyof typeof EVENT_STATUS];

export const TICKET_TYPE = {
  FREE: 'FREE',
  PAID: 'PAID',
} as const;

export type TicketType = (typeof TICKET_TYPE)[keyof typeof TICKET_TYPE];

export const TICKET_STATUS = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  CONFIRMED: 'CONFIRMED',
  CHECKED_IN: 'CHECKED_IN',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
} as const;

export type TicketStatus = (typeof TICKET_STATUS)[keyof typeof TICKET_STATUS];

export const VISIBILITY = {
  PUBLIC: 'PUBLIC',
  PRIVATE: 'PRIVATE',
} as const;

export type Visibility = (typeof VISIBILITY)[keyof typeof VISIBILITY];

export const MEDIA_VISIBILITY = {
  PUBLIC: 'PUBLIC',
  ATTENDEES_ONLY: 'ATTENDEES_ONLY',
  TICKET_HOLDERS_ONLY: 'TICKET_HOLDERS_ONLY',
  PRIVATE: 'PRIVATE',
} as const;

export type MediaVisibility = (typeof MEDIA_VISIBILITY)[keyof typeof MEDIA_VISIBILITY];

export const SKILL_LEVEL = {
  BEGINNER: 'BEGINNER',
  INTERMEDIATE: 'INTERMEDIATE',
  ADVANCED: 'ADVANCED',
  ALL: 'ALL',
} as const;

export type SkillLevel = (typeof SKILL_LEVEL)[keyof typeof SKILL_LEVEL];

export const CHECK_IN_METHOD = {
  QR: 'QR',
  MANUAL: 'MANUAL',
} as const;

export type CheckInMethod = (typeof CHECK_IN_METHOD)[keyof typeof CHECK_IN_METHOD];

export const CHECK_IN_STATUS = {
  SUCCESS: 'SUCCESS',
  DUPLICATE: 'DUPLICATE',
  INVALID: 'INVALID',
  CANCELLED: 'CANCELLED',
} as const;

export type CheckInStatus = (typeof CHECK_IN_STATUS)[keyof typeof CHECK_IN_STATUS];

export const WAITLIST_STATUS = {
  WAITING: 'WAITING',
  PROMOTED: 'PROMOTED',
  EXPIRED: 'EXPIRED',
} as const;

export type WaitlistStatus = (typeof WAITLIST_STATUS)[keyof typeof WAITLIST_STATUS];

export const EVENT_UPDATE_TYPE = {
  EVENT_STARTED: 'EVENT_STARTED',
  ENTRY_OPENED: 'ENTRY_OPENED',
  VENUE_CHANGE: 'VENUE_CHANGE',
  TIMING_CHANGE: 'TIMING_CHANGE',
  PERFORMANCE_NOW: 'PERFORMANCE_NOW',
  BREAK: 'BREAK',
  INSTRUCTION: 'INSTRUCTION',
  EVENT_COMPLETED: 'EVENT_COMPLETED',
  EMERGENCY: 'EMERGENCY',
  CANCELLATION: 'CANCELLATION',
} as const;

export type EventUpdateType = (typeof EVENT_UPDATE_TYPE)[keyof typeof EVENT_UPDATE_TYPE];

export const ANNOUNCEMENT_TYPE = {
  INFORMATION: 'INFORMATION',
  WARNING: 'WARNING',
  SCHEDULE_UPDATE: 'SCHEDULE_UPDATE',
  VENUE_UPDATE: 'VENUE_UPDATE',
  CANCELLATION: 'CANCELLATION',
  EMERGENCY: 'EMERGENCY',
  PROMOTIONAL: 'PROMOTIONAL',
} as const;

export type AnnouncementType = (typeof ANNOUNCEMENT_TYPE)[keyof typeof ANNOUNCEMENT_TYPE];

export const ANNOUNCEMENT_PRIORITY = {
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;

export type AnnouncementPriority = (typeof ANNOUNCEMENT_PRIORITY)[keyof typeof ANNOUNCEMENT_PRIORITY];

export const MEDIA_TYPE = {
  PHOTO: 'PHOTO',
  VIDEO: 'VIDEO',
  YOUTUBE: 'YOUTUBE',
  INSTAGRAM: 'INSTAGRAM',
  GOOGLE_DRIVE: 'GOOGLE_DRIVE',
  GOOGLE_PHOTOS: 'GOOGLE_PHOTOS',
} as const;

export type MediaType = (typeof MEDIA_TYPE)[keyof typeof MEDIA_TYPE];

export const LINK_TYPE = {
  GOOGLE_DRIVE: 'GOOGLE_DRIVE',
  GOOGLE_PHOTOS: 'GOOGLE_PHOTOS',
  YOUTUBE: 'YOUTUBE',
  INSTAGRAM: 'INSTAGRAM',
  OTHER: 'OTHER',
} as const;

export type LinkType = (typeof LINK_TYPE)[keyof typeof LINK_TYPE];

export const BOOKING_TYPE = {
  SOLO: 'SOLO',
  DUO: 'DUO',
  TRIO: 'TRIO',
  GROUP: 'GROUP',
} as const;

export type BookingType = (typeof BOOKING_TYPE)[keyof typeof BOOKING_TYPE];

export const BOOKING_MODE = {
  SOLO: 'SOLO',
  DUO: 'DUO',
  TRIO: 'TRIO',
  GROUP: 'GROUP',
  FLEXIBLE: 'FLEXIBLE',
} as const;

export type BookingMode = (typeof BOOKING_MODE)[keyof typeof BOOKING_MODE];

export const TICKET_POLICY_STATUS = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  SOLD_OUT: 'SOLD_OUT',
  CLOSED: 'CLOSED',
} as const;

export type TicketPolicyStatus = (typeof TICKET_POLICY_STATUS)[keyof typeof TICKET_POLICY_STATUS];

export const ORDER_STATUS = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  CONFIRMED: 'CONFIRMED',
  FAILED: 'FAILED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

// Payment-related constants — kept as placeholder for future payment integration
export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const PAYMENT_METHOD = {
  STRIPE: 'STRIPE',
  FREE: 'FREE',
  CASH: 'CASH',
  TRANSFER: 'TRANSFER',
  UTR: 'UTR',
} as const;

export type PaymentMethod = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];

export const PERFORMER_ROLE = {
  PERFORMER: 'PERFORMER',
  HOST: 'HOST',
  MC: 'MC',
  SPECIAL_GUEST: 'SPECIAL_GUEST',
} as const;

export type PerformerRole = (typeof PERFORMER_ROLE)[keyof typeof PERFORMER_ROLE];

export const APPRECIATION_TARGET = {
  ORGANIZER: 'ORGANIZER',
  PERFORMER: 'PERFORMER',
  GENERAL: 'GENERAL',
} as const;

export type AppreciationTarget = (typeof APPRECIATION_TARGET)[keyof typeof APPRECIATION_TARGET];

export const CONTACT_CATEGORY = {
  GENERAL: 'GENERAL',
  EVENT_SUPPORT: 'EVENT_SUPPORT',
  TICKET_SUPPORT: 'TICKET_SUPPORT',
  VENUE_QUESTION: 'VENUE_QUESTION',
  ORGANIZER_CONTACT: 'ORGANIZER_CONTACT',
} as const;

export type ContactCategory = (typeof CONTACT_CATEGORY)[keyof typeof CONTACT_CATEGORY];

export const MEDIA_ACCESS_ACTION = {
  ACCESS_GRANTED: 'ACCESS_GRANTED',
  ACCESS_DENIED: 'ACCESS_DENIED',
  LINK_REVEALED: 'LINK_REVEALED',
} as const;

export type MediaAccessAction = (typeof MEDIA_ACCESS_ACTION)[keyof typeof MEDIA_ACCESS_ACTION];

export const BADGE_TYPE = {
  FOUNDING_MEMBER: 'FOUNDING_MEMBER',
  ANNIVERSARY: 'ANNIVERSARY',
  VOLUNTEER: 'VOLUNTEER',
  PERFORMER: 'PERFORMER',
  ORGANIZER: 'ORGANIZER',
  COMMUNITY_CHAMPION: 'COMMUNITY_CHAMPION',
} as const;

export type BadgeType = (typeof BADGE_TYPE)[keyof typeof BADGE_TYPE];
