'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Clock, UserX, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { updateBookingStatus, rescheduleBooking } from '@/server/actions/bookings';
import { useToast } from '@/hooks/use-toast';
import type { BookingStatus } from '@/types';

export function BookingDetailActions({
  bookingId,
  currentStatus,
}: {
  bookingId: string;
  currentStatus: BookingStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDateTime, setNewDateTime] = useState('');

  const isTerminal =
    currentStatus === 'COMPLETED' || currentStatus === 'CANCELLED' || currentStatus === 'NO_SHOW';

  function handleStatus(status: BookingStatus) {
    startTransition(async () => {
      const result = await updateBookingStatus(bookingId, status);
      if (!result.success) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
        return;
      }
      toast({ title: 'Updated', description: `Booking marked as ${status.toLowerCase()}` });
      router.refresh();
    });
  }

  function handleReschedule() {
    if (!newDateTime) return;
    startTransition(async () => {
      const result = await rescheduleBooking(bookingId, new Date(newDateTime).toISOString());
      if (!result.success) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
        return;
      }
      toast({ title: 'Rescheduled', description: 'Booking time updated' });
      setShowReschedule(false);
      router.refresh();
    });
  }

  if (isTerminal) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => handleStatus('COMPLETED')} disabled={isPending}>
            <Check className="mr-2 h-4 w-4" />
            Complete
          </Button>
          <Button
            variant="outline"
            onClick={() => handleStatus('IN_PROGRESS')}
            disabled={isPending}
          >
            <Clock className="mr-2 h-4 w-4" />
            In Progress
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowReschedule(!showReschedule)}
            disabled={isPending}
          >
            <CalendarClock className="mr-2 h-4 w-4" />
            Reschedule
          </Button>
          <Button variant="outline" onClick={() => handleStatus('NO_SHOW')} disabled={isPending}>
            <UserX className="mr-2 h-4 w-4" />
            No Show
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleStatus('CANCELLED')}
            disabled={isPending}
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </div>

        {showReschedule && (
          <div className="flex items-end gap-2 pt-2">
            <div className="flex-1">
              <Label>New date & time</Label>
              <Input
                type="datetime-local"
                value={newDateTime}
                onChange={(e) => setNewDateTime(e.target.value)}
              />
            </div>
            <Button onClick={handleReschedule} disabled={isPending || !newDateTime}>
              Confirm
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
