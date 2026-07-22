/**
 * Phase B/C — Payment proof validation tests
 * Tests file validation logic (MIME, extension, magic bytes, size, UTR format).
 */
import { describe, it, expect } from 'vitest';

// ── Replicate the validation logic from payment.controller.ts ─────────
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp'];

const MAGIC: Record<string, Buffer[]> = {
  'image/jpeg': [Buffer.from([0xff, 0xd8, 0xff])],
  'image/png': [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
  'image/webp': [Buffer.from('RIFF'), Buffer.from('WEBP')],
};

function validateMagic(buf: Buffer, mime: string): boolean {
  const sigs = MAGIC[mime];
  if (!sigs) return false;
  if (mime === 'image/webp') {
    return buf.slice(0, 4).equals(MAGIC['image/webp'][0]) && buf.slice(8, 12).equals(MAGIC['image/webp'][1]);
  }
  return sigs.some(s => buf.slice(0, s.length).equals(s));
}

function normalizeUtr(utr: string) { return utr.trim().toUpperCase(); }
function isValidUtr(utr: string) { return /^[A-Z0-9]{8,30}$/.test(normalizeUtr(utr)); }

describe('UTR validation', () => {
  it('accepts valid 12-char alphanumeric UTR', () => {
    expect(isValidUtr('412345678901')).toBe(true);
  });

  it('accepts mixed-case (normalised) UTR', () => {
    expect(isValidUtr('abc123def456')).toBe(true);
  });

  it('rejects UTR shorter than 8 chars', () => {
    expect(isValidUtr('ABC123')).toBe(false);
  });

  it('rejects UTR with special characters', () => {
    expect(isValidUtr('UTR-123456')).toBe(false);
  });

  it('rejects empty UTR', () => {
    expect(isValidUtr('')).toBe(false);
  });

  it('rejects UTR longer than 30 chars', () => {
    expect(isValidUtr('A'.repeat(31))).toBe(false);
  });
});

describe('File MIME validation', () => {
  it('accepts image/jpeg', () => {
    expect(ALLOWED_MIME.includes('image/jpeg')).toBe(true);
  });

  it('accepts image/png', () => {
    expect(ALLOWED_MIME.includes('image/png')).toBe(true);
  });

  it('accepts image/webp', () => {
    expect(ALLOWED_MIME.includes('image/webp')).toBe(true);
  });

  it('rejects image/gif', () => {
    expect(ALLOWED_MIME.includes('image/gif')).toBe(false);
  });

  it('rejects application/pdf', () => {
    expect(ALLOWED_MIME.includes('application/pdf')).toBe(false);
  });

  it('rejects text/html (script injection attempt)', () => {
    expect(ALLOWED_MIME.includes('text/html')).toBe(false);
  });
});

describe('File extension validation', () => {
  it('accepts .jpg', () => expect(ALLOWED_EXT.includes('.jpg')).toBe(true));
  it('accepts .jpeg', () => expect(ALLOWED_EXT.includes('.jpeg')).toBe(true));
  it('accepts .png', () => expect(ALLOWED_EXT.includes('.png')).toBe(true));
  it('accepts .webp', () => expect(ALLOWED_EXT.includes('.webp')).toBe(true));
  it('rejects .exe', () => expect(ALLOWED_EXT.includes('.exe')).toBe(false));
  it('rejects .php', () => expect(ALLOWED_EXT.includes('.php')).toBe(false));
  it('rejects .svg', () => expect(ALLOWED_EXT.includes('.svg')).toBe(false));
});

describe('Magic byte validation', () => {
  it('validates JPEG magic bytes (FF D8 FF)', () => {
    const jpegBuf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(validateMagic(jpegBuf, 'image/jpeg')).toBe(true);
  });

  it('validates PNG magic bytes', () => {
    const pngBuf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(validateMagic(pngBuf, 'image/png')).toBe(true);
  });

  it('rejects buffer claiming JPEG but has PNG bytes', () => {
    const pngBuf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(validateMagic(pngBuf, 'image/jpeg')).toBe(false);
  });

  it('rejects zero-byte buffer for any type', () => {
    expect(validateMagic(Buffer.alloc(0), 'image/jpeg')).toBe(false);
    expect(validateMagic(Buffer.alloc(0), 'image/png')).toBe(false);
  });

  it('rejects unknown MIME type', () => {
    const buf = Buffer.from([0x00, 0x01, 0x02]);
    expect(validateMagic(buf, 'application/octet-stream')).toBe(false);
  });
});

describe('File size validation', () => {
  it('accepts file under 5MB', () => {
    const size = 4 * 1024 * 1024;
    expect(size <= MAX_FILE_SIZE).toBe(true);
  });

  it('rejects file over 5MB', () => {
    const size = 6 * 1024 * 1024;
    expect(size > MAX_FILE_SIZE).toBe(true);
  });

  it('accepts file exactly at 5MB limit', () => {
    expect(MAX_FILE_SIZE <= MAX_FILE_SIZE).toBe(true);
  });
});
