import { describe, it, expect, vi } from 'vitest';

// Mock all subpath modules that auth.ts imports
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('next-auth/providers/credentials', () => ({
  default: vi.fn(() => ({ id: 'credentials', name: 'credentials' })),
}));

vi.mock('next-auth/providers/google', () => ({
  default: vi.fn(() => ({ id: 'google', name: 'google' })),
}));

vi.mock('bcryptjs', () => ({
  compare: vi.fn(() => Promise.resolve(true)),
  hash: vi.fn(() => Promise.resolve('hashed')),
}));

describe('Auth Configuration', () => {
  it('should configure session with JWT strategy', async () => {
    const { authOptions } = await import('@/lib/auth');
    expect(authOptions.session?.strategy).toBe('jwt');
  });

  it('should have credentials provider configured', async () => {
    const { authOptions } = await import('@/lib/auth');
    const hasCredentials = authOptions.providers.some(
      (p: any) => p.id === 'credentials',
    );
    expect(hasCredentials).toBe(true);
  });

  it('should have sign-in page configured', async () => {
    const { authOptions } = await import('@/lib/auth');
    expect(authOptions.pages?.signIn).toBe('/auth/login');
  });

  it('should have new user page configured', async () => {
    const { authOptions } = await import('@/lib/auth');
    expect(authOptions.pages?.newUser).toBe('/auth/register');
  });

  it('should have session max age of 7 days', async () => {
    const { authOptions } = await import('@/lib/auth');
    expect(authOptions.session?.maxAge).toBe(7 * 24 * 60 * 60);
  });
});
