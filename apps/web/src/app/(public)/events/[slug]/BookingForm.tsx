'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createOrder } from '@/lib/api-client';

interface BookingFormProps {
  eventId: string;
  ticketTypes: { id: string; name: string; price: number; capacity: number; maxPerOrder: number }[];
  contactEmail: string | null;
}

export function BookingForm({ eventId, ticketTypes }: BookingFormProps) {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState(ticketTypes[0]?.id || '');
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedType || !name.trim()) {
      setError('Please select a ticket type and enter your name.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await createOrder({
        eventId,
        ticketTypeId: selectedType,
        attendees: Array.from({ length: quantity }, (_, i) => ({
          name: i === 0 ? name.trim() : `${name.trim()} +${i}`,
        })),
      });
      router.push(`/payment-status?orderId=${result.order.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form id="booking" onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-lg bg-error-bg px-4 py-3 text-sm text-error">{error}</div>}

      <div>
        <label className="mb-1.5 block text-sm text-text-secondary">Ticket Type</label>
        <select
          value={selectedType}
          onChange={e => setSelectedType(e.target.value)}
          className="w-full rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2.5 text-sm text-white focus:border-primary focus:outline-none"
        >
          {ticketTypes.map(tt => (
            <option key={tt.id} value={tt.id}>
              {tt.name} — ₹{(tt.price / 100).toFixed(0)} ({tt.capacity} available)
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-sm text-text-secondary">Quantity</label>
        <input
          type="number" min={1} max={ticketTypes.find(t => t.id === selectedType)?.maxPerOrder || 10}
          value={quantity} onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-full rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2.5 text-sm text-white focus:border-primary focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm text-text-secondary">Your Name</label>
        <input
          type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full name"
          className="w-full rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2.5 text-sm text-white placeholder:text-text-muted focus:border-primary focus:outline-none"
        />
      </div>

      <button
        type="submit" disabled={loading}
        className="w-full rounded-lg bg-primary py-3 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
      >
        {loading ? 'Booking...' : 'Book now'}
      </button>
    </form>
  );
}
