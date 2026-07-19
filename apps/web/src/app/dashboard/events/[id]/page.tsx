'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const INSTRUMENTS = ['Guitar', 'Bass', 'Drums', 'Keys', 'Vocals', 'Saxophone', 'Trumpet', 'Violin', 'Percussion', 'Other'];
const SKILL_LEVELS = ['ALL', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);

  // Form fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
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
  const [status, setStatus] = useState('DRAFT');
  const [edition, setEdition] = useState('');
  const [entryGate, setEntryGate] = useState('');
  const [entryInstructions, setEntryInstructions] = useState('');
  const [upiId, setUpiId] = useState('');
  const [upiQrCodeUrl, setUpiQrCodeUrl] = useState('');

  useEffect(() => {
    async function loadEvent() {
      try {
        const res = await fetch(`/api/dashboard/events/${eventId}`);
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        const event = data.event;

        setTitle(event.title);
        setSlug(event.slug);
        setDescription(event.description);
        setStartDate(event.startDate ? event.startDate.split('T')[0] : '');
        setStartTime(event.startTime || '19:00');
        setEndDate(event.endDate ? event.endDate.split('T')[0] : '');
        setEndTime(event.endTime || '');
        setVenueName(event.venueName);
        setVenueAddress(event.venueAddress);
        setCapacity(String(event.capacity));
        setTicketType(event.ticketType);
        setPrice(event.price ? String(event.price) : '');
        setSkillLevel(event.skillLevel);
        setVisibility(event.visibility);
        setStatus(event.status);
        setEdition(event.edition || '');
        setEntryGate(event.entryGate || '');
        setEntryInstructions(event.entryInstructions || '');
        setUpiId(event.upiId || '');
        setUpiQrCodeUrl(event.upiQrCodeUrl || '');

        try {
          setSelectedInstruments(JSON.parse(event.instruments));
        } catch {
          setSelectedInstruments([]);
        }
      } catch {
        setError('Failed to load event');
      } finally {
        setIsLoading(false);
      }
    }
    loadEvent();
  }, [eventId]);

  function toggleInstrument(instrument: string) {
    setSelectedInstruments((prev) =>
      prev.includes(instrument) ? prev.filter((i) => i !== instrument) : [...prev, instrument],
    );
  }

  async function handleSave(targetStatus: string) {
    setError('');
    setFieldErrors({});

    if (!title || title.length < 2) {
      setFieldErrors({ title: 'Title must be at least 2 characters' });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/dashboard/events/${eventId}`, {
        method: 'PATCH',
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
          instruments: JSON.stringify(selectedInstruments),
          skillLevel,
          visibility,
          status: targetStatus,
          edition: edition || null,
          entryGate: entryGate || null,
          entryInstructions: entryInstructions || null,
          upiId: upiId || null,
          upiQrCodeUrl: upiQrCodeUrl || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.fieldErrors) {
          const errs: Record<string, string> = {};
          for (const [k, msgs] of Object.entries(data.fieldErrors)) {
            errs[k] = (msgs as string[])[0];
          }
          setFieldErrors(errs);
        } else {
          setError(data.error || 'Failed to save');
        }
        return;
      }

      setStatus(data.event.status);
      router.refresh();
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDuplicate() {
    try {
      const res = await fetch(`/api/dashboard/events/${eventId}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        router.push(`/dashboard/events/${data.event.id}`);
      }
    } catch {
      setError('Failed to duplicate event');
    }
  }

  async function handleCancel() {
    if (!confirm('Are you sure you want to cancel this event?')) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/dashboard/events/${eventId}`, { method: 'DELETE' });
      router.push('/dashboard/events');
      router.refresh();
    } catch {
      setError('Failed to cancel event');
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded bg-surface-elevated" />
        <div className="h-96 rounded-xl bg-surface-elevated" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              status === 'PUBLISHED' ? 'bg-success/10 text-success' :
              status === 'SALES_OPEN' ? 'bg-success/10 text-success' :
              status === 'DRAFT' ? 'bg-warning/10 text-warning' :
              status === 'COMPLETED' ? 'bg-primary/10 text-primary' :
              'bg-error/10 text-error'
            }`}>{status}</span>
          </div>
          <p className="mt-1 text-sm text-text-muted">/{slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleDuplicate}>
            Duplicate
          </Button>
          {status !== 'CANCELLED' && status !== 'COMPLETED' && status !== 'SALES_CLOSED' && status !== 'SOLD_OUT' && (
            <Button variant="danger" size="sm" isLoading={isDeleting} onClick={handleCancel}>
              Cancel Event
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-error/30 bg-error-bg px-4 py-3 text-sm text-error" role="alert">
          {error}
        </div>
      )}

      {/* Quick navigation */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href={`/dashboard/events/${eventId}/attendees`}
          className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-white"
        >
          👥 Attendees
        </Link>
        <Link
          href={`/dashboard/events/${eventId}/manage`}
          className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-white"
        >
          🎫 Manage Tickets
        </Link>
        <Link
          href={`/dashboard/events/${eventId}/utr`}
          className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-white"
        >
          💳 UTR Verification
        </Link>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleSave(status); }} className="space-y-6" noValidate>
        {/* Basic Info */}
        <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-surface p-6">
          <h2 className="text-sm font-semibold text-white">Basic Information</h2>
          <Input label="Event Title" value={title} onChange={(e) => setTitle(e.target.value)} error={fieldErrors.title} />
          <div className="w-full">
            <label className="mb-1.5 block text-sm font-medium text-text-secondary">Description</label>
            <textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2.5 text-sm text-white placeholder:text-text-muted transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <Input label="Edition (optional)" placeholder="e.g., Vol. 1, Summer 2026" value={edition} onChange={(e) => setEdition(e.target.value)} />
        </section>

        {/* Date & Venue */}
        <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-surface p-6">
          <h2 className="text-sm font-semibold text-white">Date & Venue</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <Input label="Start Time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="End Date (optional)" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            <Input label="End Time (optional)" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
          <Input label="Venue Name" value={venueName} onChange={(e) => setVenueName(e.target.value)} />
          <Input label="Venue Address" value={venueAddress} onChange={(e) => setVenueAddress(e.target.value)} />
          <Input label="Entry Gate (optional)" placeholder="e.g., Main Entrance, Gate B" value={entryGate} onChange={(e) => setEntryGate(e.target.value)} />
          <div className="w-full">
            <label className="mb-1.5 block text-sm font-medium text-text-secondary">Entry Instructions (optional)</label>
            <textarea rows={3} value={entryInstructions} onChange={(e) => setEntryInstructions(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2.5 text-sm text-white placeholder:text-text-muted transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Instructions for attendees on event day..."
            />
          </div>
        </section>

        {/* Capacity & Tickets */}
        <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-surface p-6">
          <h2 className="text-sm font-semibold text-white">Capacity & Tickets</h2>
          <Input label="Maximum Capacity" type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-secondary">Ticket Type</label>
            <div className="flex gap-2">
              {['FREE', 'PAID'].map((type) => (
                <button key={type} type="button" onClick={() => setTicketType(type)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    ticketType === type ? 'border-primary bg-primary/10 text-primary' : 'border-[var(--color-border)] text-text-secondary'
                  }`}
                >{type === 'FREE' ? 'Free Entry' : 'Paid Ticket'}</button>
              ))}
            </div>
          </div>
          {ticketType === 'PAID' && (
            <>
              <Input label="Price (USD)" type="number" min={0} step={0.01} value={price} onChange={(e) => setPrice(e.target.value)} />
              <div className="rounded-lg border border-primary/10 bg-primary/[0.02] p-4">
                <h3 className="mb-3 text-sm font-semibold text-white">💳 UPI Payment Details</h3>
                <p className="mb-3 text-xs text-text-muted">
                  Add your UPI ID so attendees know where to send payments. The UPI details will be shown on the event registration page.
                </p>
                <div className="space-y-3">
                  <Input
                    label="UPI ID"
                    placeholder="e.g., organizer@paytm or organizer@upi"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                  />
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
              {INSTRUMENTS.map((inst) => (
                <button key={inst} type="button" onClick={() => toggleInstrument(inst)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                    selectedInstruments.includes(inst) ? 'border-primary bg-primary/10 text-primary' : 'border-[var(--color-border)] text-text-secondary'
                  }`}
                >{inst}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-2 text-sm font-medium text-text-secondary">Skill Level</label>
            <div className="flex flex-wrap gap-2">
              {SKILL_LEVELS.map((level) => (
                <button key={level} type="button" onClick={() => setSkillLevel(level)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                    skillLevel === level ? 'border-primary bg-primary/10 text-primary' : 'border-[var(--color-border)] text-text-secondary'
                  }`}
                >{level === 'ALL' ? 'All Levels' : level.charAt(0) + level.slice(1).toLowerCase()}</button>
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
              {[{ value: 'PUBLIC', label: 'Public' }, { value: 'PRIVATE', label: 'Private' }].map((opt) => (
                <button key={opt.value} type="button" onClick={() => setVisibility(opt.value)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    visibility === opt.value ? 'border-primary bg-primary/10 text-primary' : 'border-[var(--color-border)] text-text-secondary'
                  }`}
                >{opt.label}</button>
              ))}
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button type="submit" size="lg" isLoading={isSubmitting}>
            Save Changes
          </Button>
          {status === 'DRAFT' && (
            <button type="button" onClick={() => handleSave('PUBLISHED')}
              className="rounded-lg bg-success px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-success/90"
            >Publish Event</button>
          )}
          {(status === 'PUBLISHED' || status === 'SALES_OPEN') && (
            <button type="button" onClick={() => handleSave('SALES_PAUSED')}
              className="rounded-lg border border-[var(--color-border)] px-6 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover"
            >Pause Sales</button>
          )}
          {status === 'SALES_PAUSED' && (
            <button type="button" onClick={() => handleSave('SALES_OPEN')}
              className="rounded-lg border border-[var(--color-border)] px-6 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover"
            >Resume Sales</button>
          )}
          {(status === 'PUBLISHED' || status === 'SALES_OPEN') && (
            <button type="button" onClick={() => handleSave('DRAFT')}
              className="rounded-lg border border-[var(--color-border)] px-6 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover"
            >Unpublish</button>
          )}
          {(status === 'PUBLISHED' || status === 'SALES_OPEN') && (
            <button type="button" onClick={() => handleSave('COMPLETED')}
              className="rounded-lg border border-[var(--color-border)] px-6 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover"
            >Mark Completed</button>
          )}
        </div>
      </form>
    </div>
  );
}
