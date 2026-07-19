/**
 * Format a minor-units (cents) price for display.
 */
export function formatDisplayPrice(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return 'Free';
  if (amount === 0) return 'Free';
  const dollars = (amount / 100).toFixed(2);
  return `$${dollars}`;
}

/**
 * Convert minor units (cents) to a float for display.
 */
export function minorToDisplay(amount: number | null | undefined): number {
  if (amount === null || amount === undefined) return 0;
  return amount / 100;
}
