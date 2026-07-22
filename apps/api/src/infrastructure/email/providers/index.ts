import { EmailProvider } from './interfaces.js';
import { ConsoleProvider } from './console.provider.js';
import { SmtpProvider } from './smtp.provider.js';
import { ResendEmailProvider } from './resend.provider.js';

let _provider: EmailProvider | null = null;

/**
 * Get the configured email provider.
 * Selected by EMAIL_PROVIDER env var.
 *
 *   EMAIL_PROVIDER=console → ConsoleProvider (default for dev/staging)
 *   EMAIL_PROVIDER=resend  → ResendEmailProvider (production)
 *   EMAIL_PROVIDER=smtp    → SmtpProvider (alternative production)
 *
 * Switching providers requires no code changes — only environment config.
 */
export function getEmailProvider(): EmailProvider {
  if (_provider) return _provider;

  const type = process.env.EMAIL_PROVIDER || 'console';

  switch (type) {
    case 'resend':
      _provider = new ResendEmailProvider();
      break;
    case 'smtp':
      _provider = new SmtpProvider();
      break;
    case 'console':
    default:
      _provider = new ConsoleProvider();
      break;
  }

  return _provider;
}

/**
 * Reset the cached provider (useful in tests).
 */
export function resetEmailProvider(): void {
  _provider = null;
}
