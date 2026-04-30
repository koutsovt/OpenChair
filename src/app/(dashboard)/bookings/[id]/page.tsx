import { notFound } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { getAuthenticatedSalon } from '@/server/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from '@/lib/constants';
import { formatPrice, formatDuration } from '@/lib/utils';
import { BookingDetailActions } from './_components/booking-detail-actions';

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const salon = await getAuthenticatedSalon();

  const booking = await prisma.booking.findFirst({
    where: { id, salonId: salon.id },
    include: { client: true, stylist: true, service: true },
  });

  if (!booking) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/bookings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Booking Details</h1>
        </div>
        <Badge className={BOOKING_STATUS_COLORS[booking.status]} variant="secondary">
          {BOOKING_STATUS_LABELS[booking.status]}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appointment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Date" value={format(booking.startTime, 'EEEE, d MMMM yyyy')} />
          <Row
            label="Time"
            value={`${format(booking.startTime, 'HH:mm')} – ${format(booking.endTime, 'HH:mm')}`}
          />
          <Row label="Duration" value={formatDuration(booking.service.duration)} />
          <Separator />
          <Row label="Service" value={booking.service.name} />
          <Row label="Price" value={booking.price != null ? formatPrice(booking.price) : '—'} />
          <Row label="Stylist" value={booking.stylist.name} />
          <Separator />
          <Row label="Client" value={booking.client?.name ?? booking.guestName ?? 'Walk-in'} />
          {booking.client?.phone && <Row label="Phone" value={booking.client.phone} />}
          {booking.guestPhone && <Row label="Guest Phone" value={booking.guestPhone} />}
          {booking.client?.email && <Row label="Email" value={booking.client.email} />}
          {booking.notes && (
            <>
              <Separator />
              <Row label="Notes" value={booking.notes} />
            </>
          )}
          {booking.cancelledAt && (
            <>
              <Separator />
              <Row label="Cancelled At" value={format(booking.cancelledAt, 'd MMM yyyy, HH:mm')} />
              {booking.cancelReason && <Row label="Reason" value={booking.cancelReason} />}
            </>
          )}
        </CardContent>
      </Card>

      <BookingDetailActions bookingId={booking.id} currentStatus={booking.status} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
