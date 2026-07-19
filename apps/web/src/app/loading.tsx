import { Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="page-container py-16">
      {/* Hero skeleton */}
      <div className="mb-16 space-y-4 text-center">
        <Skeleton className="mx-auto h-12 w-96 max-w-full" />
        <Skeleton className="mx-auto h-5 w-72 max-w-full" />
        <div className="flex justify-center gap-3 pt-4">
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>

      {/* Cards skeleton */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[var(--color-border)] bg-surface p-4">
            <Skeleton variant="rect" className="aspect-video w-full rounded-lg" />
            <div className="mt-3 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
