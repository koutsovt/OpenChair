'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Check, X, Clock, UserX, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { updateBookingStatus } from '@/server/actions/bookings';
import { toast } from 'sonner';
import { RescheduleDialog } from './reschedule-dialog';
import type { BookingStatus } from '@/types';

export function BookingActions({
  bookingId,
  currentStatus,
  serviceId,
  serviceDuration,
  stylistId,
  startTime,
}: {
  bookingId: string;
  currentStatus: BookingStatus;
  serviceId?: string;
  serviceDuration?: number;
  stylistId?: string;
  startTime?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);

  function handleStatusChange(status: BookingStatus) {
    setOpen(false);
    startTransition(async () => {
      const result = await updateBookingStatus(bookingId, status);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`Booking marked as ${status.toLowerCase()}`);
      router.refresh();
    });
  }

  const isTerminal =
    currentStatus === 'COMPLETED' || currentStatus === 'CANCELLED' || currentStatus === 'NO_SHOW';

  if (isTerminal) return null;

  const canReschedule = serviceId && serviceDuration && stylistId && startTime;

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={isPending}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canReschedule && (
            <DropdownMenuItem
              onClick={() => {
                setOpen(false);
                setRescheduleOpen(true);
              }}
            >
              <CalendarClock className="mr-2 h-4 w-4" />
              Reschedule
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => handleStatusChange('COMPLETED')}>
            <Check className="mr-2 h-4 w-4" />
            Mark Complete
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleStatusChange('IN_PROGRESS')}>
            <Clock className="mr-2 h-4 w-4" />
            In Progress
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleStatusChange('NO_SHOW')}>
            <UserX className="mr-2 h-4 w-4" />
            No Show
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleStatusChange('CANCELLED')}
            className="text-destructive"
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {canReschedule && (
        <RescheduleDialog
          open={rescheduleOpen}
          onOpenChange={setRescheduleOpen}
          bookingId={bookingId}
          currentStartTime={startTime}
          serviceDuration={serviceDuration}
          serviceId={serviceId}
          stylistId={stylistId}
        />
      )}
    </>
  );
}
