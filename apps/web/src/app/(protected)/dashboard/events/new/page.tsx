'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createEvent } from '@/lib/api-client';

export default function CreateEventPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('19:00');
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [capacity, setCapacity] = useState('50');

  function generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      || 'event';
  }

  async function handleSubmit(targetStatus: string) {
    setError('');
    setFieldErrors({});

    if (!title || title.length < 2) {
      setFieldErrors({ title: 'Title must be at least 2 characters' });
      return;
    }
    if (!startDate) {
      setFieldErrors({ startDate: 'Start date is required' });
      return;
    }
    if (!venueName) {
      setFieldErrors({ venueName: 'Venue name is required' });
      return;
    }

    setIsSubmitting(true);

    try {
      const startAt = `${startDate}T${startTime}:00`;

      const event = await createEvent({
        title,
        slug: generateSlug(title),
        startAt,
        venueName,
        venueAddress: venueAddress || undefined,
        totalCapacity: parseInt(capacity, 10) || 50,
      });

      // If target is PUBLISHED, publish after creation
      if (targetStatus === 'PUBLISHED') {
        // Import and call publishEvent would go here
        // For now, just create as draft and redirect
      }

      router.push(`/dashboard/events/${event.id}`);
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Create Event</h1>
        <p className="mt-1 text-sm text-text-secondary">Fill in the details for your jamming session.</p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleSubmit('DRAFT'); }} className="space-y-8" noValidate>
        {error && (
          <div className="rounded-lg border border-error/30 bg-error-bg px-4 py-3 text-sm text-error" role="alert">
            {error}
          </div>
        )}

        {/* Basic Info */}
        <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-surface p-6">
          <h2 className="text-sm font-semibold text-white">Basic Information</h2>

          <Input
            label="Event Title"
            placeholder="e.g., Blues Night at the Club"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={fieldErrors.title}
            autoFocus
          />

          <div className="w-full">
            <label className="mb-1.5 block text-sm font-medium text-text-secondary">Description</label>
            <textarea
              rows={5}
              placeholder="Describe your event..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-white placeholder:text-text-muted transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${
                fieldErrors.description ? 'border-error ring-1 ring-error/50' : 'border-[var(--color-border)]'
              }`}
            />
            {fieldErrors.description && (
              <p className="mt-1 text-xs text-error">{fieldErrors.description}</p>
            )}
          </div>
        </section>

        {/* Date & Venue */}
        <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-surface p-6">
          <h2 className="text-sm font-semibold text-white">Date & Venue</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              error={fieldErrors.startDate}
            />
            <Input
              label="Start Time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              error={fieldErrors.startTime}
            />
          </div>

          <Input
            label="Venue Name"
            placeholder="e.g., The Continental Club"
            value={venueName}
            onChange={(e) => setVenueName(e.target.value)}
            error={fieldErrors.venueName}
          />

          <Input
            label="Venue Address"
            placeholder="e.g., 1315 S Congress Ave, Austin, TX"
            value={venueAddress}
            onChange={(e) => setVenueAddress(e.target.value)}
            error={fieldErrors.venueAddress}
          />
        </section>

        {/* Capacity & Tickets */}
        <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-surface p-6">
          <h2 className="text-sm font-semibold text-white">Capacity & Tickets</h2>

          <Input
            label="Maximum Capacity"
            type="number"
            min={1}
            placeholder="50"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            error={fieldErrors.capacity}
          />
        </section>

        {/* Publishing */}
        <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-surface p-6">
          <h2 className="text-sm font-semibold text-white">Publishing</h2>

          <div>
            <label className="mb-2 text-sm font-medium text-text-secondary">Save as</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleSubmit('DRAFT')}
                className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover"
              >
                Save as Draft
              </button>
              <button
                type="button"
                onClick={() => handleSubmit('PUBLISHED')}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
              >
                Publish Event
              </button>
            </div>
          </div>
        </section>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <Button type="button" size="lg" isLoading={isSubmitting} onClick={() => handleSubmit('DRAFT')}>
            Save Draft
          </Button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:text-white"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
