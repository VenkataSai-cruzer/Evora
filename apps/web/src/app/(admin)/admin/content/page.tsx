'use client';

export default function AdminContentPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Content</h1>
      <p className="mt-1 text-sm text-text-secondary">Manage public content</p>

      <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-surface p-12 text-center">
        <p className="text-text-muted">Content management will appear here.</p>
      </div>
    </div>
  );
}
