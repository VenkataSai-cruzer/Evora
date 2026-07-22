import nodemailer from 'nodemailer';
import { prisma } from '../database/prisma.js';

export type NotificationType =
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_APPROVED'
  | 'PAYMENT_REJECTED'
  | 'TICKET_ISSUED'
  | 'COMPLIMENTARY_ISSUED'
  | 'ANNOUNCEMENT';

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// Build a simple transporter — falls back to test config if Resend not configured
function buildTransporter() {
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    return nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: { user: 'resend', pass: apiKey },
    });
  }

  // Dev fallback: log to console
  return nodemailer.createTransport({
    streamTransport: true,
    newline: 'unix',
    buffer: true,
  });
}

const transporter = buildTransporter();
const FROM = process.env.EMAIL_FROM || '7 NOTES <tickets@7notes.in>';

/**
 * Send a single email and log the attempt.
 * Failures are recorded but never thrown — callers must not crash on email failure.
 */
export async function sendEmail(
  payload: EmailPayload,
  type: NotificationType,
  userId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const logRecord = await prisma.notificationLog.create({
    data: {
      userId: userId ?? null,
      channel: 'EMAIL',
      type,
      recipient: payload.to,
      subject: payload.subject,
      status: 'PENDING',
      metadata: JSON.stringify(metadata ?? {}),
    },
  });

  try {
    if (!process.env.RESEND_API_KEY) {
      // Dev mode — just log
      console.log(`[Email DEV] To: ${payload.to} | ${payload.subject}`);
      await prisma.notificationLog.update({
        where: { id: logRecord.id },
        data: { status: 'SENT', attempts: 1, lastAttempt: new Date() },
      });
      return;
    }

    await transporter.sendMail({
      from: FROM,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });

    await prisma.notificationLog.update({
      where: { id: logRecord.id },
      data: { status: 'SENT', attempts: 1, lastAttempt: new Date() },
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Email] Failed to send:', error);

    await prisma.notificationLog.update({
      where: { id: logRecord.id },
      data: {
        status: 'FAILED',
        attempts: { increment: 1 },
        lastAttempt: new Date(),
        error,
      },
    });
  }
}

// ── Email templates ────────────────────────────────────────────

export async function sendPaymentReceivedEmail(params: {
  to: string;
  attendeeName: string;
  orderNumber: string;
  eventTitle: string;
  amount: number;
  utrNumber: string;
  userId?: string;
}): Promise<void> {
  const amountFormatted = `₹${(params.amount / 100).toFixed(0)}`;
  await sendEmail(
    {
      to: params.to,
      subject: `Payment Received – ${params.eventTitle}`,
      text: `Dear ${params.attendeeName},\n\nWe have received your payment of ${amountFormatted} for Order ${params.orderNumber}.\n\nUTR: ${params.utrNumber}\n\nYour order is under verification. We'll notify you once it's approved.\n\n7 NOTES Team`,
      html: `<p>Dear <strong>${params.attendeeName}</strong>,</p>
<p>We have received your payment of <strong>${amountFormatted}</strong> for Order <strong>${params.orderNumber}</strong>.</p>
<p><strong>UTR:</strong> ${params.utrNumber}</p>
<p>Your order is under verification. We'll notify you once approved.</p>
<p>— 7 NOTES Team</p>`,
    },
    'PAYMENT_RECEIVED',
    params.userId,
    { orderNumber: params.orderNumber, utrNumber: params.utrNumber },
  );
}

export async function sendPaymentApprovedEmail(params: {
  to: string;
  attendeeName: string;
  orderNumber: string;
  eventTitle: string;
  eventDate: string;
  venueName: string;
  ticketCount: number;
  userId?: string;
}): Promise<void> {
  await sendEmail(
    {
      to: params.to,
      subject: `Payment Approved – Your Tickets for ${params.eventTitle} 🎵`,
      text: `Dear ${params.attendeeName},\n\nGreat news! Your payment for Order ${params.orderNumber} has been approved.\n\n${params.ticketCount} ticket(s) have been generated.\n\nEvent: ${params.eventTitle}\nDate: ${params.eventDate}\nVenue: ${params.venueName}\n\nLog in to view and download your tickets.\n\n7 NOTES Team`,
      html: `<p>Dear <strong>${params.attendeeName}</strong>,</p>
<p>Great news! Your payment for Order <strong>${params.orderNumber}</strong> has been <strong>approved</strong>.</p>
<p><strong>${params.ticketCount}</strong> ticket(s) have been generated.</p>
<table><tr><td><strong>Event:</strong></td><td>${params.eventTitle}</td></tr>
<tr><td><strong>Date:</strong></td><td>${params.eventDate}</td></tr>
<tr><td><strong>Venue:</strong></td><td>${params.venueName}</td></tr></table>
<p>Log in to view and download your tickets.</p>
<p>— 7 NOTES Team</p>`,
    },
    'PAYMENT_APPROVED',
    params.userId,
    { orderNumber: params.orderNumber },
  );
}

export async function sendPaymentRejectedEmail(params: {
  to: string;
  attendeeName: string;
  orderNumber: string;
  eventTitle: string;
  reason: string;
  userId?: string;
}): Promise<void> {
  await sendEmail(
    {
      to: params.to,
      subject: `Payment Verification Issue – Order ${params.orderNumber}`,
      text: `Dear ${params.attendeeName},\n\nUnfortunately your payment for Order ${params.orderNumber} could not be verified.\n\nReason: ${params.reason}\n\nYou may resubmit your payment proof by logging in.\n\n7 NOTES Team`,
      html: `<p>Dear <strong>${params.attendeeName}</strong>,</p>
<p>Unfortunately your payment for Order <strong>${params.orderNumber}</strong> could not be verified.</p>
<p><strong>Reason:</strong> ${params.reason}</p>
<p>You may <a href="${process.env.APP_URL || 'https://7notes.in'}/payment-status">resubmit your payment proof</a> by logging in.</p>
<p>— 7 NOTES Team</p>`,
    },
    'PAYMENT_REJECTED',
    params.userId,
    { orderNumber: params.orderNumber, reason: params.reason },
  );
}

export async function sendTicketIssuedEmail(params: {
  to: string;
  attendeeName: string;
  eventTitle: string;
  eventDate: string;
  venueName: string;
  ticketNumber: string;
  ticketCategory: string;
  userId?: string;
  isComplimentary?: boolean;
}): Promise<void> {
  const type: NotificationType = params.isComplimentary ? 'COMPLIMENTARY_ISSUED' : 'TICKET_ISSUED';
  const intro = params.isComplimentary
    ? 'You have been issued a complimentary ticket'
    : 'Your ticket is ready';

  await sendEmail(
    {
      to: params.to,
      subject: `Your Ticket – ${params.eventTitle} 🎟️`,
      text: `Dear ${params.attendeeName},\n\n${intro} for ${params.eventTitle}.\n\nTicket: ${params.ticketNumber}\nDate: ${params.eventDate}\nVenue: ${params.venueName}\n\nLog in to view and download your ticket.\n\n7 NOTES Team`,
      html: `<p>Dear <strong>${params.attendeeName}</strong>,</p>
<p>${intro} for <strong>${params.eventTitle}</strong>.</p>
<table><tr><td><strong>Ticket #:</strong></td><td>${params.ticketNumber}</td></tr>
<tr><td><strong>Category:</strong></td><td>${params.ticketCategory}</td></tr>
<tr><td><strong>Date:</strong></td><td>${params.eventDate}</td></tr>
<tr><td><strong>Venue:</strong></td><td>${params.venueName}</td></tr></table>
<p><a href="${process.env.APP_URL || 'https://7notes.in'}/tickets/${params.ticketNumber}">View your ticket</a></p>
<p>— 7 NOTES Team</p>`,
    },
    type,
    params.userId,
    { ticketNumber: params.ticketNumber },
  );
}

// ── Telegram admin notification ────────────────────────────────

export async function sendTelegramAdminAlert(message: string): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (!botToken || !chatId) return;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });
  } catch (err) {
    console.error('[Telegram] Failed to send admin alert:', err);
  }
}
