'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface RegistrationFlowProps {
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  venueName: string;
  venueAddress: string;
  coverImageUrl: string | null;
  ticketType: string;
  capacity: number;
  spotsLeft: number;
  upiId?: string | null;
  upiQrCodeUrl?: string | null;
}

const BOOKING_TYPES = [
  { value: 'SOLO', label: 'Solo', icon: '1', desc: 'Just me' },
  { value: 'DUO', label: 'Duo', icon: '2', desc: 'Me + 1' },
  { value: 'TRIO', label: 'Trio', icon: '3', desc: 'Me + 2' },
  { value: 'GROUP', label: 'Group', icon: '4+', desc: 'Bring the crew' },
];

interface AttendeeField {
  id: number;
  fullName: string;
  email: string;
}

export function RegistrationFlow({
  eventId,
  eventSlug,
  spotsLeft,
  ticketType,
  upiId,
  upiQrCodeUrl,
}: RegistrationFlowProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [step, setStep] = useState<'select' | 'form' | 'confirm' | 'done'>('select');
  const [bookingType, setBookingType] = useState('SOLO');
  const [attendees, setAttendees] = useState<AttendeeField[]>([
    { id: 1, fullName: session?.user?.name || '', email: session?.user?.email || '' },
  ]);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [utrError, setUtrError] = useState('');
  const [orderResult, setOrderResult] = useState<{ orderNumber: string; bookingType: string; attendeeCount: number; isUtrPayment?: boolean; message?: string } | null>(null);

  // For paid events, require UTR number

  if (status === 'loading') {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-8 w-24 rounded bg-surface-elevated" />
        <div className="h-12 rounded-lg bg-surface-elevated" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="space-y-4">
        <Button className="w-full" size="lg" onClick={() => router.push(`/auth/login?callbackUrl=/events/${eventSlug}`)}>
          Sign in to register
        </Button>
        <p className="text-center text-xs text-text-muted">You need an account to register for events.</p>
      </div>
    );
  }

  if (spotsLeft <= 0) {
    return (
      <div className="rounded-lg border border-error/30 bg-error-bg p-4 text-center">
        <p className="text-sm font-medium text-error">Event full</p>
        <p className="mt-1 text-xs text-error/80">All spots have been filled.</p>
      </div>
    );
  }

  function handleSelectType(type: string) {
    setBookingType(type);
    const count = type === 'SOLO' ? 1 : type === 'DUO' ? 2 : type === 'TRIO' ? 3 : 4;
    setAttendees(
      Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        fullName: i === 0 ? session?.user?.name || '' : '',
        email: i === 0 ? session?.user?.email || '' : '',
      }))
    );
    setStep('form');
    setError('');
    setFieldErrors({});
  }

  function updateAttendee(id: number, field: 'fullName' | 'email', value: string) {
    setAttendees((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
  }

  async function handleSubmit() {
    setError('');
    setFieldErrors({});
    setUtrError('');

    // Validate all attendees have names
    const errors: Record<string, string> = {};
    attendees.forEach((a, i) => {
      if (!a.fullName || a.fullName.length < 2) {
        errors[`attendee_${a.id}_name`] = `Attendee ${i + 1} name is required`;
      }
    });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    // Validate UTR for paid events
    if (ticketType === 'PAID') {
      const cleaned = utrNumber.replace(/\s/g, '');
      if (!cleaned || !/^\d{12}$/.test(cleaned)) {
        setUtrError('Please enter a valid 12-digit UTR/Ref number from your UPI payment.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const body: Record<string, unknown> = {
        eventId,
        bookingType,
        attendees: attendees.map((a) => ({
          fullName: a.fullName,
          email: a.email || session?.user?.email,
        })),
      };

      // Include UTR number for paid events
      if (ticketType === 'PAID') {
        body.utrNumber = utrNumber.replace(/\s/g, '');
      }

      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
          setError(data.error || 'Registration failed');
        }
        setIsSubmitting(false);
        return;
      }

      setOrderResult({
        orderNumber: data.order.orderNumber,
        bookingType: data.order.bookingType,
        attendeeCount: data.order.attendeeCount,
        isUtrPayment: data.isUtrPayment,
        message: data.message,
      });
      setStep('done');
      router.refresh();
    } catch {
      setError('An unexpected error occurred');
      setIsSubmitting(false);
    }
  }

  if (step === 'done' && orderResult) {
    if (orderResult.isUtrPayment) {
      return (
        <div className="rounded-xl border border-warning/30 bg-warning-bg p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning/20">
            <svg className="h-7 w-7 text-warning" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-warning">Payment Pending Verification</h3>
          <p className="mt-1 text-sm text-warning/80">
            {orderResult.bookingType === 'SOLO' ? 'Solo' : orderResult.bookingType === 'DUO' ? 'Duo' : orderResult.bookingType === 'TRIO' ? 'Trio' : 'Group'} booking submitted
          </p>
          <p className="mt-2 text-xs text-warning/60">Order: {orderResult.orderNumber}</p>
          <div className="mt-3 rounded-lg bg-warning/10 p-3 text-xs text-warning/80">
            <p>Your UTR number has been submitted for verification. The organizer will verify your payment and confirm your tickets.</p>
            <p className="mt-1.5 font-medium">Please keep a screenshot of your payment as proof.</p>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <Button variant="secondary" size="sm" onClick={() => router.push('/events')}>
              Browse more events
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-success/30 bg-success-bg p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/20">
          <svg className="h-7 w-7 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-semibold text-success">You&apos;re in!</h3>
        <p className="mt-1 text-sm text-success/80">
          {orderResult.bookingType === 'SOLO' ? 'Solo' : orderResult.bookingType === 'DUO' ? 'Duo' : orderResult.bookingType === 'TRIO' ? 'Trio' : 'Group'} booking confirmed
        </p>
        <p className="mt-2 text-xs text-success/60">Order: {orderResult.orderNumber}</p>
        <div className="mt-4 flex flex-col gap-2">
          <Button size="sm" onClick={() => router.push('/tickets')}>
            View my tickets
          </Button>
          <Button variant="secondary" size="sm" onClick={() => router.push('/events')}>
            Browse more events
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-white">Confirm your booking</h3>
        <div className="rounded-lg border border-[var(--color-border)] bg-surface-elevated p-3">
          <p className="text-xs text-text-muted">
            {bookingType} &bull; {attendees.length} {attendees.length === 1 ? 'attendee' : 'attendees'}
          </p>
          <div className="mt-2 space-y-1">
            {attendees.map((a, i) => (
              <p key={a.id} className="text-sm text-white">
                {i + 1}. {a.fullName}
              </p>
            ))}
          </div>
          {utrNumber && ticketType === 'PAID' && (
            <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-2.5">
              <p className="text-xs text-text-muted">UTR/Ref Number</p>
              <p className="font-mono text-sm font-medium text-primary">{utrNumber}</p>
            </div>
          )}
        </div>

        {/* Terms and no-refund policy */}
        <div className="rounded-lg border border-[var(--color-border)] bg-surface p-3">
          <p className="text-xs font-medium text-white mb-2">Before you confirm:</p>
          <ul className="space-y-1.5 text-xs text-text-muted">
            <li>✓ Tickets are non-refundable and non-transferable once confirmed.</li>
            <li>✓ Entry is subject to venue rules and event terms.</li>
            <li>✓ Your details will be used for event entry only.</li>
            {ticketType === 'PAID' && (
              <li>✓ Your UTR number will be verified against the organizer&apos;s bank statement before tickets are confirmed.</li>
            )}
          </ul>
          <label className="mt-3 flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-[var(--color-border)] bg-surface text-primary focus:ring-primary"
            />
            <span className="text-xs text-text-secondary">
              I accept the event terms, no-refund policy, entry rules, and privacy policy.
            </span>
          </label>
        </div>

        {error && (
          <p className="text-xs text-error" role="alert">{error}</p>
        )}
        <div className="flex gap-2">
          <Button className="flex-1" size="lg" isLoading={isSubmitting} disabled={!acceptedTerms} onClick={handleSubmit}>
            {ticketType === 'PAID' ? 'Submit for verification' : 'Confirm registration'}
          </Button>
          <Button variant="secondary" size="lg" onClick={() => setStep('form')}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'form') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">
            {bookingType === 'SOLO' ? 'Your details' : `${bookingType} attendee details`}
          </h3>
          <button onClick={() => setStep('select')} className="text-xs text-text-muted hover:text-white transition-colors">
            Change type
          </button>
        </div>

        <div className="space-y-3">
          {attendees.map((attendee, i) => (
            <div key={attendee.id} className="space-y-2 rounded-lg border border-[var(--color-border)] bg-surface-elevated p-3">
              <p className="text-xs font-medium text-text-muted">Attendee {i + 1}</p>
              <Input
                label="Full name"
                placeholder="Enter name"
                value={attendee.fullName}
                onChange={(e) => updateAttendee(attendee.id, 'fullName', e.target.value)}
                error={fieldErrors[`attendee_${attendee.id}_name`]}
              />
              {i > 0 && (
                <Input
                  label="Email (optional)"
                  type="email"
                  placeholder="email@example.com"
                  value={attendee.email}
                  onChange={(e) => updateAttendee(attendee.id, 'email', e.target.value)}
                />
              )}
            </div>
          ))}

          {/* UTR Number input for paid events */}
          {ticketType === 'PAID' && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-lg">💳</span>
                <p className="text-sm font-medium text-white">UPI Payment Verification</p>
              </div>

              {/* UPI Payment Details */}
              <div className="mb-4 flex flex-col items-center gap-3 rounded-lg bg-surface-elevated p-4">
                {upiQrCodeUrl && (
                  <img
                    src={upiQrCodeUrl}
                    alt="UPI QR Code"
                    className="h-32 w-32 rounded-lg border border-[var(--color-border)] object-contain bg-white"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                {upiId && (
                  <div className="text-center">
                    <p className="text-xs text-text-muted">Pay to UPI ID:</p>
                    <p className="mt-0.5 font-mono text-sm font-bold text-primary">{upiId}</p>
                  </div>
                )}
                {!upiId && !upiQrCodeUrl && (
                  <p className="text-xs text-text-muted">
                    Pay the ticket amount to the organizer&apos;s UPI ID (contact organizer for details).
                  </p>
                )}
              </div>

              <p className="mb-3 text-xs text-text-muted">
                After making the payment, enter the 12-digit UTR/Ref number from your payment confirmation below.
              </p>
              <Input
                label="UTR / Ref Number"
                placeholder="Enter your 12-digit UTR number"
                value={utrNumber}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/[^\d]/g, '').slice(0, 12);
                  setUtrNumber(cleaned);
                  if (utrError) setUtrError('');
                }}
                error={utrError}
                maxLength={12}
              />
              <p className="mt-1.5 text-[10px] text-text-muted">
                Your UTR is a 12-digit number in your payment confirmation (e.g., 123456789012)
              </p>
            </div>
          )}
        </div>

        {error && (
          <p className="text-xs text-error" role="alert">{error}</p>
        )}

        <div className="flex gap-2">
          <Button className="flex-1" size="lg" onClick={() => setStep('confirm')}>
            Continue
          </Button>
          <Button variant="secondary" size="lg" onClick={() => setStep('select')}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  // Step: select booking type
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-white">How many?</h3>
      <div className="grid grid-cols-2 gap-2">
        {BOOKING_TYPES.map((type) => {
          const isAvailable = type.value === 'GROUP' ? spotsLeft >= 4 : spotsLeft >= parseInt(type.icon);
          return (
            <button
              key={type.value}
              onClick={() => isAvailable && handleSelectType(type.value)}
              disabled={!isAvailable}
              className={`rounded-lg border p-3 text-left transition-all ${
                !isAvailable
                  ? 'border-[var(--color-border)] opacity-40 cursor-not-allowed'
                  : 'border-[var(--color-border)] hover:border-primary/30 hover:bg-surface-hover'
              }`}
            >
              <div className="text-lg font-bold text-white">
                {type.value === 'GROUP' ? '4+' : type.icon}
              </div>
              <div className="text-sm font-medium text-white">{type.label}</div>
              <div className="text-xs text-text-muted">{type.desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
