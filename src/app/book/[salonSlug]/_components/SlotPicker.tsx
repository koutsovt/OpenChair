'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { getPublicAvailableSlots } from '@/server/actions/public-booking';

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

    startTransition(async () => {
      const result = await getPublicAvailableSlots(
        salonSlug,
        stylistId,
        serviceId,
        date.toISOString()
      );
      setSlots(result);
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
        <p className="text-sm text-muted-foreground">No available slots on this date.</p>
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
