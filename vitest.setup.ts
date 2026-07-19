// Extend vitest expect with jest-dom matchers
import '@testing-library/jest-dom/vitest';

// Ensure React is available globally for JSX transforms
import React from 'react';

// Mock next-auth for testing
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({ data: null, status: 'unauthenticated' })),
  signOut: vi.fn(),
  signIn: vi.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('next-auth', () => {
  const actual = vi.fn(() => ({
    handlers: { GET: vi.fn(), POST: vi.fn() },
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  }));
  return { default: actual, NextAuth: actual };
});
