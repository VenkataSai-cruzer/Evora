import crypto from 'crypto';
import QRCode from 'qrcode';

const QR_SECRET = process.env.QR_SECRET || 'dev-qr-secret-change-in-production';

/**
 * Generate a cryptographically secure QR token.
 * Returns:
 *  - token: the opaque token to encode in the QR code
 *  - tokenHash: SHA-256 hash of the token, stored in the database for lookup
 */
export function generateQrToken(): { token: string; tokenHash: string } {
  // 32 bytes = 256 bits of entropy
  const rawBytes = crypto.randomBytes(32);
  // HMAC the bytes with our secret to bind them to this system
  const hmac = crypto.createHmac('sha256', QR_SECRET);
  hmac.update(rawBytes);
  const token = hmac.digest('hex') + rawBytes.toString('hex');

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  return { token, tokenHash };
}

/**
 * Hash a QR token received at scan time.
 * Used to look up the ticket in the database.
 */
export function hashQrToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a QR code image as a base64 PNG data URL.
 */
export async function generateQrCodeDataUrl(token: string): Promise<string> {
  return QRCode.toDataURL(token, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 300,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
}

/**
 * Generate a QR code as a Buffer (PNG).
 */
export async function generateQrCodeBuffer(token: string): Promise<Buffer> {
  return QRCode.toBuffer(token, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 300,
  });
}
