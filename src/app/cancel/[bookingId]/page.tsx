import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';
import { formatPrice, formatDuration } from '@/lib/utils';
import { CancelFlow } from './_components/CancelFlow';

interface PageProps {
  params: Promise<{ bookingId: string }>;
}

export default async function CancelPage({ params }: PageProps) {
  const { bookingId } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      salon: { select: { name: true, slug: true, phone: true } },
      service: { select: { name: true, duration: true, price: true } },
      stylist: { select: { name: true } },
      client: { select: { name: true, phone: true } },
    },
  });

  if (!booking) {
    notFound();
  }

  const isCancelled = booking.status === 'CANCELLED';
  const isCompleted = booking.status === 'COMPLETED';
  const isPast = booking.startTime < new Date();

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b px-4 py-6">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-bold">{booking.salon.name}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <h2 className="mb-6 text-lg font-semibold">
          {isCancelled
            ? 'Booking already cancelled'
            : isCompleted
              ? 'Booking completed'
              : isPast
                ? 'This booking has already passed'
                : 'Cancel your booking'}
        </h2>

        <div className="mb-8 rounded-lg border p-4">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Service</dt>
              <dd className="font-medium">{booking.service.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Duration</dt>
              <dd className="font-medium">{formatDuration(booking.service.duration)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Price</dt>
              <dd className="font-medium">{formatPrice(booking.service.price)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Stylist</dt>
              <dd className="font-medium">{booking.stylist.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Date</dt>
              <dd className="font-medium">{format(booking.startTime, 'EEEE, MMMM d, yyyy')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Time</dt>
              <dd className="font-medium">{format(booking.startTime, 'h:mm a')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-medium capitalize">{booking.status.toLowerCase()}</dd>
            </div>
          </dl>
        </div>

        {isCancelled ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              This booking was cancelled on{' '}
              {booking.cancelledAt
                ? format(booking.cancelledAt, "MMMM d, yyyy 'at' h:mm a")
                : 'a previous date'}
              .
            </p>
            {booking.cancelReason && (
              <p className="mt-1 text-xs text-muted-foreground">Reason: {booking.cancelReason}</p>
            )}
          </div>
        ) : isCompleted || isPast ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              This booking can no longer be cancelled.
            </p>
            {booking.salon.phone && (
              <p className="mt-2 text-xs text-muted-foreground">
                Need help? Call {booking.salon.name} at {booking.salon.phone}
              </p>
            )}
          </div>
        ) : (
          <CancelFlow
            bookingId={bookingId}
            phone={booking.client?.phone ?? booking.guestPhone ?? ''}
          />
        )}
      </main>
    </div>
  );
}
