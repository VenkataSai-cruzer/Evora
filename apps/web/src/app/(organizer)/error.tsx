'use client';

export default function OrganizerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error/10">
          <svg className="h-6 w-6 text-error" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-white">Something went wrong</h2>
        <p className="mt-2 text-sm text-text-secondary">
          The organizer dashboard encountered an unexpected error.
        </p>
        <p className="mt-1 text-xs text-text-muted">
          {error.digest ? `Error reference: ${error.digest}` : ''}
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex h-10 items-center rounded-lg border border-[var(--color-border)] px-5 text-sm font-medium text-text-secondary hover:text-white transition-colors"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
