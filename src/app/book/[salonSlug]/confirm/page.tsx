import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { formatPrice, formatDuration } from '@/lib/utils';
import { format } from 'date-fns';
import { ConfirmForm } from '../_components/ConfirmForm';

interface PageProps {
  params: Promise<{ salonSlug: string }>;
  searchParams: Promise<{
    serviceId?: string;
    stylistId?: string;
    startTime?: string;
  }>;
}

export default async function ConfirmPage({ params, searchParams }: PageProps) {
  const { salonSlug } = await params;
  const { serviceId, stylistId, startTime } = await searchParams;

  if (!serviceId || !stylistId || !startTime) {
    notFound();
  }

  const salon = await prisma.salon.findFirst({
    where: { slug: salonSlug, isActive: true },
  });

  if (!salon) {
    notFound();
  }

  const service = await prisma.service.findFirst({
    where: { id: serviceId, salonId: salon.id, isActive: true },
  });

  const stylist = await prisma.stylist.findFirst({
    where: { id: stylistId, salonId: salon.id, isActive: true },
  });

  if (!service || !stylist) {
    notFound();
  }

  const startDate = new Date(startTime);

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b px-4 py-6">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-bold">{salon.name}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <h2 className="mb-6 text-lg font-semibold">Confirm your booking</h2>

        <div className="mb-8 rounded-lg border p-4">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Service</dt>
              <dd className="font-medium">{service.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Duration</dt>
              <dd className="font-medium">{formatDuration(service.duration)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Price</dt>
              <dd className="font-medium">{formatPrice(service.price)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Stylist</dt>
              <dd className="font-medium">{stylist.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Date</dt>
              <dd className="font-medium">{format(startDate, 'EEEE, MMMM d, yyyy')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Time</dt>
              <dd className="font-medium">{format(startDate, 'h:mm a')}</dd>
            </div>
          </dl>
        </div>

        <ConfirmForm
          salonSlug={salonSlug}
          serviceId={serviceId}
          stylistId={stylistId}
          startTime={startTime}
          serviceName={service.name}
          stylistName={stylist.name}
          dateFormatted={format(startDate, 'EEEE, MMMM d, yyyy')}
          timeFormatted={format(startDate, 'h:mm a')}
        />
      </main>
    </div>
  );
}
