/**
 * Ticket template configuration.
 * Coordinates are relative ratios of the base template (1023x1537 Ticket.png).
 * Adjust xRatio, yRatio, sizeRatio to match the blank spaces in the actual image.
 *
 * Base image: 1023px wide, 1537px tall
 */
export const ticketTemplateConfig = {
  templatePath: 'assets/Ticket.png',

  fields: {
    eventTitle: {
      xRatio: 0.08,   // ~82px from left
      yRatio: 0.18,   // ~277px from top
      maxWidthRatio: 0.55,
      fontSizePt: 32,
      maxLines: 2,
    },
    attendeeName: {
      xRatio: 0.08,
      yRatio: 0.43,
      maxWidthRatio: 0.5,
      fontSizePt: 24,
      maxLines: 1,
    },
    ticketType: {
      xRatio: 0.08,
      yRatio: 0.53,
      maxWidthRatio: 0.4,
      fontSizePt: 18,
      maxLines: 1,
    },
    eventDate: {
      xRatio: 0.08,
      yRatio: 0.63,
      maxWidthRatio: 0.4,
      fontSizePt: 16,
      maxLines: 1,
    },
    venue: {
      xRatio: 0.08,
      yRatio: 0.73,
      maxWidthRatio: 0.5,
      fontSizePt: 16,
      maxLines: 2,
    },
    ticketNumber: {
      xRatio: 0.08,
      yRatio: 0.84,
      maxWidthRatio: 0.45,
      fontSizePt: 14,
      maxLines: 1,
    },
    qrCode: {
      xRatio: 0.73,
      yRatio: 0.53,
      sizeRatio: 0.18,
    },
  },
} as const;

export type TicketFieldName = keyof typeof ticketTemplateConfig.fields;
