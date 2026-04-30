'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { X } from 'lucide-react';
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
import { cancelWaitlistEntry } from '@/server/actions/waitlist';
import type { WaitlistStatus } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  WAITING: 'bg-yellow-100 text-yellow-800',
  NOTIFIED: 'bg-blue-100 text-blue-800',
  BOOKED: 'bg-green-100 text-green-800',
  EXPIRED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

type WaitlistRow = {
  id: string;
  clientName: string;
  serviceName: string;
  stylistName: string;
  status: WaitlistStatus;
  preferredDateStart: string;
  preferredDateEnd: string;
  preferredTimeStart: string | null;
  preferredTimeEnd: string | null;
  createdAt: string;
  expiresAt: string;
};

export function WaitlistEntriesList({ entries }: { entries: WaitlistRow[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleCancel(id: string) {
    startTransition(async () => {
      const result = await cancelWaitlistEntry(id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('Cancelled');
      router.refresh();
    });
  }

  if (entries.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">No waitlist entries.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Client</TableHead>
          <TableHead>Service</TableHead>
          <TableHead>Stylist</TableHead>
          <TableHead>Date Range</TableHead>
          <TableHead>Time Pref</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Expires</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((e) => (
          <TableRow key={e.id}>
            <TableCell className="font-medium">{e.clientName}</TableCell>
            <TableCell>{e.serviceName}</TableCell>
            <TableCell>{e.stylistName}</TableCell>
            <TableCell className="text-sm">
              {format(new Date(e.preferredDateStart), 'd MMM')} –{' '}
              {format(new Date(e.preferredDateEnd), 'd MMM')}
            </TableCell>
            <TableCell className="text-sm">
              {e.preferredTimeStart && e.preferredTimeEnd
                ? `${e.preferredTimeStart}–${e.preferredTimeEnd}`
                : 'Any'}
            </TableCell>
            <TableCell>
              <Badge className={STATUS_COLORS[e.status]} variant="secondary">
                {e.status}
              </Badge>
            </TableCell>
            <TableCell className="text-sm">
              {format(new Date(e.expiresAt), 'd MMM HH:mm')}
            </TableCell>
            <TableCell>
              {e.status === 'WAITING' && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleCancel(e.id)}
                  className="text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
