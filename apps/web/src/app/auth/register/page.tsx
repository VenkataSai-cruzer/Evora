'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { register } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-provider';
import { z } from 'zod';

const registerSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(50),
  email: z.string().email('Please enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const parsed = registerSchema.safeParse({
      displayName,
      email,
      password,
      confirmPassword,
    });

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
      const result = await register({
        name: displayName,
        email,
        password,
      });

      if (result.user) {
        // Registration creates a session, just refresh and redirect
        await refresh();
        router.push('/');
        router.refresh();
      } else {
        setError('Registration failed. Please try again.');
        setIsLoading(false);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-lg font-bold text-white">
            <span className="text-xl">🎵</span>
            Jamming
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-white">Join the community</h1>
          <p className="mt-1 text-sm text-text-secondary">Create your account and start jamming</p>
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
            label="Display Name"
            placeholder="Alex Rivera"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            error={fieldErrors.displayName}
            autoComplete="name"
            autoFocus
          />

          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
            autoComplete="email"
          />

          <div>
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              helperText="Must be 8+ characters with 1 uppercase letter and 1 number"
              autoComplete="new-password"
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

          <Input
            label="Confirm Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Repeat your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={fieldErrors.confirmPassword}
            autoComplete="new-password"
          />

          <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
            Create account
          </Button>
        </form>

        {/* Sign in link */}
        <p className="mt-8 text-center text-sm text-text-secondary">
          Already have an account?{' '}
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
