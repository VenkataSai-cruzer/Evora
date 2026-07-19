'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  subject: z.string().min(3, 'Subject must be at least 3 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

// Contact page uses client components for form interactivity.
// Metadata is handled by the root layout template.

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setFieldErrors({});

    const parsed = contactSchema.safeParse({ name, email, subject, message });
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
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 422 && data.fieldErrors) {
          const errors: Record<string, string> = {};
          for (const [key, msgs] of Object.entries(data.fieldErrors)) {
            errors[key] = (msgs as string[])[0];
          }
          setFieldErrors(errors);
        } else {
          setError(data.error || 'Something went wrong. Please try again.');
        }
        setIsLoading(false);
        return;
      }

      setSuccess(data.message);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
      setIsLoading(false);
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  }

  return (
    <div className="page-container py-16">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="text-center">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <span className="text-3xl">📧</span>
          </div>
          <h1 className="text-4xl font-bold text-white">Get in touch</h1>
          <p className="mt-4 text-text-secondary">
            Have a question, suggestion, or want to collaborate? We&apos;d love to hear from you.
          </p>
        </div>

        {/* Success state */}
        {success ? (
          <div className="mt-12 rounded-xl border border-success/30 bg-success-bg p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/20">
              <svg className="h-7 w-7 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-success">Message sent!</h3>
            <p className="mt-1 text-sm text-success/80">{success}</p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-6"
              onClick={() => setSuccess('')}
            >
              Send another message
            </Button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="mt-12 space-y-5" noValidate>
            {error && (
              <div
                className="rounded-lg border border-error/30 bg-error-bg px-4 py-3 text-sm text-error"
                role="alert"
              >
                {error}
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                label="Name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={fieldErrors.name}
                autoComplete="name"
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
            </div>

            <Input
              label="Subject"
              placeholder="What's this about?"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              error={fieldErrors.subject}
            />

            <div className="w-full">
              <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-text-secondary">
                Message
              </label>
              <textarea
                id="message"
                rows={6}
                placeholder="Tell us more..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={`w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-white placeholder:text-text-muted transition-all duration-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${
                  fieldErrors.message ? 'border-error ring-1 ring-error/50' : 'border-[var(--color-border)]'
                }`}
                aria-invalid={!!fieldErrors.message}
                aria-describedby={fieldErrors.message ? 'message-error' : undefined}
              />
              {fieldErrors.message && (
                <p id="message-error" className="mt-1.5 text-xs text-error" role="alert">
                  {fieldErrors.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full sm:w-auto" size="lg" isLoading={isLoading}>
              Send message
            </Button>
          </form>
        )}

        {/* Contact info */}
        <div className="mt-12 grid gap-6 border-t border-[var(--color-border)] pt-12 sm:grid-cols-3">
          <div className="text-center">
            <div className="text-2xl">📧</div>
            <p className="mt-2 text-sm font-medium text-white">Email</p>
            <p className="text-xs text-text-muted">hello@jamming.events</p>
          </div>
          <div className="text-center">
            <div className="text-2xl">📍</div>
            <p className="mt-2 text-sm font-medium text-white">Location</p>
            <p className="text-xs text-text-muted">Austin, Texas</p>
          </div>
          <div className="text-center">
            <div className="text-2xl">🎵</div>
            <p className="mt-2 text-sm font-medium text-white">Community</p>
            <p className="text-xs text-text-muted">Discord & Instagram</p>
          </div>
        </div>
      </div>
    </div>
  );
}
