'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Page error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-error/10">
        <svg className="h-8 w-8 text-error" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
      <p className="mt-2 max-w-md text-sm text-text-secondary">
        An unexpected error occurred. Our team has been notified. Please try again.
      </p>
      <div className="mt-6 flex gap-3">
        <Button variant="primary" onClick={reset}>
          Try again
        </Button>
        <Button variant="secondary" onClick={() => (window.location.href = '/')}>
          Go home
        </Button>
      </div>
      {process.env.NODE_ENV === 'development' && error.message && (
        <pre className="mt-6 max-w-lg overflow-auto rounded-lg bg-surface-elevated p-4 text-left text-xs text-text-muted">
          {error.message}
        </pre>
      )}
    </div>
  );
}
