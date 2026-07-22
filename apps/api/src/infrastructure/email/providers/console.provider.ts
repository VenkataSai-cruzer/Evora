import { EmailProvider, SendEmailInput, SendEmailResult } from './interfaces.js';

/**
 * Console email provider.
 * Logs all emails to the console instead of sending them.
 * Use this for development, staging, and testing.
 */
export class ConsoleProvider implements EmailProvider {
  readonly name = 'console';

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const to = Array.isArray(input.to) ? input.to.join(', ') : input.to;

    console.log('[Email ConsoleProvider]');
    console.log(`  To:      ${to}`);
    console.log(`  Subject: ${input.subject}`);
    console.log(`  Text:    ${input.text?.slice(0, 200)}...`);
    if (input.attachments && input.attachments.length > 0) {
      console.log(`  Attachments: ${input.attachments.length} file(s)`);
      for (const att of input.attachments) {
        console.log(`    - ${att.filename} (${att.content.length} bytes)`);
      }
    }
    if (input.idempotencyKey) {
      console.log(`  Idempotency Key: ${input.idempotencyKey}`);
    }

    return { providerMessageId: `console-${Date.now()}` };
  }
}
