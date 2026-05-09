'use client';

import { useState, useTransition } from 'react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { joinPublicWaitlist } from '@/server/actions/public-booking';
import type { AlternativeSlot } from '@/types';

interface AlternativeSlotsProps {
  alternatives: AlternativeSlot[];
  salonSlug: string;
  serviceId: string;
  /** ISO string of the date the guest originally wanted (for waitlist) */
  preferredDate: string;
  /** Stylist the guest originally requested (for waitlist) */
  preferredStylistId: string;
  heading?: string;
}

export function AlternativeSlots({
  alternatives,
  salonSlug,
  serviceId,
  preferredDate,
  preferredStylistId,
  heading = 'Next available times',
}: AlternativeSlotsProps) {
  const router = useRouter();
  const [waitlistPending, startWaitlist] = useTransition();
  const [waitlistState, setWaitlistState] = useState<'idle' | 'form' | 'success' | 'error'>('idle');
  const [waitlistError, setWaitlistError] = useState<string | null>(null);

  function handleSlotClick(slot: AlternativeSlot) {
    const params = new URLSearchParams({
      serviceId,
      stylistId: slot.stylistId,
      startTime: slot.start,
    });
    router.push(`/book/${salonSlug}/confirm?${params.toString()}`);
  }

  function handleWaitlistSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const contactName = (fd.get('contactName') as string).trim();
    const contactPhone = (fd.get('contactPhone') as string).trim();

    setWaitlistError(null);
    startWaitlist(async () => {
      const result = await joinPublicWaitlist({
        salonSlug,
        stylistId: preferredStylistId,
        serviceId,
        preferredDate,
        contactName,
        contactPhone,
      });
      if (result.success) {
        setWaitlistState('success');
      } else {
        setWaitlistError(result.error);
        setWaitlistState('error');
      }
    });
  }

  return (
    <div className="space-y-4">
      {alternatives.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-foreground">{heading}</h3>
          <div className="space-y-2">
            {alternatives.map((slot) => (
              <button
                key={`${slot.stylistId}:${slot.start}`}
                type="button"
                onClick={() => handleSlotClick(slot)}
                className="flex w-full items-center justify-between rounded-lg border bg-background px-4 py-3 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <span className="font-medium">
                  {format(new Date(slot.start), 'EEE d MMM · h:mm a')}
                </span>
                <span className="text-muted-foreground">with {slot.stylistName}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-t pt-4">
        {waitlistState === 'success' ? (
          <p className="text-sm font-medium text-green-700">
            ✓ You&apos;re on the waitlist! The salon will contact you when a slot opens up.
          </p>
        ) : waitlistState === 'form' || waitlistState === 'error' ? (
          <form onSubmit={handleWaitlistSubmit} className="space-y-3">
            <p className="text-sm font-medium">Join the waitlist</p>
            <input
              name="contactName"
              type="text"
              required
              placeholder="Your name"
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              name="contactPhone"
              type="tel"
              required
              placeholder="Phone number"
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {waitlistError && <p className="text-xs text-red-600">{waitlistError}</p>}
            <Button type="submit" variant="outline" size="sm" disabled={waitlistPending}>
              {waitlistPending ? 'Joining…' : 'Join waitlist'}
            </Button>
          </form>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setWaitlistState('form')}
          >
            None of these work? Join the waitlist →
          </Button>
        )}
      </div>
    </div>
  );
}
