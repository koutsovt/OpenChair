import { getAuthenticatedSalon } from '@/server/auth';
import { prisma } from '@/lib/prisma';
import { RecurringBookingsList } from './_components/recurring-bookings-list';

export default async function RecurringBookingsPage() {
  const salon = await getAuthenticatedSalon();

  const recurring = await prisma.recurringBooking.findMany({
    where: { salonId: salon.id },
    include: {
      client: { select: { id: true, name: true, phone: true } },
      service: { select: { id: true, name: true, duration: true, price: true } },
      stylist: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const rows = recurring.map((r) => ({
    id: r.id,
    clientName: r.client.name,
    serviceName: r.service.name,
    stylistName: r.stylist.name,
    intervalWeeks: r.intervalWeeks,
    dayOfWeek: r.dayOfWeek,
    preferredTime: r.preferredTime,
    isActive: r.isActive,
    nextRunDate: r.nextRunDate.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Recurring Bookings</h1>
        <p className="text-muted-foreground">
          {rows.length} recurring booking{rows.length !== 1 ? 's' : ''}
        </p>
      </div>
      <RecurringBookingsList bookings={rows} />
    </div>
  );
}
