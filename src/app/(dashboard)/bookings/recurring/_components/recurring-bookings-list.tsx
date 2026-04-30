'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Pause, Play, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { pauseRecurringBooking, deleteRecurringBooking } from '@/server/actions/recurring';
import { DAYS_OF_WEEK } from '@/lib/constants';

type RecurringRow = {
  id: string;
  clientName: string;
  serviceName: string;
  stylistName: string;
  intervalWeeks: number;
  dayOfWeek: number;
  preferredTime: string;
  isActive: boolean;
  nextRunDate: string;
};

export function RecurringBookingsList({ bookings }: { bookings: RecurringRow[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handlePause(id: string, pause: boolean) {
    startTransition(async () => {
      const result = await pauseRecurringBooking(id, pause);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(pause ? 'Paused' : 'Resumed');
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteRecurringBooking(id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('Deleted');
      router.refresh();
    });
  }

  if (bookings.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">No recurring bookings.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Client</TableHead>
          <TableHead>Service</TableHead>
          <TableHead>Stylist</TableHead>
          <TableHead>Frequency</TableHead>
          <TableHead>Day & Time</TableHead>
          <TableHead>Next Run</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-24" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookings.map((b) => (
          <TableRow key={b.id}>
            <TableCell className="font-medium">{b.clientName}</TableCell>
            <TableCell>{b.serviceName}</TableCell>
            <TableCell>{b.stylistName}</TableCell>
            <TableCell>
              Every {b.intervalWeeks} week{b.intervalWeeks !== 1 ? 's' : ''}
            </TableCell>
            <TableCell>
              {DAYS_OF_WEEK[b.dayOfWeek]} {b.preferredTime}
            </TableCell>
            <TableCell>{format(new Date(b.nextRunDate), 'd MMM yyyy')}</TableCell>
            <TableCell>
              <Badge variant={b.isActive ? 'default' : 'secondary'}>
                {b.isActive ? 'Active' : 'Paused'}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handlePause(b.id, b.isActive)}
                  title={b.isActive ? 'Pause' : 'Resume'}
                >
                  {b.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleDelete(b.id)}
                  title="Delete"
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
