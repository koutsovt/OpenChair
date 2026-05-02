import { format, startOfDay, endOfDay } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { getAuthenticatedSalon } from '@/server/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { BlurText } from '@/components/ui/blur-text';
import { DatePickerNav } from './_components/date-picker-nav';
import { ViewToggle } from './_components/view-toggle';
import { BookingList } from './_components/booking-list';
import { BookingTimeline } from './_components/booking-timeline';
import { NewBookingDialog } from './_components/new-booking-dialog';

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>;
}) {
  const params = await searchParams;
  const salon = await getAuthenticatedSalon();

  const dateStr = params.date ?? format(new Date(), 'yyyy-MM-dd');
  const targetDate = new Date(dateStr);
  const view = (params.view === 'timeline' ? 'timeline' : 'list') as 'list' | 'timeline';

  // Fetch day's bookings
  const bookings = await prisma.booking.findMany({
    where: {
      salonId: salon.id,
      startTime: { gte: startOfDay(targetDate) },
      endTime: { lte: endOfDay(targetDate) },
    },
    include: { client: true, stylist: true, service: true },
    orderBy: { startTime: 'asc' },
  });

  // Fetch services + stylists for the booking form
  const services = await prisma.service.findMany({
    where: { salonId: salon.id, isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  const stylistServices = await prisma.stylistService.findMany({
    where: {
      stylist: { salonId: salon.id, isActive: true },
      serviceId: { in: services.map((s) => s.id) },
    },
    include: { stylist: { select: { id: true, name: true } } },
  });

  const stylistsByService: Record<string, { id: string; name: string }[]> = {};
  for (const ss of stylistServices) {
    if (!stylistsByService[ss.serviceId]) {
      stylistsByService[ss.serviceId] = [];
    }
    stylistsByService[ss.serviceId].push({ id: ss.stylist.id, name: ss.stylist.name });
  }

  // All active stylists for timeline (include availability)
  const dayOfWeek = targetDate.getDay(); // 0=Sunday..6=Saturday
  const stylists = await prisma.stylist.findMany({
    where: { salonId: salon.id, isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name: true,
      availability: {
        where: { dayOfWeek, isActive: true },
        select: { startTime: true, endTime: true },
      },
    },
  });

  const bookingRows = bookings.map((b) => ({
    id: b.id,
    startTime: b.startTime.toISOString(),
    endTime: b.endTime.toISOString(),
    status: b.status,
    clientName: b.client?.name ?? b.guestName ?? 'Walk-in',
    serviceName: b.service.name,
    stylistName: b.stylist.name,
    stylistId: b.stylistId,
    serviceId: b.serviceId,
    serviceDuration: b.service.duration,
    price: b.price,
    isRecurring: b.recurringBookingId != null,
  }));

  const serviceOptions = services.map((s) => ({
    id: s.id,
    name: s.name,
    price: s.price,
    duration: s.duration,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <BlurText text="Bookings" className="text-2xl font-bold tracking-tight" />
          <p className="text-muted-foreground">
            {bookingRows.length} booking{bookingRows.length !== 1 ? 's' : ''} on{' '}
            {format(targetDate, 'd MMM yyyy')}
          </p>
        </div>
        <NewBookingDialog services={serviceOptions} stylistsByService={stylistsByService} />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <DatePickerNav currentDate={dateStr} />
        <ViewToggle currentView={view} />
      </div>

      {bookingRows.length === 0 && view === 'list' ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CalendarDays className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-medium">No bookings</p>
            <p className="text-sm text-muted-foreground">No bookings scheduled for this date.</p>
          </CardContent>
        </Card>
      ) : view === 'list' ? (
        <BookingList bookings={bookingRows} />
      ) : (
        <BookingTimeline bookings={bookingRows} stylists={stylists} date={dateStr} />
      )}
    </div>
  );
}
