'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Check, X, Clock, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { updateBookingStatus } from '@/server/actions/bookings';
import { useToast } from '@/hooks/use-toast';
import type { BookingStatus } from '@/types';

export function BookingActions({
  bookingId,
  currentStatus,
}: {
  bookingId: string;
  currentStatus: BookingStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function handleStatusChange(status: BookingStatus) {
    setOpen(false);
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

  const isTerminal =
    currentStatus === 'COMPLETED' || currentStatus === 'CANCELLED' || currentStatus === 'NO_SHOW';

  if (isTerminal) return null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={isPending}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
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
  );
}
