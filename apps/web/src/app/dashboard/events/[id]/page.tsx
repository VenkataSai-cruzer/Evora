'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Form fields matching new Event schema
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [totalCapacity, setTotalCapacity] = useState('50');
  const [salesStartAt, setSalesStartAt] = useState('');
  const [salesEndAt, setSalesEndAt] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [terms, setTerms] = useState('');
  const [ticketNumberPrefix, setTicketNumberPrefix] = useState('');
  const [status, setStatus] = useState('DRAFT');

  useEffect(() => {
    async function loadEvent() {
      try {
        const res = await fetch(`/api/dashboard/events/${eventId}`);
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        const event = data.event;

        setTitle(event.title);
        setSlug(event.slug);
        setShortDescription(event.shortDescription || '');
        setDescription(event.description || '');
        setStartAt(event.startAt ? event.startAt.split('T')[0] : '');
        setEndAt(event.endAt ? event.endAt.split('T')[0] : '');
        setVenueName(event.venueName);
        setVenueAddress(event.venueAddress || '');
        setMapUrl(event.mapUrl || '');
        setTotalCapacity(String(event.totalCapacity));
        setSalesStartAt(event.salesStartAt ? event.salesStartAt.split('T')[0] : '');
        setSalesEndAt(event.salesEndAt ? event.salesEndAt.split('T')[0] : '');
        setContactEmail(event.contactEmail || '');
        setContactPhone(event.contactPhone || '');
        setTerms(event.terms || '');
        setTicketNumberPrefix(event.ticketNumberPrefix || '');
        setStatus(event.status);
      } catch {
        setError('Failed to load event');
      } finally {
        setIsLoading(false);
      }
    }
    loadEvent();
  }, [eventId]);

  async function handleSave(targetStatus: string) {
    setError('');
    setFieldErrors({});

    if (!title || title.length < 2) {
      setFieldErrors({ title: 'Title must be at least 2 characters' });
      return;
    }

    if (!startAt) {
      setFieldErrors({ startAt: 'Start date is required' });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/dashboard/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          shortDescription: shortDescription || null,
          description: description || null,
          startAt: new Date(startAt).toISOString(),
          endAt: endAt ? new Date(endAt).toISOString() : null,
          venueName,
          venueAddress: venueAddress || null,
          mapUrl: mapUrl || null,
          totalCapacity: parseInt(totalCapacity, 10) || 0,
          salesStartAt: salesStartAt ? new Date(salesStartAt).toISOString() : null,
          salesEndAt: salesEndAt ? new Date(salesEndAt).toISOString() : null,
          contactEmail: contactEmail || null,
          contactPhone: contactPhone || null,
          terms: terms || null,
          ticketNumberPrefix: ticketNumberPrefix || null,
          status: targetStatus,
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
              status === 'PUBLISHED' || status === 'SALES_OPEN' ? 'bg-success/10 text-success' :
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
          {status !== 'CANCELLED' && status !== 'COMPLETED' && (
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
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleSave(status); }} className="space-y-6" noValidate>
        {/* Basic Info */}
        <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-surface p-6">
          <h2 className="text-sm font-semibold text-white">Basic Information</h2>
          <Input label="Event Title" value={title} onChange={(e) => setTitle(e.target.value)} error={fieldErrors.title} />
          <Input label="Short Description (optional)" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} placeholder="A brief tagline for the event" />
          <div className="w-full">
            <label className="mb-1.5 block text-sm font-medium text-text-secondary">Full Description (optional)</label>
            <textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2.5 text-sm text-white placeholder:text-text-muted transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Detailed description of the event..."
            />
          </div>
          <Input label="Ticket Number Prefix" placeholder="e.g., 7N-2026-HYD-" value={ticketNumberPrefix} onChange={(e) => setTicketNumberPrefix(e.target.value)} />
        </section>

        {/* Date & Venue */}
        <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-surface p-6">
          <h2 className="text-sm font-semibold text-white">Date & Venue</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Start Date & Time" type="date" value={startAt} onChange={(e) => setStartAt(e.target.value)} error={fieldErrors.startAt} />
            <Input label="End Date & Time (optional)" type="date" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
          </div>
          <Input label="Venue Name" value={venueName} onChange={(e) => setVenueName(e.target.value)} />
          <Input label="Venue Address (optional)" value={venueAddress} onChange={(e) => setVenueAddress(e.target.value)} />
          <Input label="Google Maps URL (optional)" value={mapUrl} onChange={(e) => setMapUrl(e.target.value)} placeholder="https://maps.google.com/..." />
        </section>

        {/* Capacity & Sales */}
        <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-surface p-6">
          <h2 className="text-sm font-semibold text-white">Capacity & Sales</h2>
          <Input label="Total Capacity" type="number" min={1} value={totalCapacity} onChange={(e) => setTotalCapacity(e.target.value)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Sales Start (optional)" type="date" value={salesStartAt} onChange={(e) => setSalesStartAt(e.target.value)} />
            <Input label="Sales End (optional)" type="date" value={salesEndAt} onChange={(e) => setSalesEndAt(e.target.value)} />
          </div>
        </section>

        {/* Contact */}
        <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-surface p-6">
          <h2 className="text-sm font-semibold text-white">Contact & Terms</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Contact Email (optional)" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="support@example.com" />
            <Input label="Contact Phone (optional)" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </div>
          <div className="w-full">
            <label className="mb-1.5 block text-sm font-medium text-text-secondary">Terms & Conditions (optional)</label>
            <textarea rows={4} value={terms} onChange={(e) => setTerms(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2.5 text-sm text-white placeholder:text-text-muted transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Event terms and conditions..."
            />
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
          {(status === 'PUBLISHED') && (
            <button type="button" onClick={() => handleSave('DRAFT')}
              className="rounded-lg border border-[var(--color-border)] px-6 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover"
            >Unpublish</button>
          )}
          {(status === 'PUBLISHED') && (
            <button type="button" onClick={() => handleSave('COMPLETED')}
              className="rounded-lg border border-[var(--color-border)] px-6 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover"
            >Mark Completed</button>
          )}
        </div>
      </form>
    </div>
  );
}
