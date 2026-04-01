'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { rescheduleBooking, getAvailableSlotsAction } from '@/server/actions/bookings';

interface RescheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  currentStartTime: string;
  serviceDuration: number;
  serviceId: string;
  stylistId: string;
}

export function RescheduleDialog({
  open,
  onOpenChange,
  bookingId,
  currentStartTime,
  serviceDuration: _serviceDuration,
  serviceId,
  stylistId,
}: RescheduleDialogProps) {
  const [date, setDate] = useState<Date | undefined>(new Date(currentStartTime));
  const [slots, setSlots] = useState<{ start: string; end: string }[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!open || !date) return;
    setLoadingSlots(true);
    setSelectedSlot('');
    getAvailableSlotsAction(stylistId, serviceId, date.toISOString())
      .then(setSlots)
      .finally(() => setLoadingSlots(false));
  }, [open, date, stylistId, serviceId]);

  function handleConfirm() {
    if (!selectedSlot) return;
    startTransition(async () => {
      const result = await rescheduleBooking(bookingId, selectedSlot);
      if (!result.success) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
        return;
      }
      toast({ title: 'Rescheduled', description: 'Booking time updated' });
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reschedule Booking</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
          />

          {loadingSlots && (
            <p className="text-sm text-muted-foreground">Loading available times…</p>
          )}

          {!loadingSlots && date && slots.length === 0 && (
            <p className="text-sm text-muted-foreground">No available slots on this date.</p>
          )}

          {slots.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {slots.map((s) => (
                <Button
                  key={s.start}
                  variant={selectedSlot === s.start ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedSlot(s.start)}
                >
                  {format(new Date(s.start), 'HH:mm')}
                </Button>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={!selectedSlot || isPending}>
              {isPending ? 'Rescheduling…' : 'Confirm'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
