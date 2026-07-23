/**
 * Shared formatting utilities for the Evora frontend.
 * Centralized to prevent inconsistencies across pages.
 */

/**
 * Format a price stored in paise/cents to a display string.
 * Examples:
 *   0       → '—'
 *   29900   → '₹299'
 *   49900   → '₹499'
 */
export function formatPrice(total: number): string {
  if (total <= 0) return '—';
  return `₹${(total / 100).toLocaleString('en-IN')}`;
}

/**
 * Format a timestamp as a human-readable relative time string.
 * Examples: 'just now', '5m ago', '3h ago', 'yesterday', '2d ago'
 */
export function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHrs / 24);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays === 1) return 'yesterday';
  return `${diffDays}d ago`;
}

/**
 * Format a date for display in booking cards and detail pages.
 * Short format: '22 Jul 2026'
 */
export function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
