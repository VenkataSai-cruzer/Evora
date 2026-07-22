import nodemailer from 'nodemailer';
import { EmailProvider, SendEmailInput, SendEmailResult } from './interfaces.js';

/**
 * SMTP email provider.
 * Used for Resend, SendGrid SMTP, AWS SES SMTP, or any SMTP-compatible service.
 */
export class SmtpProvider implements EmailProvider {
  readonly name = 'smtp';
  private transporter: nodemailer.Transporter;
  private from: string;

  constructor() {
    this.from = process.env.EMAIL_FROM || '7 NOTES <tickets@7notes.in>';

    const host = process.env.SMTP_HOST || 'smtp.resend.com';
    const port = parseInt(process.env.SMTP_PORT || '465', 10);
    const secure = process.env.SMTP_SECURE !== 'false';
    const user = process.env.SMTP_USER || 'resend';
    const pass = process.env.SMTP_PASS || process.env.RESEND_API_KEY || '';

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const info = await this.transporter.sendMail({
      from: this.from,
      to: Array.isArray(input.to) ? input.to.join(', ') : input.to,
      replyTo: input.replyTo,
      subject: input.subject,
      html: input.html,
      text: input.text,
      attachments: input.attachments?.map((att) => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
      })),
    });

    return {
      providerMessageId: info.messageId,
    };
  }
}
