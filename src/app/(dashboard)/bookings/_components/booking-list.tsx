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
import { bookingStatusStyle } from '@/lib/booking-status-styles';
import { formatPrice } from '@/lib/utils';
import { Repeat } from 'lucide-react';
import { BookingActions } from './booking-actions';
import { PastBookingMenu, type PastBookingMenuProps } from './past-booking-menu';
import type { BookingStatus } from '@/types';

const TERMINAL_STATUSES: BookingStatus[] = ['COMPLETED', 'CANCELLED', 'NO_SHOW'];

type BookingRow = {
  id: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  clientName: string;
  serviceName: string;
  stylistName: string;
  stylistId: string;
  serviceId: string;
  serviceDuration: number;
  price: number | null;
  isRecurring?: boolean;
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
        {bookings.map((b) => {
          const isPast = TERMINAL_STATUSES.includes(b.status);
          const renderRow = (menuProps?: PastBookingMenuProps) => (
            <TableRow
              key={b.id}
              {...menuProps}
              className={menuProps ? 'cursor-context-menu' : undefined}
              // Long-press opens our own menu — suppress iOS's native
              // text-selection callout so it doesn't fight ours.
              style={menuProps ? { WebkitTouchCallout: 'none', userSelect: 'none' } : undefined}
            >
              <TableCell className="font-mono text-sm">
                <Link href={`/bookings/${b.id}`} className="hover:underline">
                  {format(new Date(b.startTime), 'HH:mm')}–{format(new Date(b.endTime), 'HH:mm')}
                </Link>
              </TableCell>
              <TableCell>
                <span className="flex items-center gap-1">
                  {b.clientName}
                  {b.isRecurring && <Repeat className="h-3 w-3 text-muted-foreground" />}
                </span>
              </TableCell>
              <TableCell>{b.serviceName}</TableCell>
              <TableCell>{b.stylistName}</TableCell>
              <TableCell>{b.price != null ? formatPrice(b.price) : '—'}</TableCell>
              <TableCell>
                <Badge className={bookingStatusStyle(b.status).badge} variant="secondary">
                  {bookingStatusStyle(b.status).label}
                </Badge>
              </TableCell>
              <TableCell>
                <BookingActions
                  bookingId={b.id}
                  currentStatus={b.status}
                  serviceId={b.serviceId}
                  serviceDuration={b.serviceDuration}
                  stylistId={b.stylistId}
                  startTime={b.startTime}
                />
              </TableCell>
            </TableRow>
          );

          // Past appointments have no inline action menu — give them a
          // right-click context menu instead.
          return isPast ? (
            <PastBookingMenu key={b.id} bookingId={b.id} status={b.status}>
              {(menuProps) => renderRow(menuProps)}
            </PastBookingMenu>
          ) : (
            renderRow()
          );
        })}
      </TableBody>
    </Table>
  );
}
