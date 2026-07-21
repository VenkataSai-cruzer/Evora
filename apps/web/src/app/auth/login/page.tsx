'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { login } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-provider';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const { refresh } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as string;
        if (!errors[field]) errors[field] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(email, password);
      if (result.user) {
        await refresh();
        router.push(callbackUrl);
        router.refresh();
      } else {
        setError('Invalid email or password. Please try again.');
        setIsLoading(false);
      }
    } catch {
      setError('Invalid email or password. Please try again.');
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-lg font-bold text-white">
            <span className="text-xl">🎵</span>
            Jamming
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-white">Welcome back</h1>
          <p className="mt-1 text-sm text-text-secondary">Sign in to your account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div
              className="rounded-lg border border-error/30 bg-error-bg px-4 py-3 text-sm text-error"
              role="alert"
            >
              {error}
            </div>
          )}

          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
            autoComplete="email"
            autoFocus
          />

          <div>
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              autoComplete="current-password"
            />
            <div className="mt-1 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs text-text-muted transition-colors hover:text-text-secondary"
              >
                {showPassword ? 'Hide' : 'Show'} password
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <Link
              href="/auth/forgot-password"
              className="text-xs font-medium text-primary transition-colors hover:text-primary-hover"
            >
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
            Sign in
          </Button>
        </form>

        {/* Sign up link */}
        <p className="mt-8 text-center text-sm text-text-secondary">
          Don&apos;t have an account?{' '}
          <Link
            href="/auth/register"
            className="font-medium text-primary transition-colors hover:text-primary-hover"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
