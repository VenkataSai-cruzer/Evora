'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { register } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-provider';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').regex(/[A-Z]/, 'Needs 1 uppercase').regex(/[0-9]/, 'Needs 1 number'),
  confirm: z.string(),
}).refine(d => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const parsed = schema.safeParse({ name, email, password, confirm });
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setLoading(true);
    try {
      const result = await register({ name, email, password });
      if (result.user) {
        await refresh();
        router.replace('/my-event');
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-white">Create your account</h1>
        <p className="mt-1 text-sm text-text-secondary">Join 7 NOTES and book events</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-lg bg-error-bg px-4 py-3 text-sm text-error">{error}</div>}
        <div>
          <label className="mb-1.5 block text-sm text-text-secondary">Full Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} autoComplete="name" autoFocus
            className="w-full rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2.5 text-sm text-white placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-text-secondary">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email"
            className="w-full rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2.5 text-sm text-white placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-text-secondary">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password"
            className="w-full rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2.5 text-sm text-white placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
          <p className="mt-1 text-xs text-text-muted">8+ characters, 1 uppercase, 1 number</p>
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-text-secondary">Confirm Password</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password"
            className="w-full rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2.5 text-sm text-white placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <button type="submit" disabled={loading}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50">
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-text-secondary">
        Already have an account?{' '}
        <Link href="/auth/login" className="font-medium text-primary hover:text-primary-hover">Sign in</Link>
      </p>
    </div>
  );
}
