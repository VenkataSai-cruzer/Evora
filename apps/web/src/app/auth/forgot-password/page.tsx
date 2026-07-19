'use client';

// Auth pages use client components. Metadata is handled by the root layout template.

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [informed, setInformed] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setInformed(true);
  }

  if (informed) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <span className="text-lg">🔔</span>
            </div>
            <h3 className="mt-4 text-sm font-semibold text-white">Coming soon</h3>
            <p className="mt-1 text-xs text-text-secondary">
              Password reset is not yet available. We&apos;ll notify you once this feature is ready.
            </p>
            <Link
              href="/auth/login"
              className="mt-4 inline-block text-xs font-medium text-primary transition-colors hover:text-primary-hover"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-lg font-bold text-white">
            <span className="text-xl">🎵</span>
            Jamming
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-white">Reset your password</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Password reset will be available soon. Leave your email to be notified.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoFocus
          />

          <Button type="submit" className="w-full" size="lg">
            Notify me when ready
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-text-secondary">
          Remember your password?{' '}
          <Link
            href="/auth/login"
            className="font-medium text-primary transition-colors hover:text-primary-hover"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
