'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { getPublicAvailableSlots, getAlternativeSlots } from '@/server/actions/public-booking';
import { AlternativeSlots } from './AlternativeSlots';
import type { AlternativeSlot } from '@/types';

interface SlotPickerProps {
  salonSlug: string;
  stylistId: string;
  serviceId: string;
  availableDays: number[];
}

export function SlotPicker({ salonSlug, stylistId, serviceId, availableDays }: SlotPickerProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [slots, setSlots] = useState<{ start: string; end: string }[]>([]);
  const [alternatives, setAlternatives] = useState<AlternativeSlot[]>([]);
  const [isPending, startTransition] = useTransition();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function isDateDisabled(date: Date): boolean {
    if (date < today) return true;
    return !availableDays.includes(date.getDay());
  }

  function handleDateSelect(date: Date | undefined) {
    if (!date) return;
    setSelectedDate(date);
    setSelectedSlot(null);
    setSlots([]);
    setAlternatives([]);

    startTransition(async () => {
      const result = await getPublicAvailableSlots(
        salonSlug,
        stylistId,
        serviceId,
        date.toISOString()
      );
      setSlots(result);

      // If no slots on this day, fetch nearby alternatives cross-stylist.
      if (result.length === 0) {
        const alts = await getAlternativeSlots(salonSlug, stylistId, serviceId, date);
        setAlternatives(alts);
      }
    });
  }

  function handleSlotSelect(slotStart: string) {
    setSelectedSlot(slotStart);
  }

  function handleContinue() {
    if (!selectedSlot) return;
    const searchParams = new URLSearchParams({
      serviceId,
      stylistId,
      startTime: selectedSlot,
    });
    router.push(`/book/${salonSlug}/confirm?${searchParams.toString()}`);
  }

  return (
    <div className="space-y-6">
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={handleDateSelect}
        disabled={isDateDisabled}
        className="rounded-md border"
      />

      {isPending && <p className="text-sm text-muted-foreground">Loading available times…</p>}

      {selectedDate && !isPending && slots.length === 0 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            No available slots on {format(selectedDate, 'EEEE, MMMM d')}.
          </p>
          <AlternativeSlots
            alternatives={alternatives}
            salonSlug={salonSlug}
            serviceId={serviceId}
            preferredDate={selectedDate.toISOString()}
            preferredStylistId={stylistId}
            heading={alternatives.length > 0 ? 'Next available times' : undefined}
          />
        </div>
      )}

      {slots.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium">
            Available times for {format(selectedDate!, 'EEEE, MMMM d')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {slots.map((slot) => (
              <Button
                key={slot.start}
                variant={selectedSlot === slot.start ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSlotSelect(slot.start)}
              >
                {format(new Date(slot.start), 'h:mm a')}
              </Button>
            ))}
          </div>
        </div>
      )}

      {selectedSlot && (
        <Button onClick={handleContinue} className="w-full">
          Continue
        </Button>
      )}
    </div>
  );
}
