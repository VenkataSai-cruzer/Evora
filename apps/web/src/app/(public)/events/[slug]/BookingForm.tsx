'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-provider';
import { createOrder } from '@/lib/api-client';

interface AttendeeField {
  name: string;
  email: string;
  phone: string;
}

interface BookingFormProps {
  event: any;
}

export function BookingForm({ event }: BookingFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedTicket, setSelectedTicket] = useState<string>(
    event.ticketTypes?.[0]?.id || '',
  );
  const [quantity, setQuantity] = useState(1);
  const [attendees, setAttendees] = useState<AttendeeField[]>([
    { name: user?.name || '', email: user?.email || '', phone: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const ticketType = event.ticketTypes?.find((t: any) => t.id === selectedTicket);
  const totalPrice = ticketType ? ticketType.price * quantity : 0;

  /** Update attendee fields when quantity changes */
  function updateQuantity(newQty: number) {
    setQuantity(newQty);
    setAttendees((prev) => {
      if (newQty > prev.length) {
        const additions = Array.from({ length: newQty - prev.length }, () => ({
          name: '',
          email: '',
          phone: '',
        }));
        return [...prev, ...additions];
      }
      return prev.slice(0, newQty);
    });
  }

  /** Update a specific attendee field */
  function updateAttendee(index: number, field: keyof AttendeeField, value: string) {
    setAttendees((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!user) {
      router.push(`/auth/login?callbackUrl=/events/${event.slug}`);
      return;
    }

    // Validate all attendee names
    for (let i = 0; i < attendees.length; i++) {
      if (!attendees[i].name.trim()) {
        setError(`Attendee ${i + 1} name is required`);
        return;
      }
    }

    setLoading(true);
    try {
      const result = await createOrder({
        eventId: event.id,
        ticketTypeId: selectedTicket,
        quantity,
        attendees: attendees.map((a) => ({
          name: a.name.trim(),
          email: a.email.trim() || undefined,
          phone: a.phone.trim() || undefined,
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
      <h3 className="text-lg font-semibold text-white">Book Tickets</h3>

      {error && (
        <div className="mt-3 rounded-lg bg-error-bg px-4 py-3 text-sm text-error">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-6">
        {/* ── Step 1: Ticket Type ─────────────────────── */}
        <div>
          <label className="mb-2 block text-sm font-medium text-text-secondary">
            1. Select Ticket Type
          </label>
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

        {/* ── Step 2: Quantity ────────────────────────── */}
        {ticketType && ticketType.maxPerOrder > 1 && (
          <div>
            <label className="mb-2 block text-sm font-medium text-text-secondary">
              2. Select Quantity
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => updateQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-text-secondary hover:bg-surface-hover disabled:opacity-50"
              >
                -
              </button>
              <span className="w-8 text-center text-sm font-semibold text-white">{quantity}</span>
              <button
                type="button"
                onClick={() => updateQuantity(Math.min(ticketType.maxPerOrder, quantity + 1))}
                disabled={quantity >= ticketType.maxPerOrder}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-text-secondary hover:bg-surface-hover disabled:opacity-50"
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Attendee Details ────────────────── */}
        {quantity > 0 && (
          <div>
            <label className="mb-2 block text-sm font-medium text-text-secondary">
              3. Attendee Details
            </label>
            <p className="mb-3 text-xs text-text-muted">
              Enter details for each attendee. Each person will receive their own ticket with a unique QR code.
            </p>
            <div className="space-y-4">
              {attendees.map((attendee, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-[var(--color-border)] bg-surface-elevated p-4"
                >
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Attendee {index + 1}
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs text-text-secondary">
                        Full Name <span className="text-error">*</span>
                      </label>
                      <input
                        type="text"
                        value={attendee.name}
                        onChange={(e) => updateAttendee(index, 'name', e.target.value)}
                        className="w-full rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2.5 text-sm text-white placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder={`Attendee ${index + 1} name`}
                        required
                        minLength={2}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs text-text-secondary">Email</label>
                        <input
                          type="email"
                          value={attendee.email}
                          onChange={(e) => updateAttendee(index, 'email', e.target.value)}
                          className="w-full rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2.5 text-sm text-white placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="Email (optional)"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-text-secondary">Phone</label>
                        <input
                          type="tel"
                          value={attendee.phone}
                          onChange={(e) => updateAttendee(index, 'phone', e.target.value)}
                          className="w-full rounded-lg border border-[var(--color-border)] bg-surface px-3 py-2.5 text-sm text-white placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="Phone (optional)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Total ───────────────────────────────────── */}
        {ticketType && ticketType.price > 0 && (
          <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
            <span className="text-sm text-text-secondary">
              Total ({quantity} ticket{quantity !== 1 ? 's' : ''})
            </span>
            <span className="text-xl font-bold text-white">
              ₹{(totalPrice / 100).toLocaleString()}
            </span>
          </div>
        )}

        {/* ── Submit ──────────────────────────────────── */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary py-3 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {loading
            ? 'Booking...'
            : user
              ? `Book ${quantity} Ticket${quantity !== 1 ? 's' : ''}`
              : 'Sign in to Book'}
        </button>
      </form>
    </div>
  );
}
