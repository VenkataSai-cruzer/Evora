import Link from 'next/link';

// Force dynamic rendering so Next.js returns a true HTTP 404 status
// instead of static 200 for the custom not-found page.
export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-elevated">
        <span className="text-2xl">🔍</span>
      </div>
      <h1 className="text-4xl font-extrabold text-white">404</h1>
      <p className="mt-2 text-lg text-text-secondary">Page not found</p>
      <p className="mt-1 max-w-sm text-sm text-text-muted">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white transition-all hover:bg-primary-hover hover:-translate-y-0.5"
      >
        Go home
      </Link>
    </div>
  );
}
