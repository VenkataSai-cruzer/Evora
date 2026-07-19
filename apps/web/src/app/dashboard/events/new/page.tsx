'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const INSTRUMENTS = ['Guitar', 'Bass', 'Drums', 'Keys', 'Vocals', 'Saxophone', 'Trumpet', 'Violin', 'Percussion', 'Other'];
const SKILL_LEVELS = ['ALL', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

export default function CreateEventPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('19:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [capacity, setCapacity] = useState('50');
  const [ticketType, setTicketType] = useState('FREE');
  const [price, setPrice] = useState('');
  const [skillLevel, setSkillLevel] = useState('ALL');
  const [visibility, setVisibility] = useState('PUBLIC');
  const [upiId, setUpiId] = useState('');
  const [upiQrCodeUrl, setUpiQrCodeUrl] = useState('');

  function toggleInstrument(instrument: string) {
    setSelectedInstruments((prev) =>
      prev.includes(instrument)
        ? prev.filter((i) => i !== instrument)
        : [...prev, instrument],
    );
  }

  async function handleSubmit(targetStatus: string) {
    setError('');
    setFieldErrors({});

    if (!title || title.length < 2) {
      setFieldErrors({ title: 'Title must be at least 2 characters' });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/dashboard/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          startDate,
          startTime,
          endDate: endDate || null,
          endTime: endTime || null,
          venueName,
          venueAddress,
          capacity: parseInt(capacity, 10),
          ticketType,
          price: ticketType === 'PAID' ? parseFloat(price) : null,
          upiId: upiId || null,
          upiQrCodeUrl: upiQrCodeUrl || null,
          instruments: JSON.stringify(selectedInstruments),
          skillLevel,
          visibility,
          status: targetStatus,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.fieldErrors) {
          const errors: Record<string, string> = {};
          for (const [key, msgs] of Object.entries(data.fieldErrors)) {
            errors[key] = (msgs as string[])[0];
          }
          setFieldErrors(errors);
        } else {
          setError(data.error || 'Failed to create event');
        }
        setIsSubmitting(false);
        return;
      }

      router.push(`/dashboard/events/${data.event.id}`);
      router.refresh();
    } catch {
      setError('An unexpected error occurred');
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
            placeholder="e.g., Austin Blues Night"
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

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="End Date (optional)"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <Input
              label="End Time (optional)"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
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

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-secondary">Ticket Type</label>
            <div className="flex gap-2">
              {['FREE', 'PAID'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTicketType(type)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    ticketType === type
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-[var(--color-border)] text-text-secondary hover:border-primary/30'
                  }`}
                >
                  {type === 'FREE' ? 'Free Entry' : 'Paid Ticket'}
                </button>
              ))}
            </div>
          </div>

          {ticketType === 'PAID' && (
            <>
              <Input
                label="Price (USD)"
                type="number"
                min={0}
                step={0.01}
                placeholder="10.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              <div className="rounded-lg border border-primary/10 bg-primary/[0.02] p-4">
                <h3 className="mb-3 text-sm font-semibold text-white">💳 UPI Payment Details</h3>
                <p className="mb-3 text-xs text-text-muted">
                  Add your UPI ID so attendees know where to send payments.
                </p>
                <Input
                  label="UPI ID"
                  placeholder="e.g., organizer@paytm or organizer@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                />
                <div className="mt-3">
                  <Input
                    label="QR Code Image URL (optional)"
                    placeholder="https://example.com/qr-code.png"
                    value={upiQrCodeUrl}
                    onChange={(e) => setUpiQrCodeUrl(e.target.value)}
                  />
                  {upiQrCodeUrl && (
                    <div className="mt-2">
                      <p className="mb-1 text-xs text-text-muted">Preview:</p>
                      <img
                        src={upiQrCodeUrl}
                        alt="UPI QR Code"
                        className="h-24 w-24 rounded-lg border border-[var(--color-border)] object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </section>

        {/* Music Details */}
        <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-surface p-6">
          <h2 className="text-sm font-semibold text-white">Music Details</h2>

          <div>
            <label className="mb-2 text-sm font-medium text-text-secondary">Instruments Needed</label>
            <div className="flex flex-wrap gap-2">
              {INSTRUMENTS.map((instrument) => (
                <button
                  key={instrument}
                  type="button"
                  onClick={() => toggleInstrument(instrument)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                    selectedInstruments.includes(instrument)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-[var(--color-border)] text-text-secondary hover:border-primary/30 hover:text-white'
                  }`}
                >
                  {instrument}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 text-sm font-medium text-text-secondary">Skill Level</label>
            <div className="flex flex-wrap gap-2">
              {SKILL_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSkillLevel(level)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                    skillLevel === level
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-[var(--color-border)] text-text-secondary hover:border-primary/30 hover:text-white'
                  }`}
                >
                  {level === 'ALL' ? 'All Levels' : level.charAt(0) + level.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Publishing */}
        <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-surface p-6">
          <h2 className="text-sm font-semibold text-white">Publishing</h2>

          <div>
            <label className="mb-2 text-sm font-medium text-text-secondary">Visibility</label>
            <div className="flex gap-2">
              {[
                { value: 'PUBLIC', label: 'Public' },
                { value: 'PRIVATE', label: 'Private' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setVisibility(opt.value)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    visibility === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-[var(--color-border)] text-text-secondary hover:border-primary/30'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

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
