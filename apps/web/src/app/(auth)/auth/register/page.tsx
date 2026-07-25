'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { register } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-provider';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').regex(/[A-Z]/, 'Needs 1 uppercase letter').regex(/[0-9]/, 'Needs 1 number'),
  confirm: z.string(),
}).refine(d => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });

type FieldErrors = Partial<Record<'name' | 'email' | 'password' | 'confirm', string>>;

function getPasswordStrength(password: string): { score: number; label: string; color: string; bg: string } {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-error', bg: 'bg-error/20' };
  if (score <= 3) return { score: 2, label: 'Fair', color: 'bg-warning', bg: 'bg-warning/20' };
  if (score <= 4) return { score: 3, label: 'Good', color: 'bg-primary', bg: 'bg-primary/20' };
  return { score: 4, label: 'Strong', color: 'bg-green-500', bg: 'bg-green-500/20' };
}

export default function RegisterPage() {
  const router = useRouter();
  const { loginAs } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const clearFieldError = (field: keyof FieldErrors) => {
    setFieldErrors(prev => ({ ...prev, [field]: undefined }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError('');
    setFieldErrors({});

    const parsed = schema.safeParse({ name, email, password, confirm });
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof FieldErrors;
        if (!errors[field]) errors[field] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const result = await register({ name, email, password });
      if (result.user) {
        loginAs({
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          allowedRoles: (result.user as any).allowedRoles,
        });
        router.replace('/my-event');
        router.refresh();
      }
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white">Create your account</h1>
        <p className="mt-1 text-sm text-text-secondary">Join 7 NOTES and book events</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Server Error Banner */}
        {serverError && (
          <div className="animate-slideDown rounded-lg bg-error-bg px-4 py-3 text-sm text-error flex items-center gap-2">
            <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {serverError}
          </div>
        )}

        {/* Full Name */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-secondary">Full Name</label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="h-4 w-4 text-text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); clearFieldError('name'); }}
              autoComplete="name"
              autoFocus
              placeholder="John Doe"
              className={`w-full rounded-lg border bg-surface pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-text-muted transition-colors
                focus:outline-none focus:ring-1
                ${fieldErrors.name
                  ? 'border-error/50 focus:border-error focus:ring-error/30'
                  : 'border-[var(--color-border)] focus:border-primary focus:ring-primary/30'
                }`}
            />
          </div>
          {fieldErrors.name && (
            <p className="mt-1 text-xs text-error animate-slideDown">{fieldErrors.name}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-secondary">Email</label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="h-4 w-4 text-text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); clearFieldError('email'); }}
              autoComplete="email"
              placeholder="you@example.com"
              className={`w-full rounded-lg border bg-surface pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-text-muted transition-colors
                focus:outline-none focus:ring-1
                ${fieldErrors.email
                  ? 'border-error/50 focus:border-error focus:ring-error/30'
                  : 'border-[var(--color-border)] focus:border-primary focus:ring-primary/30'
                }`}
            />
          </div>
          {fieldErrors.email && (
            <p className="mt-1 text-xs text-error animate-slideDown">{fieldErrors.email}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-secondary">Password</label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="h-4 w-4 text-text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); clearFieldError('password'); }}
              autoComplete="new-password"
              placeholder="Create a strong password"
              className={`w-full rounded-lg border bg-surface pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-text-muted transition-colors
                focus:outline-none focus:ring-1
                ${fieldErrors.password
                  ? 'border-error/50 focus:border-error focus:ring-error/30'
                  : 'border-[var(--color-border)] focus:border-primary focus:ring-primary/30'
                }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted hover:text-white transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>
          {/* Password Strength Indicator */}
          {password.length > 0 && (
            <div className="mt-2 animate-slideDown">
              <div className="flex h-1.5 gap-1">
                {[1, 2, 3, 4].map(level => (
                  <div
                    key={level}
                    className={`h-full flex-1 rounded-full transition-all duration-300 ${
                      level <= strength.score ? strength.color : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>
              <p className={`mt-1 text-xs ${strength.bg} ${strength.color.replace('bg-', 'text-')} rounded-full px-2 py-0.5 inline-block`}>
                {strength.label}
              </p>
            </div>
          )}
          {fieldErrors.password && (
            <p className="mt-1 text-xs text-error animate-slideDown">{fieldErrors.password}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-secondary">Confirm Password</label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="h-4 w-4 text-text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirm}
              onChange={e => { setConfirm(e.target.value); clearFieldError('confirm'); }}
              autoComplete="new-password"
              placeholder="Re-enter your password"
              className={`w-full rounded-lg border bg-surface pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-text-muted transition-colors
                focus:outline-none focus:ring-1
                ${fieldErrors.confirm
                  ? 'border-error/50 focus:border-error focus:ring-error/30'
                  : 'border-[var(--color-border)] focus:border-primary focus:ring-primary/30'
                }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted hover:text-white transition-colors"
              tabIndex={-1}
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
            >
              {showConfirm ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>
          {confirm.length > 0 && password !== confirm && (
            <p className="mt-1 text-xs text-warning">Passwords do not match</p>
          )}
          {fieldErrors.confirm && (
            <p className="mt-1 text-xs text-error animate-slideDown">{fieldErrors.confirm}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="group relative w-full overflow-hidden rounded-lg bg-primary py-2.5 text-sm font-medium text-white transition-all
            hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className={`inline-flex items-center gap-2 transition-all ${loading ? 'opacity-0' : 'opacity-100'}`}>
            Create account
            <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </span>
          {loading && (
            <span className="absolute inset-0 flex items-center justify-center">
              <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </span>
          )}
        </button>

        {/* Footer */}
        <p className="text-center text-sm text-text-secondary">
          Already have an account?{' '}
          <Link href="/auth/login" className="font-medium text-primary hover:text-primary-hover transition-colors">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
