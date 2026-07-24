import { prisma } from '../database/prisma.js';
import type { TicketRenderData } from './ticket.renderer.js';

/**
 * Normalized ticket payload returned by getTicketRenderPayload().
 * This is the SINGLE source of truth for all ticket rendering,
 * preview, PDF, admin view, attendee view, and CSV export.
 *
 * Every consumer MUST use this shape — not independent Prisma mappings.
 *
 * Attendee data source priority (per-ticket):
 *   OrderAttendee.name  →  Ticket.attendeeName (copy fallback)
 *   OrderAttendee.email →  Ticket.attendeeEmail (copy fallback)
 *   OrderAttendee.phone →  Ticket.attendeePhone (copy fallback)
 *
 * Email and phone are stored in the payload for Admin/CSV export
 * but NOT included in the public-facing SVG ticket design.
 */
export interface TicketRenderPayload {
  ticketNumber: string;
  status: string;
  attendeeName: string;
  attendeeEmail: string;   // Admin/CSV only — NOT printed on public ticket
  attendeePhone: string;   // Admin/CSV only — NOT printed on public ticket
  eventName: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  ticketType: string;
  orderNumber: string | null;
  issuanceSource: string;
  issuedAt: Date;
  checkedInAt: Date | null;
  qrPayload: string | null;
}

/**
 * Derive the QR payload for the ticket renderer.
 * Uses the existing persisted qrToken — NEVER generates a new one.
 */
function getQrPayload(ticket: {
  qrToken: string | null;
}): string | null {
  return ticket.qrToken;
}

/**
 * Format a Date to a human-readable date string (e.g. "24 July 2026").
 */
function formatDate(d: Date): string {
  return d.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Format a Date to a time string (e.g. "8:00 PM").
 */
function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  });
}

/**
 * SINGLE authoritative function for all ticket rendering data.
 *
 * Loads the existing Ticket record with its real relations —
 * NEVER creates a new Ticket or QR identity.
 *
 * Attendee data comes from OrderAttendee (ticket.attendee) when available,
 * falling back to the Ticket-level copies for backward compatibility.
 *
 * @param ticketNumber - The existing ticket's number
 * @returns Normalized ticket render payload
 * @throws If ticket not found
 */
export async function getTicketRenderPayload(
  ticketNumber: string,
): Promise<TicketRenderPayload> {
  const ticket = await prisma.ticket.findUnique({
    where: { ticketNumber },
    include: {
      event: {
        select: {
          title: true,
          startAt: true,
          venueName: true,
          venueAddress: true,
        },
      },
      ticketType: {
        select: { name: true },
      },
      order: {
        select: {
          orderNumber: true,
          paymentMethod: true,
        },
      },
      attendee: {
        select: {
          attendeeName: true,
          attendeeEmail: true,
          attendeePhone: true,
        },
      },
    },
  });

  if (!ticket) {
    throw new Error(`Ticket not found: ${ticketNumber}`);
  }

  const event = ticket.event;
  const dateStr = formatDate(event.startAt);
  const timeStr = formatTime(event.startAt);

  // Build venue string
  const venue = event.venueAddress
    ? `${event.venueName}, ${event.venueAddress}`
    : event.venueName;

  // Determine issuance source
  let issuanceSource = ticket.source || 'PAYMENT_APPROVAL';
  if (ticket.ticketCategory === 'COMPLIMENTARY') {
    issuanceSource = 'COMPLIMENTARY';
  } else if (ticket.order?.paymentMethod === 'COMPLIMENTARY') {
    issuanceSource = 'COMPLIMENTARY';
  }

  // Attendee data: prefer OrderAttendee, fall back to Ticket-level copy
  const attendee = ticket.attendee;
  const displayName = attendee?.attendeeName || ticket.attendeeName || 'Attendee';
  const displayEmail = attendee?.attendeeEmail || ticket.attendeeEmail;
  const displayPhone = attendee?.attendeePhone || ticket.attendeePhone;

  return {
    ticketNumber: ticket.ticketNumber,
    status: ticket.status,
    attendeeName: displayName,
    attendeeEmail: displayEmail,
    attendeePhone: displayPhone,
    eventName: event.title,
    eventDate: dateStr,
    eventTime: timeStr,
    venue,
    ticketType: ticket.ticketType?.name || 'General Admission',
    orderNumber: ticket.order?.orderNumber || null,
    issuanceSource,
    issuedAt: ticket.issuedAt || ticket.createdAt,
    checkedInAt: ticket.checkedInAt,
    qrPayload: getQrPayload(ticket),
  };
}

/**
 * Map a TicketRenderPayload to the TicketRenderData format expected by the SVG renderer.
 *
 * Email and phone are intentionally excluded from the public-facing ticket design.
 * They remain available in the TicketRenderPayload for admin/CSV use.
 */
export function payloadToRenderData(payload: TicketRenderPayload): TicketRenderData {
  return {
    eventTitle: payload.eventName,
    eventDate: payload.eventDate,
    eventTime: payload.eventTime,
    venue: payload.venue,
    attendeeName: payload.attendeeName,
    ticketType: payload.ticketType,
    ticketNumber: payload.ticketNumber,
    orderNumber: payload.orderNumber || '',
    qrPayload: payload.qrPayload || '',
  };
}
