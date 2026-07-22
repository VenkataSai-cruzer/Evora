'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-provider';
import { createOrder } from '@/lib/api-client';

interface BookingFormProps {
  event: any;
}

export function BookingForm({ event }: BookingFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedTicket, setSelectedTicket] = useState<string>(
    event.ticketTypes?.[0]?.id || ''
  );
  const [attendeeName, setAttendeeName] = useState(user?.name || '');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const ticketType = event.ticketTypes?.find((t: any) => t.id === selectedTicket);
  const totalPrice = ticketType ? ticketType.price * quantity : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!user) {
      router.push(`/auth/login?callbackUrl=/events/${event.slug}`);
      return;
    }

    if (!attendeeName.trim()) {
      setError('Attendee name is required');
      return;
    }

    setLoading(true);
    try {
      const result = await createOrder({
        eventId: event.id,
        ticketTypeId: selectedTicket,
        quantity,
        attendees: Array.from({ length: quantity }, (_, i) => ({
          name: i === 0 ? attendeeName : `Guest ${i + 1}`,
        })),
      });

      if (result?.order) {
        sessionStorage.setItem('lastOrder', JSON.stringify(result.order));
      }
      setSuccess(true);
      router.push(`/payment-status?order=${result.order.orderNumber}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-surface p-5 text-center">
        <div className="text-2xl mb-2">🎉</div>
        <p className="text-lg font-semibold text-white">Booking created!</p>
        <p className="mt-1 text-sm text-text-secondary">Redirecting to payment...</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
      <h3 className="text-lg font-semibold text-white">Book Ticket</h3>

      {error && (
        <div className="mt-3 rounded-lg bg-error-bg px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {/* Ticket Type */}
        <div>
          <label className="mb-1.5 block text-sm text-text-secondary">Ticket Type</label>
          {event.ticketTypes?.map((ticket: any) => (
            <label
              key={ticket.id}
              className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 mb-2 transition-colors ${
                selectedTicket === ticket.id
                  ? 'border-primary bg-primary/5'
                  : 'border-[var(--color-border)] hover:bg-surface-hover'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="ticketType"
                  value={ticket.id}
                  checked={selectedTicket === ticket.id}
                  onChange={(e) => setSelectedTicket(e.target.value)}
                  className="h-4 w-4 accent-primary"
                />
                <div>
                  <p className="text-sm font-medium text-white">{ticket.name}</p>
                  {ticket.description && (
                    <p className="text-xs text-text-muted">{ticket.description}</p>
                  )}
                </div>
              </div>
              <span className="text-sm font-semibold text-primary">
                {ticket.price === 0 ? 'Free' : `₹${(ticket.price / 100).toLocaleString()}`}
              </span>
            </label>
          ))}
        </div>

        {/* Quantity */}
        {ticketType && ticketType.maxPerOrder > 1 && (
          <div>
            <label className="mb-1.5 block text-sm text-text-secondary">Quantity</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-text-secondary hover:bg-surface-hover disabled:opacity-50"
              >
                -
              </button>
              <span className="w-8 text-center text-sm text-white">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(Math.min(ticketType.maxPerOrder, quantity + 1))}
                disabled={quantity >= ticketType.maxPerOrder}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-text-secondary hover:bg-surface-hover disabled:opacity-50"
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* Attendee Name */}
        <div>
          <label className="mb-1.5 block text-sm text-text-secondary">Your Name</label>
          <input
            type="text"
            value={attendeeName}
            onChange={(e) => setAttendeeName(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2.5 text-sm text-white placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Enter your name"
            required
            minLength={2}
          />
        </div>

        {/* Total */}
        {ticketType && ticketType.price > 0 && (
          <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-3">
            <span className="text-sm text-text-secondary">Total</span>
            <span className="text-lg font-bold text-white">
              ₹{(totalPrice / 100).toLocaleString()}
            </span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary py-3 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {loading ? 'Booking...' : user ? 'Book Ticket' : 'Sign in to Book'}
        </button>
      </form>
    </div>
  );
}
