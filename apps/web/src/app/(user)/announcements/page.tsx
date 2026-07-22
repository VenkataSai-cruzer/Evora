'use client';

export default function AnnouncementsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Announcements</h1>

      <div className="rounded-xl border border-[var(--color-border)] bg-surface p-12 text-center">
        <div className="text-3xl mb-3">🔔</div>
        <p className="text-text-muted">No announcements yet.</p>
        <p className="mt-1 text-xs text-text-muted">
          Event updates and announcements will appear here.
        </p>
      </div>
    </div>
  );
}
