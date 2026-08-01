'use client';

import { useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Check, X, Clock, UserX, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { updateBookingStatus } from '@/server/actions/bookings';
import { RescheduleDialog } from './reschedule-dialog';
import type { BookingStatus } from '@/types';

/**
 * Status-change menu for an active (non-terminal) appointment, opened by
 * clicking/tapping the booking itself. Same actions and copy as
 * BookingActions (the "..." column in the list view) — Reschedule, Mark
 * Complete, In Progress, No Show, Cancel — just surfaced differently: the
 * compact timeline block has no room for a dedicated button, so the whole
 * block is the trigger, anchored to wherever it was clicked/tapped.
 *
 * Uses a render prop (mirrors PastBookingMenu) so the caller keeps ownership
 * of the block element; we only attach an onClick handler and an off-screen
 * anchored trigger portalled to <body>.
 */
export function ActiveBookingMenu({
  bookingId,
  serviceId,
  serviceDuration,
  stylistId,
  startTime,
  children,
}: {
  bookingId: string;
  serviceId?: string;
  serviceDuration?: number;
  stylistId?: string;
  startTime?: string;
  children: (props: { onClick: (e: React.MouseEvent) => void }) => React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [point, setPoint] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onClick = (e: React.MouseEvent) => {
    setPoint({ x: e.clientX, y: e.clientY });
    setOpen(true);
  };

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

  const canReschedule = serviceId && serviceDuration && stylistId && startTime;

  const menu =
    typeof document !== 'undefined'
      ? createPortal(
          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
              <span
                aria-hidden
                style={{ position: 'fixed', left: point.x, top: point.y, width: 0, height: 0 }}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {canReschedule && (
                <DropdownMenuItem
                  onSelect={() => {
                    setOpen(false);
                    setRescheduleOpen(true);
                  }}
                >
                  <CalendarClock className="mr-2 h-4 w-4" />
                  Reschedule
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                disabled={isPending}
                onSelect={() => handleStatusChange('COMPLETED')}
              >
                <Check className="mr-2 h-4 w-4" />
                Mark Complete
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={isPending}
                onSelect={() => handleStatusChange('IN_PROGRESS')}
              >
                <Clock className="mr-2 h-4 w-4" />
                In Progress
              </DropdownMenuItem>
              <DropdownMenuItem disabled={isPending} onSelect={() => handleStatusChange('NO_SHOW')}>
                <UserX className="mr-2 h-4 w-4" />
                No Show
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={isPending}
                onSelect={() => handleStatusChange('CANCELLED')}
                className="text-destructive"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>,
          document.body
        )
      : null;

  return (
    <>
      {children({ onClick })}
      {menu}
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
