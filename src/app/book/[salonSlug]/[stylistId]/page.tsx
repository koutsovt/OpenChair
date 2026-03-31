import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { formatPrice, formatDuration } from '@/lib/utils';
import { SlotPicker } from '../_components/SlotPicker';

interface PageProps {
  params: Promise<{ salonSlug: string; stylistId: string }>;
  searchParams: Promise<{ serviceId?: string }>;
}

export default async function StylistSlotPage({ params, searchParams }: PageProps) {
  const { salonSlug, stylistId } = await params;
  const { serviceId } = await searchParams;

  if (!serviceId) {
    notFound();
  }

  const salon = await prisma.salon.findUnique({
    where: { slug: salonSlug, isActive: true },
  });

  if (!salon) {
    notFound();
  }

  const stylist = await prisma.stylist.findFirst({
    where: { id: stylistId, salonId: salon.id, isActive: true },
    include: {
      availability: { where: { isActive: true } },
    },
  });

  if (!stylist) {
    notFound();
  }

  const service = await prisma.service.findFirst({
    where: { id: serviceId, salonId: salon.id, isActive: true },
  });

  if (!service) {
    notFound();
  }

  // Get available days of week for this stylist
  const availableDays = stylist.availability.map((a) => a.dayOfWeek);

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b px-4 py-6">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-bold">{salon.name}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold">Pick a time</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {service.name} with {stylist.name} · {formatDuration(service.duration)} ·{' '}
            {formatPrice(service.price)}
          </p>
        </div>

        <SlotPicker
          salonSlug={salonSlug}
          stylistId={stylistId}
          serviceId={serviceId}
          availableDays={availableDays}
        />
      </main>
    </div>
  );
}
