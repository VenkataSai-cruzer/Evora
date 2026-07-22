/**
 * Phase D — QR token generation and hashing tests
 */
import { describe, it, expect } from 'vitest';
import { generateQrToken, hashQrToken } from '../infrastructure/rendering/qr.service.js';

describe('QR Token Security', () => {
  it('generates a token and its hash', () => {
    const { token, tokenHash } = generateQrToken();
    expect(token).toBeTruthy();
    expect(tokenHash).toBeTruthy();
    expect(token).not.toBe(tokenHash);
  });

  it('token is long enough (high entropy)', () => {
    const { token } = generateQrToken();
    // 32 bytes hex HMAC + 64 bytes hex random = 128 chars
    expect(token.length).toBeGreaterThanOrEqual(64);
  });

  it('tokenHash matches hashQrToken(token)', () => {
    const { token, tokenHash } = generateQrToken();
    const recomputed = hashQrToken(token);
    expect(recomputed).toBe(tokenHash);
  });

  it('two tokens are always unique', () => {
    const a = generateQrToken();
    const b = generateQrToken();
    expect(a.token).not.toBe(b.token);
    expect(a.tokenHash).not.toBe(b.tokenHash);
  });

  it('different tokens produce different hashes', () => {
    const hash1 = hashQrToken('token-abc');
    const hash2 = hashQrToken('token-xyz');
    expect(hash1).not.toBe(hash2);
  });

  it('same token always produces same hash', () => {
    const token = 'deterministic-token';
    expect(hashQrToken(token)).toBe(hashQrToken(token));
  });
});
