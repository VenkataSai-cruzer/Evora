import { NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const limiters = new Map<string, Map<string, RateLimitEntry>>();

// Periodic cleanup to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [, entries] of limiters) {
    for (const [key, entry] of entries) {
      if (now > entry.resetAt) {
        entries.delete(key);
      }
    }
  }
}, 60_000);

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  name: string;
}

export function checkRateLimit(
  ip: string,
  config: RateLimitConfig,
): { allowed: boolean; remaining: number; resetIn: number } {
  if (!limiters.has(config.name)) {
    limiters.set(config.name, new Map());
  }

  const entries = limiters.get(config.name)!;
  const now = Date.now();
  const entry = entries.get(ip);

  if (!entry || now > entry.resetAt) {
    entries.set(ip, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetIn: config.windowMs };
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true, remaining: config.maxRequests - entry.count, resetIn: entry.resetAt - now };
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
  );
}

export function rateLimitResponse(remaining: number, resetIn: number) {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: {
        'Retry-After': Math.ceil(resetIn / 1000).toString(),
        'X-RateLimit-Remaining': remaining.toString(),
      },
    },
  );
}

// Rate limit configurations
export const RATE_LIMITS = {
  contact: { maxRequests: 5, windowMs: 10 * 60 * 1000, name: 'contact' },
  register: { maxRequests: 3, windowMs: 60 * 1000, name: 'register' },
  tickets: { maxRequests: 10, windowMs: 60 * 1000, name: 'tickets' },
  upload: { maxRequests: 20, windowMs: 60 * 1000, name: 'upload' },
  organizer: { maxRequests: 60, windowMs: 60 * 1000, name: 'organizer' },
  events: { maxRequests: 120, windowMs: 60 * 1000, name: 'events' },
} as const;
