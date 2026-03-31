'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from '@/lib/constants';
import { formatPrice } from '@/lib/utils';
import { BookingActions } from './booking-actions';
import type { BookingStatus } from '@/types';

type BookingRow = {
  id: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  clientName: string;
  serviceName: string;
  stylistName: string;
  price: number | null;
};

export function BookingList({ bookings }: { bookings: BookingRow[] }) {
  if (bookings.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">No bookings for this date.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Time</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Service</TableHead>
          <TableHead>Stylist</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookings.map((b) => (
          <TableRow key={b.id}>
            <TableCell className="font-mono text-sm">
              <Link href={`/bookings/${b.id}`} className="hover:underline">
                {format(new Date(b.startTime), 'HH:mm')}–{format(new Date(b.endTime), 'HH:mm')}
              </Link>
            </TableCell>
            <TableCell>{b.clientName}</TableCell>
            <TableCell>{b.serviceName}</TableCell>
            <TableCell>{b.stylistName}</TableCell>
            <TableCell>{b.price != null ? formatPrice(b.price) : '—'}</TableCell>
            <TableCell>
              <Badge className={BOOKING_STATUS_COLORS[b.status]} variant="secondary">
                {BOOKING_STATUS_LABELS[b.status]}
              </Badge>
            </TableCell>
            <TableCell>
              <BookingActions bookingId={b.id} currentStatus={b.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
