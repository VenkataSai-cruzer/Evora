import { Resend } from 'resend';
import { EmailProvider, SendEmailInput, SendEmailResult } from './interfaces.js';

/**
 * Resend email provider.
 * Used for production email delivery with PDF ticket attachments.
 *
 * Requires env:
 *   EMAIL_PROVIDER=resend
 *   RESEND_API_KEY=re_...
 *   EMAIL_FROM=Evora Tickets <tickets@updates.yourdomain.com>
 *   EMAIL_REPLY_TO=support@yourdomain.com
 */
export class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend';
  private readonly client: Resend;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is required for ResendEmailProvider');
    }
    this.client = new Resend(apiKey);
  }

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const from = process.env.EMAIL_FROM || 'Evora Tickets <tickets@7notes.in>';
    const replyTo = input.replyTo || process.env.EMAIL_REPLY_TO || undefined;

    // Build a plain payload object — deliberately avoid strict SDK types
    // to remain compatible across Resend SDK versions
    const resendPayload: Record<string, unknown> = {
      from,
      to: Array.isArray(input.to) ? input.to : [input.to],
      reply_to: replyTo,
      subject: input.subject,
      html: input.html,
      text: input.text,
    };

    if (input.attachments && input.attachments.length > 0) {
      resendPayload.attachments = input.attachments.map((att) => ({
        filename: att.filename,
        content: att.content,
      }));
    }

    const { data, error } = await this.client.emails.send(
      resendPayload as any,
      input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } as any : undefined,
    );

    if (error) {
      throw new Error(`Resend delivery failed: ${error.message}`);
    }

    if (!data?.id) {
      throw new Error('Resend returned no email ID');
    }

    return { providerMessageId: data.id };
  }
}
