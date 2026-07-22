/**
 * Shared UTR (Universal Transaction Reference) utilities.
 *
 * Centralizes normalization and validation so all payment-related
 * endpoints produce consistent behavior.
 *
 * Normalization rules:
 *   1. Trim whitespace
 *   2. Convert to uppercase
 *
 * Validation rules:
 *   8–30 alphanumeric characters (A-Z, 0-9) after normalization.
 */

/**
 * Normalize a UTR string: trim whitespace and convert to uppercase.
 * This is the canonical normalization used in:
 *   - Payment proof submission
 *   - Duplicate UTR check
 *   - Approval validation
 *   - Future search/filter APIs
 */
export function normalizeUtr(utr: string): string {
  return utr.trim().toUpperCase();
}

/**
 * Validate a UTR string (normalizes internally).
 * Must be 8–30 uppercase alphanumeric characters after normalization.
 * Returns true if the UTR is valid, false otherwise.
 */
export function isValidUtr(utr: string): boolean {
  return /^[A-Z0-9]{8,30}$/.test(normalizeUtr(utr));
}
